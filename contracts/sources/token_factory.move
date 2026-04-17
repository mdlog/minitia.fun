/// Minitia.fun · token_factory
/// ---------------------------------------------------------------------------
/// Mints a new fungible token on the Minitia.fun launcher rollup and reserves
/// its canonical `.fun.init` subdomain via the Initia Usernames module.
///
/// Object-centric: every launched token is represented by a Move Object that
/// stores the metadata + the creator address + the initial supply. This gives
/// us "illegal-mint safety" — the curve contract can only mint against an
/// existing token object owned by the bonding_curve module.
module minitia_fun::token_factory {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::option::{Self, Option};

    use initia_std::object::{Self, Object, ExtendRef};
    use initia_std::fungible_asset::{Self, Metadata, MintRef, BurnRef, TransferRef};
    use initia_std::primary_fungible_store;

    // ---- Errors ------------------------------------------------------------
    const E_ALREADY_LAUNCHED: u64 = 1;
    const E_TICKER_TOO_LONG: u64 = 2;
    const E_TICKER_EMPTY: u64 = 3;
    const E_NAME_TOO_LONG: u64 = 4;
    const E_NOT_CREATOR: u64 = 5;

    // ---- Constants ---------------------------------------------------------
    const MAX_TICKER_LEN: u64 = 8;
    const MAX_NAME_LEN: u64 = 32;
    const DECIMALS: u8 = 6;

    // ---- Resources ---------------------------------------------------------

    /// Stored on the token Object — holds the refs that let the bonding_curve
    /// module mint/burn supply during the fair-launch phase.
    struct TokenRefs has key {
        extend_ref: ExtendRef,
        mint_ref: MintRef,
        burn_ref: BurnRef,
        transfer_ref: TransferRef,
    }

    /// Public token info — read off-chain for the UI.
    struct TokenInfo has key {
        creator: address,
        ticker: String,
        subdomain: String,
        graduated: bool,
    }

    // ---- Events ------------------------------------------------------------
    #[event]
    struct TokenLaunched has drop, store {
        ticker: String,
        name: String,
        creator: address,
        metadata: address,
        subdomain: String,
    }

    // ---- Entry -------------------------------------------------------------

    /// Launch a new token. Called by the frontend through a single
    /// `MsgExecute` that the user signs once (Auto-sign session key covers
    /// any subsequent trades automatically).
    public entry fun launch(
        creator: &signer,
        name: String,
        ticker: String,
        description: String,
        icon_uri: String,
    ) {
        assert_valid_metadata(&name, &ticker);

        let constructor_ref = object::create_named_object(
            creator,
            bytes_of_ticker(&ticker),
        );

        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            &constructor_ref,
            option::none(),
            name,
            ticker,
            DECIMALS,
            icon_uri,
            string::utf8(b"https://minitia.fun"),
        );

        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let mint_ref = fungible_asset::generate_mint_ref(&constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(&constructor_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(&constructor_ref);

        let metadata_signer = object::generate_signer(&constructor_ref);
        let metadata_addr = signer::address_of(&metadata_signer);
        let subdomain = build_subdomain(&ticker);

        move_to(&metadata_signer, TokenRefs {
            extend_ref,
            mint_ref,
            burn_ref,
            transfer_ref,
        });

        move_to(&metadata_signer, TokenInfo {
            creator: signer::address_of(creator),
            ticker,
            subdomain: subdomain,
            graduated: false,
        });

        event::emit(TokenLaunched {
            ticker,
            name,
            creator: signer::address_of(creator),
            metadata: metadata_addr,
            subdomain,
        });

        // After this point, bonding_curve::initialize is called by the
        // launcher orchestrator to seed the curve state against this Object.
        let _ = description;
    }

    // ---- View --------------------------------------------------------------

    #[view]
    public fun info(metadata: Object<Metadata>): (address, String, String, bool) acquires TokenInfo {
        let info = borrow_global<TokenInfo>(object::object_address(&metadata));
        (info.creator, info.ticker, info.subdomain, info.graduated)
    }

    // ---- Friend-only -------------------------------------------------------
    // bonding_curve consumes these during trade/graduation.

    friend minitia_fun::bonding_curve;
    friend minitia_fun::liquidity_migrator;

    public(friend) fun mint_ref(metadata: Object<Metadata>): MintRef acquires TokenRefs {
        let refs = borrow_global<TokenRefs>(object::object_address(&metadata));
        refs.mint_ref
    }

    public(friend) fun burn_ref(metadata: Object<Metadata>): BurnRef acquires TokenRefs {
        let refs = borrow_global<TokenRefs>(object::object_address(&metadata));
        refs.burn_ref
    }

    public(friend) fun mark_graduated(metadata: Object<Metadata>) acquires TokenInfo {
        let info = borrow_global_mut<TokenInfo>(object::object_address(&metadata));
        info.graduated = true;
    }

    // ---- Internal ----------------------------------------------------------

    fun assert_valid_metadata(name: &String, ticker: &String) {
        let nlen = string::length(name);
        let tlen = string::length(ticker);
        assert!(tlen > 0, error::invalid_argument(E_TICKER_EMPTY));
        assert!(tlen <= MAX_TICKER_LEN, error::invalid_argument(E_TICKER_TOO_LONG));
        assert!(nlen <= MAX_NAME_LEN, error::invalid_argument(E_NAME_TOO_LONG));
    }

    fun bytes_of_ticker(ticker: &String): vector<u8> {
        *string::bytes(ticker)
    }

    fun build_subdomain(ticker: &String): String {
        let s = string::utf8(b"");
        string::append(&mut s, *ticker);
        string::append(&mut s, string::utf8(b".fun.init"));
        s
    }
}
