contract;

// ── PredictionMarket Contract ────────────────────────────────────────────────
// Core logic: create markets, place bets (with 2% fee split), resolve/cancel
// markets, claim rewards, withdraw platform fees.
// Inter-contract calls: IPredictToken, Leaderboard, ReferralRegistry.
// ─────────────────────────────────────────────────────────────────────────────

use std::{
    asset::transfer,
    auth::msg_sender,
    block::timestamp,
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
    /// Admin identity (the deployer who called `initialize`).
    admin: Identity = Identity::Address(Address::zero()),
    /// Linked contract IDs for inter-contract calls.
    token_contract: ContractId = ContractId::zero(),
    referral_contract: ContractId = ContractId::zero(),
    leaderboard_contract: ContractId = ContractId::zero(),

    /// Auto-incrementing market counter (next ID to assign). Starts at 1.
    market_count: u64 = 0,
    /// Accumulated platform fees (1.5% or full 2% when no referrer).
    accumulated_fees: u64 = 0,

    // ── Market Data ──────────────────────────────────────────────────────────
    // Market fields stored individually via flattened keys.
    market_question: StorageMap<u64, StorageString> = StorageMap {},
    market_image_url: StorageMap<u64, StorageString> = StorageMap {},
    market_end_time: StorageMap<u64, u64> = StorageMap {},
    market_total_yes: StorageMap<u64, u64> = StorageMap {},
    market_total_no: StorageMap<u64, u64> = StorageMap {},
    market_resolved: StorageMap<u64, bool> = StorageMap {},
    market_outcome: StorageMap<u64, bool> = StorageMap {},
    market_cancelled: StorageMap<u64, bool> = StorageMap {},
    market_creator: StorageMap<u64, Identity> = StorageMap {},
    market_bet_count: StorageMap<u64, u32> = StorageMap {},

    // ── Bet Data ─────────────────────────────────────────────────────────────
    // Keyed by (market_id, user) — encoded as a (u64, Identity) tuple.
    bet_amount: StorageMap<(u64, Identity), u64> = StorageMap {},
    bet_is_yes: StorageMap<(u64, Identity), bool> = StorageMap {},
    bet_claimed: StorageMap<(u64, Identity), bool> = StorageMap {},
    /// Whether a user has already placed a bet on this market.
    bet_exists: StorageMap<(u64, Identity), bool> = StorageMap {},

    // ── Bettor Index (for cancel-market iteration) ───────────────────────────
    // bettor_count[market_id] = number of unique bettors.
    // bettor_at[(market_id, index)] = Identity of the bettor at that index.
    bettor_count: StorageMap<u64, u32> = StorageMap {},
    bettor_at: StorageMap<(u64, u32), Identity> = StorageMap {},
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ABI DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

abi PredictionMarket {
    // -- Lifecycle --
    #[storage(read, write)]
    fn initialize(
        token_contract: ContractId,
        referral_contract: ContractId,
        leaderboard_contract: ContractId,
    );

    // -- Market Management (admin) --
    #[storage(read, write)]
    fn create_market(question: String, image_url: String, duration_secs: u64) -> u64;

    // -- Betting --
    #[storage(read, write)]
    #[payable]
    fn place_bet(market_id: u64, is_yes: bool);

    // -- Resolution --
    #[storage(read, write)]
    fn resolve_market(market_id: u64, outcome: bool);

    // -- Cancellation --
    #[storage(read, write)]
    fn cancel_market(market_id: u64);

    // -- Claim --
    #[storage(read, write)]
    fn claim(market_id: u64);

    // -- Admin: Withdraw Fees --
    #[storage(read, write)]
    fn withdraw_fees() -> u64;

    // -- View Functions --
    #[storage(read)]
    fn get_market(market_id: u64) -> Market;

    #[storage(read)]
    fn get_bet(market_id: u64, user: Identity) -> Bet;

    #[storage(read)]
    fn get_market_count() -> u64;

    #[storage(read)]
    fn get_odds(market_id: u64) -> Odds;

    #[storage(read)]
    fn get_accumulated_fees() -> u64;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

impl PredictionMarket for Contract {
    // ─── Lifecycle ───────────────────────────────────────────────────────────

    /// One-time initialization. Caller becomes admin.
    #[storage(read, write)]
    fn initialize(
        token_contract: ContractId,
        referral_contract: ContractId,
        leaderboard_contract: ContractId,
    ) {
        require(
            storage.initialized.read() == false,
            MarketError::AlreadyInitialized,
        );

        storage.initialized.write(true);
        storage.admin.write(msg_sender().unwrap());
        storage.token_contract.write(token_contract);
        storage.referral_contract.write(referral_contract);
        storage.leaderboard_contract.write(leaderboard_contract);
    }

    // ─── Market Management ──────────────────────────────────────────────────

    /// Create a new prediction market. Admin only.
    /// `duration_secs` is added to the current block timestamp to set `end_time`.
    /// Returns the new market ID (1-based).
    #[storage(read, write)]
    fn create_market(question: String, image_url: String, duration_secs: u64) -> u64 {
        require(storage.initialized.read(), MarketError::NotInitialized);
        require(
            msg_sender().unwrap() == storage.admin.read(),
            MarketError::NotAdmin,
        );

        // Increment market counter → new ID.
        let count = storage.market_count.read();
        let new_id = count + 1;
        storage.market_count.write(new_id);

        let end_time = timestamp() + duration_secs;
        let creator = msg_sender().unwrap();

        // Store individual market fields.
        storage.market_question.get(new_id).write_slice(question);
        storage.market_image_url.get(new_id).write_slice(image_url);
        storage.market_end_time.insert(new_id, end_time);
        storage.market_total_yes.insert(new_id, 0);
        storage.market_total_no.insert(new_id, 0);
        storage.market_resolved.insert(new_id, false);
        storage.market_outcome.insert(new_id, false);
        storage.market_cancelled.insert(new_id, false);
        storage.market_creator.insert(new_id, creator);
        storage.market_bet_count.insert(new_id, 0);
        storage.bettor_count.insert(new_id, 0);

        log(MarketCreatedEvent {
            market_id: new_id,
            question,
            end_time,
            creator,
        });

        new_id
    }

    // ─── Betting ────────────────────────────────────────────────────────────

    /// Place a bet on a market. Caller sends ETH with the call.
    /// A 2% fee is deducted: 1.5% platform + 0.5% referral.
    /// If the user has no referrer, the full 2% goes to platform fees.
    /// Users may increase their position on the same side but cannot
    /// switch sides.
    #[storage(read, write)]
    #[payable]
    fn place_bet(market_id: u64, is_yes: bool) {
        require(storage.initialized.read(), MarketError::NotInitialized);

        // Validate market exists.
        let count = storage.market_count.read();
        require(market_id >= 1 && market_id <= count, MarketError::MarketNotFound);

        // Validate market is active (not resolved, not cancelled, not expired).
        require(
            storage.market_resolved.get(market_id).try_read().unwrap_or(false) == false,
            MarketError::MarketResolved,
        );
        require(
            storage.market_cancelled.get(market_id).try_read().unwrap_or(false) == false,
            MarketError::MarketCancelled,
        );
        let end_time = storage.market_end_time.get(market_id).try_read().unwrap_or(0);
        require(timestamp() < end_time, MarketError::MarketExpired);

        // Validate amount.
        let gross_amount = msg_amount();
        require(gross_amount >= MIN_BET, MarketError::BetTooSmall);
        require(
            msg_asset_id() == AssetId::base(),
            MarketError::InvalidAmount,
        );

        let user = msg_sender().unwrap();
        let key = (market_id, user);

        // Check for existing bet — same-side increase is allowed, opposite side is not.
        let already_has_bet = storage.bet_exists.get(key).try_read().unwrap_or(false);
        if already_has_bet {
            let existing_side = storage.bet_is_yes.get(key).try_read().unwrap_or(false);
            require(existing_side == is_yes, MarketError::OppositeSideBet);
        }

        // ── Fee calculation ─────────────────────────────────────────────────
        let total_fee = gross_amount * TOTAL_FEE_BPS / BPS_DENOM;
        let platform_fee = gross_amount * PLATFORM_FEE_BPS / BPS_DENOM;
        let referral_fee = total_fee - platform_fee; // 0.5%
        let net_amount = gross_amount - total_fee;

        // ── Read all storage values BEFORE external calls (CEI pattern) ─────
        let referral_id = storage.referral_contract.read();
        let leaderboard_id = storage.leaderboard_contract.read();
        let current_fees = storage.accumulated_fees.read();
        let is_increase = already_has_bet;
        let existing_amount = storage.bet_amount.get(key).try_read().unwrap_or(0);
        let bc = storage.bettor_count.get(market_id).try_read().unwrap_or(0);
        let current_bets = storage.market_bet_count.get(market_id).try_read().unwrap_or(0);
        let current_yes = storage.market_total_yes.get(market_id).try_read().unwrap_or(0);
        let current_no = storage.market_total_no.get(market_id).try_read().unwrap_or(0);

        // ── Effects: update all storage BEFORE interactions ──────────────────
        // Update bet data.
        if already_has_bet {
            storage.bet_amount.insert(key, existing_amount + net_amount);
        } else {
            storage.bet_amount.insert(key, net_amount);
            storage.bet_is_yes.insert(key, is_yes);
            storage.bet_claimed.insert(key, false);
            storage.bet_exists.insert(key, true);
            storage.bettor_at.insert((market_id, bc), user);
            storage.bettor_count.insert(market_id, bc + 1);
            storage.market_bet_count.insert(market_id, current_bets + 1);
        }

        // Update market pool totals.
        if is_yes {
            storage.market_total_yes.insert(market_id, current_yes + net_amount);
        } else {
            storage.market_total_no.insert(market_id, current_no + net_amount);
        }

        // ── Interactions: external calls LAST ───────────────────────────────
        // Route referral fee via ReferralRegistry.
        let referral = abi(ReferralRegistryAbi, referral_id.bits());
        let had_referrer = referral.credit {
            asset_id: AssetId::base().bits(),
            coins: referral_fee,
        }(user, referral_fee);

        // Update accumulated fees (depends on referral result, but all reads done above).
        let actual_platform_fee = if had_referrer {
            platform_fee
        } else {
            total_fee
        };
        storage.accumulated_fees.write(current_fees + actual_platform_fee);

        // Record bet on leaderboard.
        let leaderboard = abi(LeaderboardAbi, leaderboard_id.bits());
        leaderboard.record_bet(user);

        log(BetPlacedEvent {
            market_id,
            user,
            is_yes,
            amount: gross_amount,
            net_amount,
            fee: total_fee,
            is_increase,
        });
    }

    // ─── Resolution ─────────────────────────────────────────────────────────

    /// Resolve a market with the given outcome. Admin only.
    /// Can only be called after the market's end_time has passed.
    #[storage(read, write)]
    fn resolve_market(market_id: u64, outcome: bool) {
        require(storage.initialized.read(), MarketError::NotInitialized);
        require(
            msg_sender().unwrap() == storage.admin.read(),
            MarketError::NotAdmin,
        );

        let count = storage.market_count.read();
        require(market_id >= 1 && market_id <= count, MarketError::MarketNotFound);
        require(
            storage.market_resolved.get(market_id).try_read().unwrap_or(false) == false,
            MarketError::MarketResolved,
        );
        require(
            storage.market_cancelled.get(market_id).try_read().unwrap_or(false) == false,
            MarketError::MarketCancelled,
        );

        let end_time = storage.market_end_time.get(market_id).try_read().unwrap_or(0);
        require(timestamp() >= end_time, MarketError::MarketNotExpired);

        storage.market_resolved.insert(market_id, true);
        storage.market_outcome.insert(market_id, outcome);

        log(MarketResolvedEvent {
            market_id,
            outcome,
        });
    }

    // ─── Cancellation ───────────────────────────────────────────────────────

    /// Cancel a market and refund all bettors their net bet amounts.
    /// Admin only. Market must not be already resolved or cancelled.
    #[storage(read, write)]
    fn cancel_market(market_id: u64) {
        require(storage.initialized.read(), MarketError::NotInitialized);
        require(
            msg_sender().unwrap() == storage.admin.read(),
            MarketError::NotAdmin,
        );

        let count = storage.market_count.read();
        require(market_id >= 1 && market_id <= count, MarketError::MarketNotFound);
        require(
            storage.market_resolved.get(market_id).try_read().unwrap_or(false) == false,
            MarketError::MarketResolved,
        );
        require(
            storage.market_cancelled.get(market_id).try_read().unwrap_or(false) == false,
            MarketError::MarketCancelled,
        );

        storage.market_cancelled.insert(market_id, true);

        // Iterate all bettors and refund their net amounts.
        let bc = storage.bettor_count.get(market_id).try_read().unwrap_or(0);
        let mut i: u32 = 0;
        while i < bc {
            let bettor = storage.bettor_at.get((market_id, i)).try_read().unwrap();
            let amount = storage.bet_amount.get((market_id, bettor)).try_read().unwrap_or(0);
            if amount > 0 {
                transfer(bettor, AssetId::base(), amount);
            }
            i += 1;
        }

        log(MarketCancelledEvent {
            market_id,
            refunded_count: bc,
        });
    }

    // ─── Claim ──────────────────────────────────────────────────────────────

    /// Claim rewards for a resolved market.
    /// Winners receive proportional ETH payout from the total pool.
    /// All participants (winners + losers) receive leaderboard points and
    /// IPREDICT tokens via inter-contract calls.
    #[storage(read, write)]
    fn claim(market_id: u64) {
        require(storage.initialized.read(), MarketError::NotInitialized);

        let count = storage.market_count.read();
        require(market_id >= 1 && market_id <= count, MarketError::MarketNotFound);
        require(
            storage.market_resolved.get(market_id).try_read().unwrap_or(false),
            MarketError::MarketNotResolved,
        );
        require(
            storage.market_cancelled.get(market_id).try_read().unwrap_or(false) == false,
            MarketError::MarketCancelled,
        );

        let user = msg_sender().unwrap();
        let key = (market_id, user);

        // User must have a bet.
        require(
            storage.bet_exists.get(key).try_read().unwrap_or(false),
            MarketError::NoBetFound,
        );
        // Must not have already claimed.
        require(
            storage.bet_claimed.get(key).try_read().unwrap_or(false) == false,
            MarketError::AlreadyClaimed,
        );

        // Mark as claimed.
        storage.bet_claimed.insert(key, true);

        let user_amount = storage.bet_amount.get(key).try_read().unwrap_or(0);
        let user_side = storage.bet_is_yes.get(key).try_read().unwrap_or(false);
        let outcome = storage.market_outcome.get(market_id).try_read().unwrap_or(false);
        let total_yes = storage.market_total_yes.get(market_id).try_read().unwrap_or(0);
        let total_no = storage.market_total_no.get(market_id).try_read().unwrap_or(0);
        let total_pool = total_yes + total_no;

        let is_winner = user_side == outcome;

        // ── ETH payout (winners only) ───────────────────────────────────────
        let mut payout: u64 = 0;
        if is_winner && total_pool > 0 {
            let winning_total = if outcome { total_yes } else { total_no };
            if winning_total > 0 {
                // Proportional payout: (user_amount / winning_total) × total_pool
                // Use u256 for intermediate multiplication to avoid overflow.
                let user_u256 = asm(r1: user_amount) { r1: u256 };
                let pool_u256 = asm(r1: total_pool) { r1: u256 };
                let win_u256 = asm(r1: winning_total) { r1: u256 };
                let payout_u256 = (user_u256 * pool_u256) / win_u256;
                // Truncate back to u64 (safe since payout ≤ total_pool ≤ u64 max).
                payout = asm(r1: payout_u256) { r1: u64 };
            }
        }

        if payout > 0 {
            transfer(user, AssetId::base(), payout);
        }

        // ── Read linked contract IDs BEFORE external calls (CEI) ────────
        let leaderboard_id = storage.leaderboard_contract.read();
        let token_id = storage.token_contract.read();

        // ── Leaderboard points ──────────────────────────────────────────────
        let points = if is_winner { WIN_POINTS } else { LOSE_POINTS };
        let leaderboard = abi(LeaderboardAbi, leaderboard_id.bits());
        leaderboard.add_pts(user, points, is_winner);

        // ── IPREDICT token rewards ──────────────────────────────────────────
        let tokens = if is_winner { WIN_TOKENS } else { LOSE_TOKENS };
        let token = abi(IPredictTokenAbi, token_id.bits());
        token.mint(user, tokens);

        log(RewardClaimedEvent {
            market_id,
            user,
            is_winner,
            payout,
            points,
            tokens,
        });
    }

    // ─── Admin: Withdraw Fees ───────────────────────────────────────────────

    /// Transfer all accumulated platform fees to the admin. Admin only.
    #[storage(read, write)]
    fn withdraw_fees() -> u64 {
        require(storage.initialized.read(), MarketError::NotInitialized);
        let admin = storage.admin.read();
        require(
            msg_sender().unwrap() == admin,
            MarketError::NotAdmin,
        );

        let fees = storage.accumulated_fees.read();
        require(fees > 0, MarketError::NoFeesToWithdraw);

        storage.accumulated_fees.write(0);
        transfer(admin, AssetId::base(), fees);

        log(FeesWithdrawnEvent {
            admin,
            amount: fees,
        });

        fees
    }

    // ─── View Functions ─────────────────────────────────────────────────────

    /// Return the full Market struct for the given ID.
    #[storage(read)]
    fn get_market(market_id: u64) -> Market {
        let count = storage.market_count.read();
        require(market_id >= 1 && market_id <= count, MarketError::MarketNotFound);

        Market {
            id: market_id,
            question: storage.market_question.get(market_id).read_slice().unwrap_or(String::new()),
            image_url: storage.market_image_url.get(market_id).read_slice().unwrap_or(String::new()),
            end_time: storage.market_end_time.get(market_id).try_read().unwrap_or(0),
            total_yes: storage.market_total_yes.get(market_id).try_read().unwrap_or(0),
            total_no: storage.market_total_no.get(market_id).try_read().unwrap_or(0),
            resolved: storage.market_resolved.get(market_id).try_read().unwrap_or(false),
            outcome: storage.market_outcome.get(market_id).try_read().unwrap_or(false),
            cancelled: storage.market_cancelled.get(market_id).try_read().unwrap_or(false),
            creator: storage.market_creator.get(market_id).try_read().unwrap_or(Identity::Address(Address::zero())),
            bet_count: storage.market_bet_count.get(market_id).try_read().unwrap_or(0),
        }
    }

    /// Return the Bet struct for a user on a given market.
    #[storage(read)]
    fn get_bet(market_id: u64, user: Identity) -> Bet {
        let key = (market_id, user);
        Bet {
            amount: storage.bet_amount.get(key).try_read().unwrap_or(0),
            is_yes: storage.bet_is_yes.get(key).try_read().unwrap_or(false),
            claimed: storage.bet_claimed.get(key).try_read().unwrap_or(false),
        }
    }

    /// Return the total number of markets created.
    #[storage(read)]
    fn get_market_count() -> u64 {
        storage.market_count.read()
    }

    /// Return the current YES/NO probability split for a market.
    #[storage(read)]
    fn get_odds(market_id: u64) -> Odds {
        let total_yes = storage.market_total_yes.get(market_id).try_read().unwrap_or(0);
        let total_no = storage.market_total_no.get(market_id).try_read().unwrap_or(0);
        let total = total_yes + total_no;

        if total == 0 {
            return Odds {
                yes_percent: 50,
                no_percent: 50,
            };
        }

        let yes_pct = (total_yes * 100) / total;
        let no_pct = 100 - yes_pct;

        Odds {
            yes_percent: yes_pct.try_as_u32().unwrap(),
            no_percent: no_pct.try_as_u32().unwrap(),
        }
    }

    /// Return the current accumulated platform fees.
    #[storage(read)]
    fn get_accumulated_fees() -> u64 {
        storage.accumulated_fees.read()
    }
}
