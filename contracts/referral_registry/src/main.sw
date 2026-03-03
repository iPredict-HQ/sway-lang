contract;

// ── ReferralRegistry Contract ────────────────────────────────────────────────
// Onchain referral system: user registration with display names, referrer
// tracking, referral fee credit routing, and welcome bonuses via inter-contract
// calls to Leaderboard and IPredictToken.
//
// Authorization:
//   • credit()             — only callable by the PredictionMarket contract
//   • register_referral()  — callable by any user (once per address)
//   • initialize()         — one-time setup by deployer
// ─────────────────────────────────────────────────────────────────────────────

use std::{
    asset::transfer,
    auth::msg_sender,
    call_frames::msg_asset_id,
    context::msg_amount,
    hash::Hash,
    logging::log,
    string::String,
    storage::storage_map::*,
    storage::storage_string::*,
};
use libraries::*;

// ═══════════════════════════════════════════════════════════════════════════════
//  STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

storage {
    /// Whether `initialize` has been called.
    initialized: bool = false,
    /// Admin identity.
    admin: Identity = Identity::Address(Address::zero()),
    /// Linked contract IDs.
    market_contract: ContractId = ContractId::zero(),
    token_contract: ContractId = ContractId::zero(),
    leaderboard_contract: ContractId = ContractId::zero(),

    // ── Per-user data ────────────────────────────────────────────────────────
    /// Whether a user has registered.
    registered: StorageMap<Identity, bool> = StorageMap {},
    /// Display name per user (stored as StorageString via a key scheme).
    display_names: StorageMap<Identity, StorageString> = StorageMap {},
    /// Referrer for each user (if any). We store Identity::Address(zero) for "no referrer"
    /// and use a separate flag to distinguish.
    referrers: StorageMap<Identity, Identity> = StorageMap {},
    /// Whether a user has a referrer set.
    has_referrer_flag: StorageMap<Identity, bool> = StorageMap {},
    /// Number of users referred by this user.
    referral_counts: StorageMap<Identity, u32> = StorageMap {},
    /// Cumulative ETH earnings from referral fees for this user.
    earnings: StorageMap<Identity, u64> = StorageMap {},
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ABI DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

abi ReferralRegistry {
    // -- Lifecycle --
    #[storage(read, write)]
    fn initialize(
        market_contract: ContractId,
        token_contract: ContractId,
        leaderboard_contract: ContractId,
    );

    // -- Registration --
    #[storage(read, write)]
    fn register_referral(display_name: String, referrer: Option<Identity>);

    // -- Credit (called by PredictionMarket) --
    #[storage(read, write)]
    #[payable]
    fn credit(user: Identity, referral_fee: u64) -> bool;

    // -- View Functions --
    #[storage(read)]
    fn get_referrer(user: Identity) -> Option<Identity>;

    #[storage(read)]
    fn get_display_name(user: Identity) -> String;

    #[storage(read)]
    fn get_referral_count(user: Identity) -> u32;

    #[storage(read)]
    fn get_earnings(user: Identity) -> u64;

    #[storage(read)]
    fn has_referrer(user: Identity) -> bool;

    #[storage(read)]
    fn is_registered(user: Identity) -> bool;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

impl ReferralRegistry for Contract {
    // ─── Lifecycle ───────────────────────────────────────────────────────────

    /// One-time initialization. Caller becomes admin.
    #[storage(read, write)]
    fn initialize(
        market_contract: ContractId,
        token_contract: ContractId,
        leaderboard_contract: ContractId,
    ) {
        require(
            storage.initialized.read() == false,
            ReferralError::AlreadyInitialized,
        );

        storage.initialized.write(true);
        storage.admin.write(msg_sender().unwrap());
        storage.market_contract.write(market_contract);
        storage.token_contract.write(token_contract);
        storage.leaderboard_contract.write(leaderboard_contract);
    }

    // ─── Registration ────────────────────────────────────────────────────────

    /// Register the caller with a display name and optional referrer.
    /// Awards welcome bonus: WELCOME_BONUS_POINTS via Leaderboard + WELCOME_BONUS_TOKENS via Token.
    /// If a referrer is provided, that referrer's referral_count is incremented.
    #[storage(read, write)]
    fn register_referral(display_name: String, referrer: Option<Identity>) {
        require(storage.initialized.read(), ReferralError::NotInitialized);

        let user = msg_sender().unwrap();

        // Reject double registration.
        require(
            storage.registered.get(user).try_read().unwrap_or(false) == false,
            ReferralError::AlreadyRegistered,
        );

        // Reject self-referral.
        match referrer {
            Option::Some(r) => {
                require(r != user, ReferralError::SelfReferral);
            },
            Option::None => {},
        }

        // Mark as registered.
        storage.registered.insert(user, true);

        // Store display name.
        storage.display_names.get(user).write_slice(display_name);

        // Store referrer if provided.
        match referrer {
            Option::Some(r) => {
                storage.referrers.insert(user, r);
                storage.has_referrer_flag.insert(user, true);

                // Increment referrer's referral count.
                let count = storage.referral_counts.get(r).try_read().unwrap_or(0);
                storage.referral_counts.insert(r, count + 1);
            },
            Option::None => {
                storage.has_referrer_flag.insert(user, false);
            },
        }

        // ── Welcome bonus via inter-contract calls ──────────────────────────
        // Read linked contract IDs BEFORE external interactions (CEI pattern).
        let leaderboard_id = storage.leaderboard_contract.read();
        let token_id = storage.token_contract.read();
        let has_ref_flag = storage.has_referrer_flag.get(user).try_read().unwrap_or(false);

        // Award welcome points on the leaderboard.
        let leaderboard = abi(LeaderboardAbi, leaderboard_id.bits());
        leaderboard.add_bonus_pts(user, WELCOME_BONUS_POINTS);

        // Mint welcome tokens.
        let token = abi(IPredictTokenAbi, token_id.bits());
        token.mint(user, WELCOME_BONUS_TOKENS);

        log(ReferralRegisteredEvent {
            user,
            display_name,
            has_referrer: has_ref_flag,
        });
    }

    // ─── Credit ──────────────────────────────────────────────────────────────

    /// Called by PredictionMarket on each bet. If the user has a referrer,
    /// the referral fee (forwarded as ETH with this call) is transferred to the
    /// referrer, and bonus points are awarded. Returns `true` if fee was routed.
    /// Returns `false` if user has no referrer (caller should retain the fee).
    #[storage(read, write)]
    #[payable]
    fn credit(user: Identity, referral_fee: u64) -> bool {
        require(storage.initialized.read(), ReferralError::NotInitialized);

        // Authorization: only the market contract may call this.
        let sender = msg_sender().unwrap();
        require(
            sender == Identity::ContractId(storage.market_contract.read()),
            ReferralError::UnauthorizedCaller,
        );

        // Check if the user has a referrer.
        let has_ref = storage.has_referrer_flag.get(user).try_read().unwrap_or(false);
        if has_ref == false {
            // No referrer — return false. The market contract will keep the fee.
            // Any coins forwarded with this call remain in this contract's balance.
            // The market contract should NOT forward coins if it first checks
            // has_referrer or handles the returned false.
            return false;
        }

        let referrer = storage.referrers.get(user).try_read().unwrap();

        // Transfer the referral fee (ETH sent with this call) to the referrer.
        let received = msg_amount();
        if received > 0 {
            transfer(referrer, msg_asset_id(), received);
        }

        // Track cumulative earnings.
        let current_earnings = storage.earnings.get(referrer).try_read().unwrap_or(0);
        storage.earnings.insert(referrer, current_earnings + referral_fee);

        // Award bonus points to the referrer.
        let leaderboard = abi(LeaderboardAbi, storage.leaderboard_contract.read().bits());
        leaderboard.add_bonus_pts(referrer, REFERRAL_BET_POINTS);

        log(ReferralCreditedEvent {
            user,
            referrer,
            amount: referral_fee,
        });

        true
    }

    // ─── View Functions ─────────────────────────────────────────────────────

    /// Return the referrer of `user`, or `None` if none was set.
    #[storage(read)]
    fn get_referrer(user: Identity) -> Option<Identity> {
        let has_ref = storage.has_referrer_flag.get(user).try_read().unwrap_or(false);
        if has_ref {
            Option::Some(storage.referrers.get(user).try_read().unwrap())
        } else {
            Option::None
        }
    }

    /// Return the display name for `user`.
    #[storage(read)]
    fn get_display_name(user: Identity) -> String {
        storage.display_names.get(user).read_slice().unwrap_or(String::new())
    }

    /// Return how many users `user` has referred.
    #[storage(read)]
    fn get_referral_count(user: Identity) -> u32 {
        storage.referral_counts.get(user).try_read().unwrap_or(0)
    }

    /// Return cumulative ETH referral earnings for `user`.
    #[storage(read)]
    fn get_earnings(user: Identity) -> u64 {
        storage.earnings.get(user).try_read().unwrap_or(0)
    }

    /// Check whether `user` has a referrer set.
    #[storage(read)]
    fn has_referrer(user: Identity) -> bool {
        storage.has_referrer_flag.get(user).try_read().unwrap_or(false)
    }

    /// Check whether `user` has registered.
    #[storage(read)]
    fn is_registered(user: Identity) -> bool {
        storage.registered.get(user).try_read().unwrap_or(false)
    }
}
