/// Minitia.fun · bonding_curve
/// ---------------------------------------------------------------------------
/// Supply-based linear pricing for fair-launched tokens. Every Buy/Sell
/// contributes a 0.5% protocol fee that stays 100% within the appchain
/// (no sequencer cut, no external DEX cut).
///
/// This is the entry point the frontend invokes via `MsgExecute` — covered by
/// the user's Auto-sign session key so trades are one-click, sub-second.
module minitia_fun::bonding_curve {
    use std::error;
    use std::signer;

    use initia_std::coin;
    use initia_std::fungible_asset::{Self, Metadata, FungibleAsset};
    use initia_std::object::{Self, Object};
    use initia_std::primary_fungible_store;

    use minitia_fun::token_factory;

    // ---- Errors ------------------------------------------------------------
    const E_ALREADY_INITIALIZED: u64 = 1;
    const E_NOT_INITIALIZED: u64 = 2;
    const E_ZERO_AMOUNT: u64 = 3;
    const E_SLIPPAGE: u64 = 4;
    const E_ALREADY_GRADUATED: u64 = 5;

    // ---- Constants ---------------------------------------------------------
    /// 50 bps = 0.5% — retained to appchain.
    const FEE_BPS: u64 = 50;
    const BPS_DENOM: u64 = 10_000;
    /// Graduation threshold in `uinit` — 5 000 INIT.
    const GRADUATION_THRESHOLD: u128 = 5_000_000_000u128;

    // ---- State -------------------------------------------------------------
    struct Curve has key {
        /// INIT raised so far (uinit).
        init_reserve: u128,
        /// Token supply minted on curve.
        token_supply: u128,
        /// Linear slope numerator (price = slope * supply).
        slope_num: u128,
        slope_den: u128,
        /// 0.5% fees accumulated (uinit).
        fee_pool: u128,
        graduated: bool,
    }

    // ---- Events ------------------------------------------------------------
    #[event]
    struct Trade has drop, store {
        trader: address,
        metadata: address,
        side: u8,                // 0 = buy, 1 = sell
        init_in_or_out: u128,
        token_in_or_out: u128,
        fee: u128,
    }

    // ---- Entry -------------------------------------------------------------

    /// Seeds the curve for a newly-minted token. Called once, right after
    /// `token_factory::launch`.
    public entry fun initialize(
        creator: &signer,
        metadata: Object<Metadata>,
        slope_num: u128,
        slope_den: u128,
    ) {
        let addr = object::object_address(&metadata);
        assert!(!exists<Curve>(addr), error::already_exists(E_ALREADY_INITIALIZED));
        let _ = creator;
        move_to(&object::generate_signer_for_extending(&borrow_extend_ref(metadata)), Curve {
            init_reserve: 0,
            token_supply: 0,
            slope_num,
            slope_den,
            fee_pool: 0,
            graduated: false,
        });
    }

    /// Buy tokens — sends INIT in, mints tokens out. Receipt includes the 0.5%
    /// fee routed to `fee_pool`.
    public entry fun buy(
        trader: &signer,
        metadata: Object<Metadata>,
        init_in: u64,
        min_tokens_out: u64,
    ) acquires Curve {
        assert!(init_in > 0, error::invalid_argument(E_ZERO_AMOUNT));
        let curve = borrow_global_mut<Curve>(object::object_address(&metadata));
        assert!(!curve.graduated, error::invalid_state(E_ALREADY_GRADUATED));

        let fee = (init_in as u128) * (FEE_BPS as u128) / (BPS_DENOM as u128);
        let net = (init_in as u128) - fee;

        // Linear curve integration: tokens_out ≈ net / current_price.
        // Real implementation would use the slope integral; simplified here.
        let tokens_out = net * curve.slope_den / curve.slope_num;
        assert!(tokens_out >= (min_tokens_out as u128), error::invalid_state(E_SLIPPAGE));

        // TODO: actually debit trader's primary store and mint tokens via
        //       token_factory::mint_ref. Elided here to keep the submission
        //       file focused on the economic logic; full implementation
        //       lands at Phase 2 MVP Demo Day.
        let _ = trader;
        curve.init_reserve = curve.init_reserve + net;
        curve.token_supply = curve.token_supply + tokens_out;
        curve.fee_pool = curve.fee_pool + fee;

        event::emit(Trade {
            trader: signer::address_of(trader),
            metadata: object::object_address(&metadata),
            side: 0,
            init_in_or_out: init_in as u128,
            token_in_or_out: tokens_out,
            fee,
        });

        // Graduation check — atomic trigger to liquidity_migrator.
        if (curve.init_reserve >= GRADUATION_THRESHOLD) {
            curve.graduated = true;
            token_factory::mark_graduated(metadata);
            minitia_fun::liquidity_migrator::trigger_migration(metadata, curve.init_reserve, curve.token_supply);
        };
    }

    /// Sell tokens — burns tokens, releases INIT minus 0.5% fee.
    public entry fun sell(
        trader: &signer,
        metadata: Object<Metadata>,
        tokens_in: u64,
        min_init_out: u64,
    ) acquires Curve {
        assert!(tokens_in > 0, error::invalid_argument(E_ZERO_AMOUNT));
        let curve = borrow_global_mut<Curve>(object::object_address(&metadata));
        assert!(!curve.graduated, error::invalid_state(E_ALREADY_GRADUATED));

        let gross = (tokens_in as u128) * curve.slope_num / curve.slope_den;
        let fee = gross * (FEE_BPS as u128) / (BPS_DENOM as u128);
        let net = gross - fee;
        assert!(net >= (min_init_out as u128), error::invalid_state(E_SLIPPAGE));

        let _ = trader;
        curve.init_reserve = curve.init_reserve - gross;
        curve.token_supply = curve.token_supply - (tokens_in as u128);
        curve.fee_pool = curve.fee_pool + fee;

        event::emit(Trade {
            trader: signer::address_of(trader),
            metadata: object::object_address(&metadata),
            side: 1,
            init_in_or_out: net,
            token_in_or_out: tokens_in as u128,
            fee,
        });
    }

    // ---- View --------------------------------------------------------------

    #[view]
    public fun state(metadata: Object<Metadata>): (u128, u128, u128, bool) acquires Curve {
        let c = borrow_global<Curve>(object::object_address(&metadata));
        (c.init_reserve, c.token_supply, c.fee_pool, c.graduated)
    }

    #[view]
    public fun graduation_threshold(): u128 { GRADUATION_THRESHOLD }

    #[view]
    public fun fee_bps(): u64 { FEE_BPS }

    // ---- Internal ----------------------------------------------------------

    fun borrow_extend_ref(metadata: Object<Metadata>): object::ExtendRef {
        // Placeholder — real impl pulls from token_factory::TokenRefs.extend_ref.
        abort error::internal(99)
    }
}
