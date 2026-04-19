/// Minitia.fun - comments
/// ---------------------------------------------------------------------------
/// Per-ticker public comment wall. Permissionless posting. Every comment is
/// a real on-chain event verifiable via tx_search; the wall is also stored
/// in a Table so view calls return the full history in order.
module minitia_fun::comments {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::vector;

    use initia_std::event;
    use initia_std::table::{Self, Table};

    // ---- Errors ------------------------------------------------------------
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_EMPTY: u64 = 3;
    const E_TOO_LONG: u64 = 4;

    // ---- Constants ---------------------------------------------------------
    const MAX_BODY_LEN: u64 = 280;

    // ---- State -------------------------------------------------------------

    struct Wall has key {
        admin: address,
        threads: Table<String, Thread>,
    }

    struct Thread has store {
        count: u64,
        comments: vector<Comment>,
    }

    struct Comment has copy, drop, store {
        author: address,
        body: String,
        block_height: u64,
    }

    // ---- Events ------------------------------------------------------------
    #[event]
    struct CommentPosted has drop, store {
        ticker: String,
        author: address,
        index: u64,
        body: String,
    }

    // ---- Init --------------------------------------------------------------

    public entry fun initialize(owner: &signer) {
        let addr = signer::address_of(owner);
        assert!(!exists<Wall>(addr), error::already_exists(E_ALREADY_INITIALIZED));
        move_to(owner, Wall {
            admin: addr,
            threads: table::new<String, Thread>(),
        });
    }

    // ---- Entry -------------------------------------------------------------

    /// Post a comment to the wall for `ticker`. No token-gating -- any wallet
    /// can post. Client-side should display a flag/mute option rather than
    /// on-chain moderation.
    public entry fun post(
        author: &signer,
        wall_addr: address,
        ticker: String,
        body: String,
    ) acquires Wall {
        assert!(exists<Wall>(wall_addr), error::not_found(E_NOT_INITIALIZED));
        let body_len = string::length(&body);
        assert!(body_len > 0, error::invalid_argument(E_EMPTY));
        assert!(body_len <= MAX_BODY_LEN, error::invalid_argument(E_TOO_LONG));

        let wall = borrow_global_mut<Wall>(wall_addr);
        let author_addr = signer::address_of(author);

        // Ensure a thread exists for this ticker.
        if (!table::contains(&wall.threads, ticker)) {
            table::add(&mut wall.threads, ticker, Thread {
                count: 0,
                comments: vector::empty<Comment>(),
            });
        };

        let thread = table::borrow_mut(&mut wall.threads, ticker);
        let index = thread.count;
        let entry = Comment {
            author: author_addr,
            body,
            block_height: 0, // filled by caller client from event / tx height
        };
        vector::push_back(&mut thread.comments, entry);
        thread.count = index + 1;

        event::emit(CommentPosted {
            ticker,
            author: author_addr,
            index,
            body,
        });
    }

    // ---- View --------------------------------------------------------------

    #[view]
    public fun thread_count(wall_addr: address, ticker: String): u64 acquires Wall {
        if (!exists<Wall>(wall_addr)) { return 0 };
        let wall = borrow_global<Wall>(wall_addr);
        if (!table::contains(&wall.threads, ticker)) { return 0 };
        table::borrow(&wall.threads, ticker).count
    }

    /// Returns the most recent `limit` comments for `ticker`, newest first.
    #[view]
    public fun recent_comments(wall_addr: address, ticker: String, limit: u64): vector<Comment> acquires Wall {
        let out = vector::empty<Comment>();
        if (!exists<Wall>(wall_addr)) { return out };
        let wall = borrow_global<Wall>(wall_addr);
        if (!table::contains(&wall.threads, ticker)) { return out };
        let thread = table::borrow(&wall.threads, ticker);
        let n = vector::length(&thread.comments);
        let take = if (n < limit) { n } else { limit };
        let i = 0;
        while (i < take) {
            let idx = n - 1 - i;
            let c = *vector::borrow(&thread.comments, idx);
            vector::push_back(&mut out, c);
            i = i + 1;
        };
        out
    }
}
