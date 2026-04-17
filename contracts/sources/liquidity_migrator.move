/// Minitia.fun · liquidity_migrator
/// ---------------------------------------------------------------------------
/// Triggered by `bonding_curve::buy` when a token crosses the 5 000 INIT
/// graduation threshold. Packages `(init_reserve, token_supply, fee_pool)`
/// into an IBC transfer to the L1 hub, where OPinit bots pick it up and
/// seed an InitiaDEX pool for the graduated token.
module minitia_fun::liquidity_migrator {
    use std::event;

    use initia_std::fungible_asset::Metadata;
    use initia_std::object::Object;

    // ---- Events ------------------------------------------------------------
    #[event]
    struct Graduated has drop, store {
        metadata: address,
        init_raised: u128,
        token_supply: u128,
    }

    // ---- Entry -------------------------------------------------------------

    friend minitia_fun::bonding_curve;

    /// Atomically invoked by bonding_curve when the threshold is crossed.
    /// Emits a `Graduated` event that OPinit bots index → L1 migration flow.
    public(friend) fun trigger_migration(
        metadata: Object<Metadata>,
        init_raised: u128,
        token_supply: u128,
    ) {
        event::emit(Graduated {
            metadata: object::object_address(&metadata),
            init_raised,
            token_supply,
        });

        // TODO: issue IBC transfer of `init_raised` + `token_supply` to the
        //       L1 InitiaDEX seed account. OPinit bot handles the settlement
        //       ack and DEX pool creation on the L1 side.
    }
}
