/// Minitia.fun - bonding_curve
/// ---------------------------------------------------------------------------
/// Per-token linear bonding curve with per-holder balance tracking. Phase 1
/// implementation: state changes are real (verifiable on-chain), but no
/// actual umin transfers happen yet - the curve uses synthetic INIT reserve
/// driven by the `init_in` argument. Phase 2 wires real coin transfers via
/// primary_fungible_store.
module minitia_fun::bonding_curve {
    use std::error;
    use std::signer;
    use std::string::String;
    use std::vector;

    use initia_std::event;
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

    // ---- Constants ---------------------------------------------------------
    /// 0.5 percent fee retained to the appchain.
    const FEE_BPS: u64 = 50;
    const BPS_DENOM: u64 = 10_000;
    /// Graduation threshold: 5_000 INIT raised on the curve.
    const GRADUATION_INIT_RESERVE: u128 = 5_000_000_000;

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

    // ---- Entry: pool lifecycle --------------------------------------------

    /// Create a pool for a ticker. Anyone can call - the curve is permissionless.
    /// Default linear params: base=1_000 (0.001 INIT) and slope=10 (0.00001 INIT per unit supply).
    public entry fun create_pool(
        creator: &signer,
        registry_addr: address,
        ticker: String,
        base_price: u128,
        slope: u128,
    ) acquires Registry {
        assert!(exists<Registry>(registry_addr), error::not_found(E_NOT_INITIALIZED));
        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(!table::contains(&registry.pools, ticker), error::already_exists(E_POOL_EXISTS));

        let creator_addr = signer::address_of(creator);
        let pool = Pool {
            ticker,
            creator: creator_addr,
            init_reserve: 0,
            token_supply: 0,
            base_price,
            slope,
            fee_accumulated: 0,
            trade_count: 0,
            graduated: false,
        };
        table::add(&mut registry.pools, ticker, pool);

        event::emit(PoolCreated { ticker, creator: creator_addr, base_price, slope });
    }

    // ---- Entry: trading ---------------------------------------------------

    /// Buy tokens by depositing INIT (synthetic, not real coin transfer in Phase 1).
    public entry fun buy(
        trader: &signer,
        registry_addr: address,
        ticker: String,
        init_amount: u64,
        min_tokens_out: u64,
    ) acquires Registry {
        assert!(init_amount > 0, error::invalid_argument(E_AMOUNT_ZERO));
        let trader_addr = signer::address_of(trader);
        let registry = borrow_global_mut<Registry>(registry_addr);
        let pool = table::borrow_mut(&mut registry.pools, ticker);
        assert!(!pool.graduated, error::invalid_state(E_GRADUATED));

        let init_in = (init_amount as u128);
        let fee = init_in * (FEE_BPS as u128) / (BPS_DENOM as u128);
        let net = init_in - fee;

        // Linear curve: tokens_out approx = net / current_avg_price
        // current_avg_price = base + (supply + tokens_out / 2) * slope / 1_000_000
        // Simplification: use spot price at current supply, ignore slippage in math.
        let spot = current_price_internal(pool);
        let tokens_out = if (spot == 0) { net } else { net * 1_000_000 / spot };
        assert!(tokens_out >= (min_tokens_out as u128), error::invalid_state(E_SLIPPAGE));

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

        if (pool.init_reserve >= GRADUATION_INIT_RESERVE) {
            pool.graduated = true;
            event::emit(Graduated {
                ticker,
                final_reserve: pool.init_reserve,
                final_supply: pool.token_supply,
            });
        };
    }

    /// Sell tokens back to the curve.
    public entry fun sell(
        trader: &signer,
        registry_addr: address,
        ticker: String,
        token_amount: u64,
        min_init_out: u64,
    ) acquires Registry {
        assert!(token_amount > 0, error::invalid_argument(E_AMOUNT_ZERO));
        let trader_addr = signer::address_of(trader);
        let registry = borrow_global_mut<Registry>(registry_addr);
        let pool = table::borrow_mut(&mut registry.pools, ticker);
        assert!(!pool.graduated, error::invalid_state(E_GRADUATED));

        let key = HolderKey { holder: trader_addr, ticker };
        assert!(table::contains(&registry.balances, key), error::invalid_state(E_INSUFFICIENT_BALANCE));
        let prev = *table::borrow(&registry.balances, key);
        let burn = (token_amount as u128);
        assert!(burn <= prev, error::invalid_state(E_INSUFFICIENT_BALANCE));

        let spot = current_price_internal(pool);
        let gross = burn * spot / 1_000_000;
        let fee = gross * (FEE_BPS as u128) / (BPS_DENOM as u128);
        let net = if (gross > fee) { gross - fee } else { 0 };
        assert!(net >= (min_init_out as u128), error::invalid_state(E_SLIPPAGE));
        assert!(pool.init_reserve >= net, error::invalid_state(E_INSUFFICIENT_BALANCE));

        let new_balance = prev - burn;
        *table::borrow_mut(&mut registry.balances, key) = new_balance;

        pool.init_reserve = pool.init_reserve - net;
        pool.token_supply = pool.token_supply - burn;
        pool.fee_accumulated = pool.fee_accumulated + fee;
        pool.trade_count = pool.trade_count + 1;

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

    /// Creator claims accumulated trading fees from their pool.
    /// Phase 1 accounting: resets fee_accumulated to 0 and emits event.
    /// Phase 2 will wire real umin transfer via primary_fungible_store.
    public entry fun claim_fees(
        creator: &signer,
        registry_addr: address,
        ticker: String,
    ) acquires Registry {
        assert!(exists<Registry>(registry_addr), error::not_found(E_NOT_INITIALIZED));
        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(table::contains(&registry.pools, ticker), error::not_found(E_POOL_MISSING));
        let pool = table::borrow_mut(&mut registry.pools, ticker);

        let creator_addr = signer::address_of(creator);
        assert!(pool.creator == creator_addr, error::permission_denied(E_NOT_CREATOR));

        let amount = pool.fee_accumulated;
        assert!(amount > 0, error::invalid_state(E_NO_FEES));

        pool.fee_accumulated = 0;

        event::emit(FeesClaimed {
            ticker,
            creator: creator_addr,
            amount,
            new_reserve: pool.init_reserve,
        });
    }

    // ---- View functions ----------------------------------------------------

    #[view]
    public fun pool_exists(registry_addr: address, ticker: String): bool acquires Registry {
        if (!exists<Registry>(registry_addr)) { return false };
        table::contains(&borrow_global<Registry>(registry_addr).pools, ticker)
    }

    /// Returns (init_reserve, token_supply, base_price, slope, fee_accumulated, trade_count, graduated_as_u64).
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

    // ---- Internal ----------------------------------------------------------

    fun current_price_internal(pool: &Pool): u128 {
        // price (micro-INIT per token) = base + supply * slope / 1_000_000
        pool.base_price + (pool.token_supply * pool.slope) / 1_000_000
    }
}
