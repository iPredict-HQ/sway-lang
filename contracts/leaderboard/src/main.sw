contract;

// ── Leaderboard Contract ─────────────────────────────────────────────────────
// Onchain points tracking, bet statistics (total/won/lost), and a sorted
// top-50 player ranking list.
//
// Authorization:
//   • add_pts, record_bet  — only callable by the PredictionMarket contract
//   • add_bonus_pts        — only callable by the ReferralRegistry contract
//   • initialize           — one-time setup by deployer (becomes admin)
// ─────────────────────────────────────────────────────────────────────────────

use std::{
    auth::msg_sender,
    hash::Hash,
    logging::log,
    string::String,
    storage::storage_map::*,
    storage::storage_vec::*,
};
use libraries::*;

// ═══════════════════════════════════════════════════════════════════════════════
//  STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

storage {
    /// Whether `initialize` has been called.
    initialized: bool = false,
    /// Admin identity (the deployer who called initialize).
    admin: Identity = Identity::Address(Address::zero()),
    /// ContractId of the PredictionMarket contract (authorized for add_pts, record_bet).
    market_contract: ContractId = ContractId::zero(),
    /// ContractId of the ReferralRegistry contract (authorized for add_bonus_pts).
    referral_contract: ContractId = ContractId::zero(),

    // ── Per-player stats ─────────────────────────────────────────────────────
    points: StorageMap<Identity, u64> = StorageMap {},
    total_bets: StorageMap<Identity, u32> = StorageMap {},
    won_bets: StorageMap<Identity, u32> = StorageMap {},
    lost_bets: StorageMap<Identity, u32> = StorageMap {},

    // ── Sorted top-N leaderboard ─────────────────────────────────────────────
    // Stored as parallel StorageVecs: addresses[i] ↔ scores[i].
    // Maintained in descending order by score. Capped at MAX_TOP_PLAYERS (50).
    top_addresses: StorageVec<Identity> = StorageVec {},
    top_scores: StorageVec<u64> = StorageVec {},
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ABI DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

abi Leaderboard {
    // -- Lifecycle --
    #[storage(read, write)]
    fn initialize(market_contract: ContractId, referral_contract: ContractId);

    // -- Write Functions (authorized callers only) --
    #[storage(read, write)]
    fn add_pts(user: Identity, points: u64, is_winner: bool);

    #[storage(read, write)]
    fn add_bonus_pts(user: Identity, points: u64);

    #[storage(read, write)]
    fn record_bet(user: Identity);

    // -- View Functions --
    #[storage(read)]
    fn get_points(user: Identity) -> u64;

    #[storage(read)]
    fn get_stats(user: Identity) -> PlayerStats;

    #[storage(read)]
    fn get_top_players(limit: u32) -> Vec<PlayerEntry>;

    #[storage(read)]
    fn get_rank(user: Identity) -> u32;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

impl Leaderboard for Contract {
    // ─── Lifecycle ───────────────────────────────────────────────────────────

    /// One-time initialization. Caller becomes admin.
    #[storage(read, write)]
    fn initialize(market_contract: ContractId, referral_contract: ContractId) {
        require(
            storage.initialized.read() == false,
            LeaderboardError::AlreadyInitialized,
        );

        storage.initialized.write(true);
        storage.admin.write(msg_sender().unwrap());
        storage.market_contract.write(market_contract);
        storage.referral_contract.write(referral_contract);
    }

    // ─── Write Functions ─────────────────────────────────────────────────────

    /// Award `points` to `user` and update win/loss counters.
    /// Called by the PredictionMarket contract at claim time.
    #[storage(read, write)]
    fn add_pts(user: Identity, points: u64, is_winner: bool) {
        require(storage.initialized.read(), LeaderboardError::NotInitialized);
        require(points > 0, LeaderboardError::InvalidPoints);

        // Authorization: only the market contract may call this.
        let sender = msg_sender().unwrap();
        require(
            sender == Identity::ContractId(storage.market_contract.read()),
            LeaderboardError::UnauthorizedCaller,
        );

        // Accumulate points.
        let current_pts = storage.points.get(user).try_read().unwrap_or(0);
        let new_pts = current_pts + points;
        storage.points.insert(user, new_pts);

        // Update win / loss counters.
        if is_winner {
            let w = storage.won_bets.get(user).try_read().unwrap_or(0);
            storage.won_bets.insert(user, w + 1);
        } else {
            let l = storage.lost_bets.get(user).try_read().unwrap_or(0);
            storage.lost_bets.insert(user, l + 1);
        }

        // Maintain sorted top-N list.
        upsert_top_list(user, new_pts);

        log(PointsAwardedEvent {
            user,
            points,
            is_winner,
        });
    }

    /// Award bonus `points` without touching win/loss counters.
    /// Called by the ReferralRegistry for welcome-bonus and referral rewards.
    #[storage(read, write)]
    fn add_bonus_pts(user: Identity, points: u64) {
        require(storage.initialized.read(), LeaderboardError::NotInitialized);
        require(points > 0, LeaderboardError::InvalidPoints);

        // Authorization: only the referral contract may call this.
        let sender = msg_sender().unwrap();
        require(
            sender == Identity::ContractId(storage.referral_contract.read()),
            LeaderboardError::UnauthorizedCaller,
        );

        let current_pts = storage.points.get(user).try_read().unwrap_or(0);
        let new_pts = current_pts + points;
        storage.points.insert(user, new_pts);

        // Update sorted top-N list.
        upsert_top_list(user, new_pts);

        log(PointsAwardedEvent {
            user,
            points,
            is_winner: false,
        });
    }

    /// Increment the user's total-bets counter.
    /// Called by the PredictionMarket contract on every `place_bet`.
    #[storage(read, write)]
    fn record_bet(user: Identity) {
        require(storage.initialized.read(), LeaderboardError::NotInitialized);

        // Authorization: only the market contract may call this.
        let sender = msg_sender().unwrap();
        require(
            sender == Identity::ContractId(storage.market_contract.read()),
            LeaderboardError::UnauthorizedCaller,
        );

        let current = storage.total_bets.get(user).try_read().unwrap_or(0);
        storage.total_bets.insert(user, current + 1);
    }

    // ─── View Functions ─────────────────────────────────────────────────────

    /// Return cumulative leaderboard points for `user`.
    #[storage(read)]
    fn get_points(user: Identity) -> u64 {
        storage.points.get(user).try_read().unwrap_or(0)
    }

    /// Return full aggregate stats for `user`.
    #[storage(read)]
    fn get_stats(user: Identity) -> PlayerStats {
        PlayerStats {
            points: storage.points.get(user).try_read().unwrap_or(0),
            total_bets: storage.total_bets.get(user).try_read().unwrap_or(0),
            won_bets: storage.won_bets.get(user).try_read().unwrap_or(0),
            lost_bets: storage.lost_bets.get(user).try_read().unwrap_or(0),
        }
    }

    /// Return the top `limit` players sorted by points descending.
    /// If `limit` exceeds the stored count, returns all stored entries.
    #[storage(read)]
    fn get_top_players(limit: u32) -> Vec<PlayerEntry> {
        let len = storage.top_addresses.len();
        let limit_u64: u64 = limit.as_u64();
        let mut count: u64 = if limit_u64 > len { len } else { limit_u64 };

        let mut result: Vec<PlayerEntry> = Vec::new();
        let mut i: u64 = 0;
        while i < count {
            let addr = storage.top_addresses.get(i).unwrap().read();
            let score = storage.top_scores.get(i).unwrap().read();
            result.push(PlayerEntry {
                address: addr,
                points: score,
            });
            i += 1;
        }
        result
    }

    /// Return the 1-based rank of `user` in the sorted leaderboard.
    /// Returns 0 if the user is not in the top-N list.
    #[storage(read)]
    fn get_rank(user: Identity) -> u32 {
        let len = storage.top_addresses.len();
        let mut i: u64 = 0;
        while i < len {
            let addr = storage.top_addresses.get(i).unwrap().read();
            if addr == user {
                // 1-based rank: i is 0-based.
                let rank: u32 = (i + 1).try_as_u32().unwrap();
                return rank;
            }
            i += 1;
        }
        0u32
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Insert or update `user` in the sorted top-N list.
/// • If the user already appears, remove the old entry first.
/// • Find the correct insertion position (descending by `new_pts`).
/// • Insert, then trim to `MAX_TOP_PLAYERS`.
#[storage(read, write)]
fn upsert_top_list(user: Identity, new_pts: u64) {
    let len = storage.top_addresses.len();

    // ── Step 1: remove existing entry (if any) ──────────────────────────
    let mut existing_idx: u64 = len; // sentinel = "not found"
    let mut j: u64 = 0;
    while j < len {
        let addr = storage.top_addresses.get(j).unwrap().read();
        if addr == user {
            existing_idx = j;
            break;
        }
        j += 1;
    }

    if existing_idx < len {
        remove_at(existing_idx);
    }

    // ── Step 2: find insertion position (descending order) ──────────────
    let new_len = storage.top_addresses.len();
    let mut insert_pos: u64 = new_len; // default: append at end
    let mut k: u64 = 0;
    while k < new_len {
        let score = storage.top_scores.get(k).unwrap().read();
        if new_pts > score {
            insert_pos = k;
            break;
        }
        k += 1;
    }

    // ── Step 3: insert at position ──────────────────────────────────────
    insert_at(insert_pos, user, new_pts);

    // ── Step 4: trim to MAX_TOP_PLAYERS ─────────────────────────────────
    while storage.top_addresses.len() > MAX_TOP_PLAYERS {
        let last = storage.top_addresses.len() - 1;
        storage.top_addresses.remove(last);
        storage.top_scores.remove(last);
    }
}

/// Remove the element at `index` by shifting all subsequent elements left.
#[storage(read, write)]
fn remove_at(index: u64) {
    let len = storage.top_addresses.len();
    let mut i = index;
    while i + 1 < len {
        let next_addr = storage.top_addresses.get(i + 1).unwrap().read();
        let next_score = storage.top_scores.get(i + 1).unwrap().read();
        storage.top_addresses.set(i, next_addr);
        storage.top_scores.set(i, next_score);
        i += 1;
    }
    // Pop the last (now duplicated) element.
    let last = len - 1;
    storage.top_addresses.remove(last);
    storage.top_scores.remove(last);
}

/// Insert `user` / `pts` at `index`, shifting subsequent elements right.
#[storage(read, write)]
fn insert_at(index: u64, user: Identity, pts: u64) {
    // Push a placeholder at the end to grow the vec.
    storage.top_addresses.push(Identity::Address(Address::zero()));
    storage.top_scores.push(0u64);

    let new_len = storage.top_addresses.len();
    // Shift right from the end.
    let mut i = new_len - 1;
    while i > index {
        let prev_addr = storage.top_addresses.get(i - 1).unwrap().read();
        let prev_score = storage.top_scores.get(i - 1).unwrap().read();
        storage.top_addresses.set(i, prev_addr);
        storage.top_scores.set(i, prev_score);
        i -= 1;
    }
    // Place the new entry.
    storage.top_addresses.set(index, user);
    storage.top_scores.set(index, pts);
}
