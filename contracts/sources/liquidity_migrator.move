/// Minitia.fun - liquidity_migrator
/// ---------------------------------------------------------------------------
/// State transitions for the appchain promotion flow. Runs AFTER
/// bonding_curve marks a pool graduated. Entries:
///
///   stage_promotion(admin, registry, ticker)
///     - Verify pool.graduated
///     - Snapshot final_reserve + final_supply + creator
///     - Emit PromotionStaged event (off-chain promoter daemon listens here)
///
///   record_rollup(admin, ticker, rollup_chain_id, rollup_rpc, first_block_tx)
///     - Called by admin once the spawned rollup is live
///     - Persists the mapping ticker -> rollup chain_id so the UI can link to it
///     - Emits RollupRegistered event
///
/// The actual rollup spawn happens off-chain via `weave rollup launch`
/// invoked by the promoter daemon. This module is the on-chain coordination
/// layer: the signal that a promotion is requested, and the official record
/// that it landed.
module minitia_fun::liquidity_migrator {
    use std::error;
    use std::signer;
    use std::string::String;

    use initia_std::event;
    use initia_std::table::{Self, Table};

    // ---- Errors ------------------------------------------------------------
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_NOT_ADMIN: u64 = 3;
    const E_NOT_GRADUATED: u64 = 4;
    const E_ALREADY_STAGED: u64 = 5;
    const E_NOT_STAGED: u64 = 6;
    const E_ALREADY_LIVE: u64 = 7;
    const E_NOT_CREATOR: u64 = 8;

    // ---- State -------------------------------------------------------------

    struct Registry has key {
        admin: address,
        /// ticker -> Stage record. Represents pending + live promotions.
        stages: Table<String, Stage>,
    }

    struct Stage has copy, drop, store {
        ticker: String,
        creator: address,
        final_reserve: u128,
        final_supply: u128,
        staged_block_height: u64,
        /// 0 = staged, 1 = live
        status: u8,
        /// Populated via record_rollup once the appchain is running.
        rollup_chain_id: String,
        rollup_rpc: String,
        first_block_tx: String,
    }

    // ---- Events ------------------------------------------------------------

    #[event]
    struct PromotionStaged has drop, store {
        ticker: String,
        creator: address,
        final_reserve: u128,
        final_supply: u128,
    }

    #[event]
    struct RollupRegistered has drop, store {
        ticker: String,
        rollup_chain_id: String,
        rollup_rpc: String,
        first_block_tx: String,
    }

    // ---- Init --------------------------------------------------------------

    public entry fun initialize(owner: &signer) {
        let addr = signer::address_of(owner);
        assert!(!exists<Registry>(addr), error::already_exists(E_ALREADY_INITIALIZED));
        move_to(owner, Registry {
            admin: addr,
            stages: table::new<String, Stage>(),
        });
    }

    // ---- Entry -------------------------------------------------------------

    /// Stage a graduated ticker for appchain promotion. The signer must be
    /// the pool creator (self-service) -- graduation is their achievement, so
    /// they get to decide when the spawn flow fires. Off-chain daemon sees
    /// PromotionStaged and kicks off the rollup spawn flow.
    public entry fun stage_promotion(
        sender: &signer,
        registry_addr: address,
        bonding_registry_addr: address,
        ticker: String,
    ) acquires Registry {
        assert!(exists<Registry>(registry_addr), error::not_found(E_NOT_INITIALIZED));
        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(!table::contains(&registry.stages, ticker), error::already_exists(E_ALREADY_STAGED));

        // Pool must be graduated on the bonding curve side.
        let (reserve, supply, _base, _slope, _fees, _trades, is_grad) =
            bonding_snapshot(bonding_registry_addr, ticker);
        assert!(is_grad, error::invalid_state(E_NOT_GRADUATED));
        let creator = minitia_fun::bonding_curve::creator_of(bonding_registry_addr, ticker);
        let sender_addr = signer::address_of(sender);
        // Creator-only, or admin fallback for ops recovery.
        assert!(
            sender_addr == creator || sender_addr == registry.admin,
            error::permission_denied(E_NOT_CREATOR)
        );

        let stage = Stage {
            ticker,
            creator,
            final_reserve: reserve,
            final_supply: supply,
            staged_block_height: 0, // block height not exposed to entries; off-chain fills via tx height
            status: 0,
            rollup_chain_id: std::string::utf8(b""),
            rollup_rpc: std::string::utf8(b""),
            first_block_tx: std::string::utf8(b""),
        };
        table::add(&mut registry.stages, ticker, stage);

        event::emit(PromotionStaged {
            ticker,
            creator,
            final_reserve: reserve,
            final_supply: supply,
        });
    }

    /// Record the freshly spawned rollup's coordinates. Flips status from
    /// 0 (staged) to 1 (live). Callable by pool creator (self-service,
    /// same pattern as stage_promotion) or module admin as ops fallback.
    public entry fun record_rollup(
        sender: &signer,
        registry_addr: address,
        ticker: String,
        rollup_chain_id: String,
        rollup_rpc: String,
        first_block_tx: String,
    ) acquires Registry {
        let sender_addr = signer::address_of(sender);
        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(table::contains(&registry.stages, ticker), error::not_found(E_NOT_STAGED));

        let stage = table::borrow_mut(&mut registry.stages, ticker);
        assert!(stage.status == 0, error::invalid_state(E_ALREADY_LIVE));
        assert!(
            sender_addr == stage.creator || sender_addr == registry.admin,
            error::permission_denied(E_NOT_CREATOR)
        );
        stage.rollup_chain_id = rollup_chain_id;
        stage.rollup_rpc = rollup_rpc;
        stage.first_block_tx = first_block_tx;
        stage.status = 1;

        event::emit(RollupRegistered {
            ticker,
            rollup_chain_id,
            rollup_rpc,
            first_block_tx,
        });
    }

    /// Ops-recovery path: module admin overwrites the rollup coordinates
    /// on an already-live stage. Use case: the initial record_rollup went
    /// in with a stale RPC URL (e.g. operator pasted the parent-chain URL
    /// by accident) and the regular record_rollup aborts with
    /// E_ALREADY_LIVE on retry. Admin-only. Does NOT reset status; the
    /// stage stays `live`.
    public entry fun admin_update_rollup(
        admin: &signer,
        registry_addr: address,
        ticker: String,
        rollup_chain_id: String,
        rollup_rpc: String,
        first_block_tx: String,
    ) acquires Registry {
        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(
            signer::address_of(admin) == registry.admin,
            error::permission_denied(E_NOT_ADMIN)
        );
        assert!(table::contains(&registry.stages, ticker), error::not_found(E_NOT_STAGED));

        let stage = table::borrow_mut(&mut registry.stages, ticker);
        stage.rollup_chain_id = rollup_chain_id;
        stage.rollup_rpc = rollup_rpc;
        stage.first_block_tx = first_block_tx;

        event::emit(RollupRegistered {
            ticker,
            rollup_chain_id,
            rollup_rpc,
            first_block_tx,
        });
    }

    // ---- View --------------------------------------------------------------

    #[view]
    public fun stage_exists(registry_addr: address, ticker: String): bool acquires Registry {
        if (!exists<Registry>(registry_addr)) { return false };
        table::contains(&borrow_global<Registry>(registry_addr).stages, ticker)
    }

    /// Returns (creator, final_reserve, final_supply, status, chain_id, rpc, first_block_tx).
    /// status: 0 = staged, 1 = live.
    #[view]
    public fun stage_of(registry_addr: address, ticker: String):
        (address, u128, u128, u8, String, String, String) acquires Registry {
        let registry = borrow_global<Registry>(registry_addr);
        let s = table::borrow(&registry.stages, ticker);
        (
            s.creator,
            s.final_reserve,
            s.final_supply,
            s.status,
            s.rollup_chain_id,
            s.rollup_rpc,
            s.first_block_tx,
        )
    }

    // ---- Internal ----------------------------------------------------------

    /// Pulls the graduated pool's snapshot via view calls on bonding_curve.
    /// Returns (reserve, supply, base, slope, fees, trades, is_graduated).
    fun bonding_snapshot(
        bonding_registry_addr: address,
        ticker: String,
    ): (u128, u128, u128, u128, u128, u128, bool) {
        let tuple = minitia_fun::bonding_curve::pool_state(bonding_registry_addr, ticker);
        let reserve = *std::vector::borrow(&tuple, 0);
        let supply = *std::vector::borrow(&tuple, 1);
        let base = *std::vector::borrow(&tuple, 2);
        let slope = *std::vector::borrow(&tuple, 3);
        let fees = *std::vector::borrow(&tuple, 4);
        let trades = *std::vector::borrow(&tuple, 5);
        let grad = *std::vector::borrow(&tuple, 6) == 1u128;
        (reserve, supply, base, slope, fees, trades, grad)
    }
}
