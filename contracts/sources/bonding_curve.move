/// Minitia.fun - bonding_curve
/// ---------------------------------------------------------------------------
/// Per-token linear bonding curve with per-holder balance tracking AND real
/// umin custody. Every buy() moves umin from trader -> vault, every sell()
/// and creator-claim entry (claim_fees / claim_reserve) pays out from
/// vault -> receiver via primary_fungible_store.
///
/// Vault = named Object owned by the module admin, accessed via a stored
/// ExtendRef so the module can mint a signer on demand without requiring the
/// admin to re-sign.
///
/// Entry functions for creator capital flow post-graduation:
///   - claim_fees     : withdraw accumulated 0.5% trading fees (always)
///   - claim_reserve  : withdraw the ENTIRE locked reserve, one-shot
///                      (only after graduation; intended for DEX seeding /
///                      sovereign-chain airdrop / appchain treasury).
module minitia_fun::bonding_curve {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::vector;

    use initia_std::coin;
    use initia_std::event;
    use initia_std::fungible_asset::Metadata;
    use initia_std::math128;
    use initia_std::object::{Self, ExtendRef, Object};
    use initia_std::primary_fungible_store;
    use initia_std::table::{Self, Table};

    // ---- Errors ------------------------------------------------------------
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_POOL_EXISTS: u64 = 3;
    const E_POOL_MISSING: u64 = 4;
    const E_AMOUNT_ZERO: u64 = 5;
    const E_SLIPPAGE: u64 = 6;
    const E_GRADUATED: u64 = 7;
    const E_INSUFFICIENT_BALANCE: u64 = 8;
    const E_NOT_CREATOR: u64 = 9;
    const E_NO_FEES: u64 = 10;
    const E_CUSTODY_NOT_INITIALIZED: u64 = 11;
    const E_AMOUNT_TOO_LARGE: u64 = 12;
    /// Ticker not registered via token_factory::launch. Pools can only open
    /// for officially launched tokens.
    const E_TICKER_NOT_LAUNCHED: u64 = 13;
    /// Caller is not the wallet that ran token_factory::launch for this
    /// ticker. Prevents outside wallets from silently capturing pool-creator
    /// rights (trading fees, appchain promotion).
    const E_NOT_LAUNCHER: u64 = 14;
    /// Buy would push token_supply past max_supply. Client should quote
    /// against remaining cap (max_supply - token_supply) and adjust order.
    const E_SUPPLY_CAP: u64 = 15;
    /// Invalid max_supply supplied at create_pool (must be > 0).
    const E_INVALID_SUPPLY: u64 = 16;
    /// claim_reserve called on a pool that hasn't reached graduation yet.
    const E_NOT_GRADUATED: u64 = 17;
    /// claim_reserve called but the reserve vault for this ticker is empty
    /// (first claim already drained it, or pool graduated with zero reserve).
    const E_NO_RESERVE: u64 = 18;

    // ---- Seeds -------------------------------------------------------------
    const VAULT_SEED: vector<u8> = b"minitia_fun::bonding_curve::vault::v1";

    // ---- Constants ---------------------------------------------------------
    /// 0.5 percent fee retained to the appchain.
    const FEE_BPS: u64 = 50;
    const BPS_DENOM: u64 = 10_000;
    /// Graduation threshold. Hackathon demo value: 10 MIN so testers can
    /// trigger graduation with a handful of buys. Production should bump
    /// back to ~5_000 INIT (5_000_000_000 umin).
    const GRADUATION_INIT_RESERVE: u128 = 10_000_000;

    // ---- State -------------------------------------------------------------

    /// Global registry. One Pool per ticker; per-holder balances live in a
    /// flat map keyed by (holder, ticker).
    struct Registry has key {
        admin: address,
        pools: Table<String, Pool>,
        balances: Table<HolderKey, u128>,
    }

    struct HolderKey has copy, drop, store {
        holder: address,
        ticker: String,
    }

    struct Pool has store {
        ticker: String,
        creator: address,
        init_reserve: u128,
        token_supply: u128,
        /// Hard cap on token_supply. Immutable after create_pool. Any buy
        /// that would push token_supply past this aborts with E_SUPPLY_CAP,
        /// and graduation triggers early when token_supply reaches it
        /// (dual condition with GRADUATION_INIT_RESERVE).
        max_supply: u128,
        // Linear curve: price(s) = base_price + (s * slope) / SLOPE_DEN
        base_price: u128,
        slope: u128,
        fee_accumulated: u128,
        trade_count: u64,
        graduated: bool,
    }

    // ---- Events ------------------------------------------------------------
    #[event]
    struct PoolCreated has drop, store {
        ticker: String,
        creator: address,
        base_price: u128,
        slope: u128,
        max_supply: u128,
    }

    #[event]
    struct Trade has drop, store {
        ticker: String,
        trader: address,
        side: u8, // 0 = buy, 1 = sell
        init_amount: u128,
        token_amount: u128,
        new_supply: u128,
        new_reserve: u128,
        new_holder_balance: u128,
        fee: u128,
    }

    #[event]
    struct Graduated has drop, store {
        ticker: String,
        final_reserve: u128,
        final_supply: u128,
    }

    #[event]
    struct FeesClaimed has drop, store {
        ticker: String,
        creator: address,
        amount: u128,
        new_reserve: u128,
    }

    #[event]
    struct ReserveClaimed has drop, store {
        ticker: String,
        creator: address,
        amount: u128,
        final_supply: u128,
    }

    /// Stored at the admin address. `extend_ref` lets the module mint the
    /// vault's signer on demand to pay out umin on sells / fee claims.
    struct CustodyCap has key {
        extend_ref: ExtendRef,
        vault_addr: address,
    }

    // ---- Init --------------------------------------------------------------

    public entry fun initialize(owner: &signer) {
        let addr = signer::address_of(owner);
        assert!(!exists<Registry>(addr), error::already_exists(E_ALREADY_INITIALIZED));
        move_to(owner, Registry {
            admin: addr,
            pools: table::new<String, Pool>(),
            balances: table::new<HolderKey, u128>(),
        });
    }

    /// One-shot bootstrap for real umin custody. Idempotent: safe to call by
    /// whoever owns the Registry exactly once. Creates a named Object whose
    /// primary fungible store of umin will be the pool's treasury.
    public entry fun initialize_custody(owner: &signer) {
        let addr = signer::address_of(owner);
        assert!(exists<Registry>(addr), error::not_found(E_NOT_INITIALIZED));
        assert!(!exists<CustodyCap>(addr), error::already_exists(E_ALREADY_INITIALIZED));

        let constructor_ref = object::create_named_object(owner, VAULT_SEED);
        let vault_addr = object::address_from_constructor_ref(&constructor_ref);
        let extend_ref = object::generate_extend_ref(&constructor_ref);

        move_to(owner, CustodyCap { extend_ref, vault_addr });
    }

    // ---- Entry: pool lifecycle --------------------------------------------

    /// Create a pool for a ticker. Gated to the token's original launcher
    /// and now requires a fixed `max_supply` (hard cap on circulating
    /// tokens). Three invariants enforced:
    ///   1. Ticker MUST already exist in token_factory::Registry
    ///      (i.e. someone ran token_factory::launch).
    ///   2. Caller MUST be the launcher recorded there.
    ///   3. max_supply > 0.
    /// Combined with the Launchpad bundling `launch + create_pool` in a
    /// single tx, this guarantees `pool.creator == token_factory.creator`
    /// for all new pools and gives every token a stable supply ceiling
    /// for market-cap accounting and scarcity narrative.
    public entry fun create_pool(
        creator: &signer,
        registry_addr: address,
        ticker: String,
        base_price: u128,
        slope: u128,
        max_supply: u128,
    ) acquires Registry {
        assert!(exists<Registry>(registry_addr), error::not_found(E_NOT_INITIALIZED));
        assert!(max_supply > 0, error::invalid_argument(E_INVALID_SUPPLY));

        let creator_addr = signer::address_of(creator);

        // Cross-module gate: caller must own the ticker in token_factory.
        // Both modules share the same registry_addr (module owner's account),
        // so no extra parameter is required on the entry function and
        // existing client callers remain compatible.
        assert!(
            minitia_fun::token_factory::ticker_registered(registry_addr, ticker),
            error::not_found(E_TICKER_NOT_LAUNCHED)
        );
        let launcher = minitia_fun::token_factory::launcher_of(registry_addr, ticker);
        assert!(launcher == creator_addr, error::permission_denied(E_NOT_LAUNCHER));

        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(!table::contains(&registry.pools, ticker), error::already_exists(E_POOL_EXISTS));

        let pool = Pool {
            ticker,
            creator: creator_addr,
            init_reserve: 0,
            token_supply: 0,
            max_supply,
            base_price,
            slope,
            fee_accumulated: 0,
            trade_count: 0,
            graduated: false,
        };
        table::add(&mut registry.pools, ticker, pool);

        event::emit(PoolCreated { ticker, creator: creator_addr, base_price, slope, max_supply });
    }

    // ---- Entry: trading ---------------------------------------------------

    /// Buy tokens by depositing real umin from the trader's wallet into the
    /// pool vault. Phase 2: actual coin custody, no synthetic reserve.
    public entry fun buy(
        trader: &signer,
        registry_addr: address,
        ticker: String,
        init_amount: u64,
        min_tokens_out: u64,
    ) acquires Registry, CustodyCap {
        assert!(init_amount > 0, error::invalid_argument(E_AMOUNT_ZERO));
        assert!(exists<CustodyCap>(registry_addr), error::not_found(E_CUSTODY_NOT_INITIALIZED));
        let trader_addr = signer::address_of(trader);

        // Pull umin from trader -> vault BEFORE mutating pool state.
        let vault_addr = borrow_global<CustodyCap>(registry_addr).vault_addr;
        primary_fungible_store::transfer(trader, umin_metadata(), vault_addr, init_amount);

        let registry = borrow_global_mut<Registry>(registry_addr);
        let pool = table::borrow_mut(&mut registry.pools, ticker);
        assert!(!pool.graduated, error::invalid_state(E_GRADUATED));

        let init_in = (init_amount as u128);
        let fee = init_in * (FEE_BPS as u128) / (BPS_DENOM as u128);
        let net = init_in - fee;

        // Integral linear curve: solve for x where
        //     net = base*x + slope*x*(2*s0 + x)/(2*1_000_000)
        // => slope*x^2 + 2*spot_scaled*x - 2*1_000_000*net = 0
        // where spot_scaled = base*1_000_000 + slope*s0 (integer form of current price*1e6)
        //
        //     x = (sqrt(spot_scaled^2 + 2*slope*1_000_000*net) - spot_scaled) / slope
        //
        // slope == 0: degenerate flat curve, x = net*1_000_000/base.
        let tokens_out = tokens_out_for_buy(pool, net);
        assert!(tokens_out >= (min_tokens_out as u128), error::invalid_state(E_SLIPPAGE));
        // Hard cap on circulating supply. Client should quote against
        // (max_supply - token_supply) and sized the buy accordingly; when
        // very close to the cap, this abort tells the client to shrink.
        assert!(
            pool.token_supply + tokens_out <= pool.max_supply,
            error::invalid_state(E_SUPPLY_CAP)
        );

        pool.init_reserve = pool.init_reserve + net;
        pool.token_supply = pool.token_supply + tokens_out;
        pool.fee_accumulated = pool.fee_accumulated + fee;
        pool.trade_count = pool.trade_count + 1;

        let key = HolderKey { holder: trader_addr, ticker };
        let prev = if (table::contains(&registry.balances, key)) {
            *table::borrow(&registry.balances, key)
        } else { 0u128 };
        let new_balance = prev + tokens_out;
        if (table::contains(&registry.balances, key)) {
            *table::borrow_mut(&mut registry.balances, key) = new_balance;
        } else {
            table::add(&mut registry.balances, key, new_balance);
        };

        event::emit(Trade {
            ticker,
            trader: trader_addr,
            side: 0,
            init_amount: init_in,
            token_amount: tokens_out,
            new_supply: pool.token_supply,
            new_reserve: pool.init_reserve,
            new_holder_balance: new_balance,
            fee,
        });

        // Dual graduation trigger: reserve threshold OR supply cap reached
        // (whichever fires first). Cap-hit is a safety net for pools whose
        // max_supply is tight enough that the curve can never reach the
        // reserve threshold before selling out.
        if (
            pool.init_reserve >= GRADUATION_INIT_RESERVE
                || pool.token_supply >= pool.max_supply
        ) {
            pool.graduated = true;
            event::emit(Graduated {
                ticker,
                final_reserve: pool.init_reserve,
                final_supply: pool.token_supply,
            });
        };
    }

    /// Sell tokens back to the curve, paying out real umin from the vault.
    public entry fun sell(
        trader: &signer,
        registry_addr: address,
        ticker: String,
        token_amount: u64,
        min_init_out: u64,
    ) acquires Registry, CustodyCap {
        assert!(token_amount > 0, error::invalid_argument(E_AMOUNT_ZERO));
        assert!(exists<CustodyCap>(registry_addr), error::not_found(E_CUSTODY_NOT_INITIALIZED));
        let trader_addr = signer::address_of(trader);
        let registry = borrow_global_mut<Registry>(registry_addr);
        let pool = table::borrow_mut(&mut registry.pools, ticker);
        assert!(!pool.graduated, error::invalid_state(E_GRADUATED));

        let key = HolderKey { holder: trader_addr, ticker };
        assert!(table::contains(&registry.balances, key), error::invalid_state(E_INSUFFICIENT_BALANCE));
        let prev = *table::borrow(&registry.balances, key);
        let burn = (token_amount as u128);
        assert!(burn <= prev, error::invalid_state(E_INSUFFICIENT_BALANCE));

        // Integral linear curve (inverse of buy):
        //     gross = (2*spot_scaled*burn - slope*burn^2) / (2*1_000_000)
        // Clamp to pool.init_reserve so we never overdraw. Protects pools
        // whose accounting inflated under Phase 1 synthetic math.
        let gross = gross_for_sell(pool, burn);
        if (gross > pool.init_reserve) { gross = pool.init_reserve; };
        let fee = gross * (FEE_BPS as u128) / (BPS_DENOM as u128);
        let net = if (gross > fee) { gross - fee } else { 0 };
        assert!(net >= (min_init_out as u128), error::invalid_state(E_SLIPPAGE));
        assert!(pool.init_reserve >= net, error::invalid_state(E_INSUFFICIENT_BALANCE));
        // Guard u128 -> u64 cast for the payout. Net fits in u64 for any
        // realistic pool (u64 max ~ 1.8e19 umin >> any plausible reserve).
        assert!(net <= (0xFFFFFFFFFFFFFFFFu128), error::invalid_state(E_AMOUNT_TOO_LARGE));

        let new_balance = prev - burn;
        *table::borrow_mut(&mut registry.balances, key) = new_balance;

        pool.init_reserve = pool.init_reserve - net;
        pool.token_supply = pool.token_supply - burn;
        pool.fee_accumulated = pool.fee_accumulated + fee;
        pool.trade_count = pool.trade_count + 1;

        // Drop borrows before loading the custody cap to avoid double-borrow.
        if (net > 0) {
            let cap = borrow_global<CustodyCap>(registry_addr);
            let vault_sig = object::generate_signer_for_extending(&cap.extend_ref);
            primary_fungible_store::transfer(
                &vault_sig,
                umin_metadata(),
                trader_addr,
                (net as u64),
            );
        };

        event::emit(Trade {
            ticker,
            trader: trader_addr,
            side: 1,
            init_amount: net,
            token_amount: burn,
            new_supply: pool.token_supply,
            new_reserve: pool.init_reserve,
            new_holder_balance: new_balance,
            fee,
        });
    }

    // ---- Entry: creator rewards -------------------------------------------

    /// Creator claims accumulated trading fees from their pool, paid out in
    /// real umin from the vault.
    public entry fun claim_fees(
        creator: &signer,
        registry_addr: address,
        ticker: String,
    ) acquires Registry, CustodyCap {
        assert!(exists<Registry>(registry_addr), error::not_found(E_NOT_INITIALIZED));
        assert!(exists<CustodyCap>(registry_addr), error::not_found(E_CUSTODY_NOT_INITIALIZED));
        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(table::contains(&registry.pools, ticker), error::not_found(E_POOL_MISSING));
        let pool = table::borrow_mut(&mut registry.pools, ticker);

        let creator_addr = signer::address_of(creator);
        assert!(pool.creator == creator_addr, error::permission_denied(E_NOT_CREATOR));

        let amount = pool.fee_accumulated;
        assert!(amount > 0, error::invalid_state(E_NO_FEES));
        assert!(amount <= (0xFFFFFFFFFFFFFFFFu128), error::invalid_state(E_AMOUNT_TOO_LARGE));

        pool.fee_accumulated = 0;
        let new_reserve_snapshot = pool.init_reserve;

        let cap = borrow_global<CustodyCap>(registry_addr);
        let vault_sig = object::generate_signer_for_extending(&cap.extend_ref);
        primary_fungible_store::transfer(
            &vault_sig,
            umin_metadata(),
            creator_addr,
            (amount as u64),
        );

        event::emit(FeesClaimed {
            ticker,
            creator: creator_addr,
            amount,
            new_reserve: new_reserve_snapshot,
        });
    }

    /// Creator claims the ENTIRE reserve of a graduated pool out of the
    /// vault, one-shot. Intended for bootstrapping liquidity on the
    /// creator's destination: seed an InitiaDEX pool, fund the sovereign
    /// appchain treasury, or airdrop to holders on the new chain.
    ///
    /// Guardrails:
    ///   - Only the pool creator can call.
    ///   - Pool must be graduated (`pool.graduated == true`). The whole
    ///     point is that buy/sell are already frozen.
    ///   - Reserve must be non-zero. Subsequent calls after the first
    ///     successful claim abort with E_NO_RESERVE (idempotent failure
    ///     mode -- no double-payout).
    ///
    /// Fees (`fee_accumulated`) are untouched; creator still needs to call
    /// `claim_fees` separately to withdraw accrued trading fees.
    ///
    /// Note: this removes the economic backing of outstanding $TICKER
    /// balances in this pool. Holders' tokens continue to exist as table
    /// entries but no longer redeemable on this pool. It is the creator's
    /// responsibility to airdrop / seed a DEX / open a new curve on their
    /// sovereign chain so holders retain value.
    public entry fun claim_reserve(
        creator: &signer,
        registry_addr: address,
        ticker: String,
    ) acquires Registry, CustodyCap {
        assert!(exists<Registry>(registry_addr), error::not_found(E_NOT_INITIALIZED));
        assert!(exists<CustodyCap>(registry_addr), error::not_found(E_CUSTODY_NOT_INITIALIZED));
        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(table::contains(&registry.pools, ticker), error::not_found(E_POOL_MISSING));
        let pool = table::borrow_mut(&mut registry.pools, ticker);

        let creator_addr = signer::address_of(creator);
        assert!(pool.creator == creator_addr, error::permission_denied(E_NOT_CREATOR));
        assert!(pool.graduated, error::invalid_state(E_NOT_GRADUATED));

        let amount = pool.init_reserve;
        assert!(amount > 0, error::invalid_state(E_NO_RESERVE));
        assert!(amount <= (0xFFFFFFFFFFFFFFFFu128), error::invalid_state(E_AMOUNT_TOO_LARGE));

        pool.init_reserve = 0;
        let final_supply_snapshot = pool.token_supply;

        let cap = borrow_global<CustodyCap>(registry_addr);
        let vault_sig = object::generate_signer_for_extending(&cap.extend_ref);
        primary_fungible_store::transfer(
            &vault_sig,
            umin_metadata(),
            creator_addr,
            (amount as u64),
        );

        event::emit(ReserveClaimed {
            ticker,
            creator: creator_addr,
            amount,
            final_supply: final_supply_snapshot,
        });
    }

    // ---- View functions ----------------------------------------------------

    #[view]
    public fun pool_exists(registry_addr: address, ticker: String): bool acquires Registry {
        if (!exists<Registry>(registry_addr)) { return false };
        table::contains(&borrow_global<Registry>(registry_addr).pools, ticker)
    }

    /// Returns (init_reserve, token_supply, base_price, slope, fee_accumulated,
    /// trade_count, graduated_as_u64, max_supply). Index 7 is the v2 supply
    /// cap; older callers reading indices 0..6 are unaffected.
    #[view]
    public fun pool_state(registry_addr: address, ticker: String): vector<u128> acquires Registry {
        let registry = borrow_global<Registry>(registry_addr);
        let pool = table::borrow(&registry.pools, ticker);
        let result = vector::empty<u128>();
        vector::push_back(&mut result, pool.init_reserve);
        vector::push_back(&mut result, pool.token_supply);
        vector::push_back(&mut result, pool.base_price);
        vector::push_back(&mut result, pool.slope);
        vector::push_back(&mut result, pool.fee_accumulated);
        vector::push_back(&mut result, (pool.trade_count as u128));
        vector::push_back(&mut result, if (pool.graduated) { 1u128 } else { 0u128 });
        vector::push_back(&mut result, pool.max_supply);
        result
    }

    #[view]
    public fun current_price(registry_addr: address, ticker: String): u128 acquires Registry {
        let registry = borrow_global<Registry>(registry_addr);
        let pool = table::borrow(&registry.pools, ticker);
        current_price_internal(pool)
    }

    #[view]
    public fun balance_of(registry_addr: address, holder: address, ticker: String): u128 acquires Registry {
        let registry = borrow_global<Registry>(registry_addr);
        let key = HolderKey { holder, ticker };
        if (table::contains(&registry.balances, key)) {
            *table::borrow(&registry.balances, key)
        } else { 0u128 }
    }

    #[view]
    public fun creator_of(registry_addr: address, ticker: String): address acquires Registry {
        let registry = borrow_global<Registry>(registry_addr);
        let pool = table::borrow(&registry.pools, ticker);
        pool.creator
    }

    #[view]
    public fun unclaimed_fees(registry_addr: address, ticker: String): u128 acquires Registry {
        let registry = borrow_global<Registry>(registry_addr);
        let pool = table::borrow(&registry.pools, ticker);
        pool.fee_accumulated
    }

    #[view]
    public fun custody_initialized(registry_addr: address): bool {
        exists<CustodyCap>(registry_addr)
    }

    #[view]
    public fun vault_address(registry_addr: address): address acquires CustodyCap {
        borrow_global<CustodyCap>(registry_addr).vault_addr
    }

    // ---- Internal ----------------------------------------------------------

    fun current_price_internal(pool: &Pool): u128 {
        // price (micro-INIT per token) = base + supply * slope / 1_000_000
        pool.base_price + (pool.token_supply * pool.slope) / 1_000_000
    }

    /// Returns the fungible-asset Metadata object for the rollup's native gas
    /// denom (umin). Bank denoms are registered under @initia_std as the
    /// issuer, so the metadata lives at a deterministic address.
    fun umin_metadata(): Object<Metadata> {
        coin::denom_to_metadata(string::utf8(b"umin"))
    }

    /// Integral linear curve: how many tokens a buyer receives for depositing
    /// `net` umin (after fee). Returns the positive root of the quadratic
    /// derived from reserve = base*x + slope*x*(2*s0 + x)/(2*10^6).
    fun tokens_out_for_buy(pool: &Pool, net: u128): u128 {
        let slope = pool.slope;
        let base = pool.base_price;
        let s0 = pool.token_supply;
        if (slope == 0) {
            if (base == 0) { return net };
            return net * 1_000_000 / base
        };
        // spot_scaled = base*1_000_000 + slope*s0. Equal to spot_price * 10^6.
        let spot_scaled = base * 1_000_000 + slope * s0;
        // disc = spot_scaled^2 + 2 * slope * 1_000_000 * net
        let disc = spot_scaled * spot_scaled + 2 * slope * 1_000_000 * net;
        let root = math128::sqrt(disc);
        if (root <= spot_scaled) { return 0 };
        (root - spot_scaled) / slope
    }

    /// Integral linear curve: gross umin owed when burning `burn` tokens from
    /// current supply. Caller must clamp to pool.init_reserve when applying.
    fun gross_for_sell(pool: &Pool, burn: u128): u128 {
        let slope = pool.slope;
        let base = pool.base_price;
        let s0 = pool.token_supply;
        if (burn == 0) { return 0 };
        if (slope == 0) {
            return burn * base / 1_000_000
        };
        // spot_scaled = base*10^6 + slope*s0
        // gross = (2*spot_scaled*burn - slope*burn^2) / (2*10^6)
        let spot_scaled = base * 1_000_000 + slope * s0;
        let a = 2 * spot_scaled * burn;
        let b = slope * burn * burn;
        if (b >= a) { return 0 };
        (a - b) / 2_000_000
    }
}
