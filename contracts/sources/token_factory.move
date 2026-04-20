/// Minitia.fun - token_factory
/// ---------------------------------------------------------------------------
/// Registry of fair-launched tokens on the minitia-fun-test-1 rollup.
///
/// Each launch records: creator, ticker, name, description, and the canonical
/// `ticker.fun.init` subdomain. The bonding_curve module consumes this data
/// to route trades. This is the minimal on-chain logic used for the hackathon
/// deploy - Phase 2 adds the full object-centric metadata + mint/burn refs.
module minitia_fun::token_factory {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::vector;

    use initia_std::event;
    use initia_std::table::{Self, Table};

    // ---- Errors ------------------------------------------------------------
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_TICKER_TAKEN: u64 = 3;
    const E_TICKER_EMPTY: u64 = 4;
    const E_TICKER_TOO_LONG: u64 = 5;
    const E_NOT_ADMIN: u64 = 6;

    // ---- Constants ---------------------------------------------------------
    const MAX_TICKER_LEN: u64 = 8;

    // ---- Resources ---------------------------------------------------------

    /// Global registry of launched tokens, keyed by ticker string.
    struct Registry has key {
        admin: address,
        tokens: Table<String, TokenInfo>,
        count: u64,
    }

    /// Per-token info.
    struct TokenInfo has store, copy, drop {
        creator: address,
        ticker: String,
        name: String,
        description: String,
        subdomain: String,
        graduated: bool,
        launch_index: u64,
    }

    // ---- Events ------------------------------------------------------------
    #[event]
    struct TokenLaunched has drop, store {
        creator: address,
        ticker: String,
        name: String,
        subdomain: String,
        launch_index: u64,
    }

    #[event]
    struct TokenGraduated has drop, store {
        ticker: String,
        launch_index: u64,
    }

    // ---- Init --------------------------------------------------------------

    /// Publish the registry. Only the module owner (the account the module is
    /// deployed under) should call this once at deployment time.
    public entry fun initialize(owner: &signer) {
        let addr = signer::address_of(owner);
        assert!(!exists<Registry>(addr), error::already_exists(E_ALREADY_INITIALIZED));
        move_to(owner, Registry {
            admin: addr,
            tokens: table::new<String, TokenInfo>(),
            count: 0,
        });
    }

    // ---- Entry -------------------------------------------------------------

    /// Launch a new token on the registry. Any address can launch - there is
    /// no permissioning at the launcher level. Economic guardrails live in the
    /// bonding_curve module.
    public entry fun launch(
        creator: &signer,
        registry_addr: address,
        ticker: String,
        name: String,
        description: String,
    ) acquires Registry {
        assert_valid_ticker(&ticker);
        assert!(exists<Registry>(registry_addr), error::not_found(E_NOT_INITIALIZED));

        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(!table::contains(&registry.tokens, ticker), error::already_exists(E_TICKER_TAKEN));

        let subdomain = build_subdomain(&ticker);
        let launch_index = registry.count + 1;
        let info = TokenInfo {
            creator: signer::address_of(creator),
            ticker,
            name,
            description,
            subdomain,
            graduated: false,
            launch_index,
        };

        table::add(&mut registry.tokens, ticker, info);
        registry.count = launch_index;

        event::emit(TokenLaunched {
            creator: signer::address_of(creator),
            ticker,
            name,
            subdomain,
            launch_index,
        });
    }

    /// Mark a token as graduated. Admin-only (the module owner; in production
    /// this would be the bonding_curve module via a capability).
    public entry fun mark_graduated(
        admin: &signer,
        registry_addr: address,
        ticker: String,
    ) acquires Registry {
        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(signer::address_of(admin) == registry.admin, error::permission_denied(E_NOT_ADMIN));
        let info_ref = table::borrow_mut(&mut registry.tokens, ticker);
        info_ref.graduated = true;
        event::emit(TokenGraduated {
            ticker,
            launch_index: info_ref.launch_index,
        });
    }

    // ---- View --------------------------------------------------------------

    #[view]
    public fun count(registry_addr: address): u64 acquires Registry {
        if (!exists<Registry>(registry_addr)) { return 0 };
        borrow_global<Registry>(registry_addr).count
    }

    #[view]
    public fun info(registry_addr: address, ticker: String): TokenInfo acquires Registry {
        let registry = borrow_global<Registry>(registry_addr);
        *table::borrow(&registry.tokens, ticker)
    }

    /// True if a ticker has been registered via `launch`. Used by
    /// bonding_curve::create_pool to gate pool creation to known tokens.
    #[view]
    public fun ticker_registered(registry_addr: address, ticker: String): bool acquires Registry {
        if (!exists<Registry>(registry_addr)) { return false };
        table::contains(&borrow_global<Registry>(registry_addr).tokens, ticker)
    }

    /// Wallet that registered the ticker via `launch`. Aborts if the ticker
    /// is not registered. Used by bonding_curve::create_pool to require that
    /// only the original launcher can open the curve (preventing pool-creator
    /// capture by a passerby).
    #[view]
    public fun launcher_of(registry_addr: address, ticker: String): address acquires Registry {
        let registry = borrow_global<Registry>(registry_addr);
        table::borrow(&registry.tokens, ticker).creator
    }

    // ---- Internal ----------------------------------------------------------

    fun assert_valid_ticker(ticker: &String) {
        let bytes = string::bytes(ticker);
        let len = vector::length(bytes);
        assert!(len > 0, error::invalid_argument(E_TICKER_EMPTY));
        assert!(len <= MAX_TICKER_LEN, error::invalid_argument(E_TICKER_TOO_LONG));
    }

    fun build_subdomain(ticker: &String): String {
        let s = string::utf8(b"");
        string::append(&mut s, *ticker);
        string::append(&mut s, string::utf8(b".fun.init"));
        s
    }
}
