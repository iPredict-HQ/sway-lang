library;

// ── iPredict Shared Library ──────────────────────────────────────────────────
// Common types, constants, error enums, and ABI definitions shared across all
// four iPredict contracts on Fuel Network.
//
// This library is imported by every contract via `use libraries::*;`
// ─────────────────────────────────────────────────────────────────────────────

use std::string::String;

// ═══════════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Fee Constants (basis points) ─────────────────────────────────────────────
// A single 2% fee is deducted at bet time and split:
//   • 1.5% (150 bps) → platform revenue (AccumulatedFees)
//   • 0.5% ( 50 bps) → referrer (or platform if no referrer)

/// Total fee in basis points (2%).
pub const TOTAL_FEE_BPS: u64 = 200;
/// Platform portion in basis points (1.5%).
pub const PLATFORM_FEE_BPS: u64 = 150;
/// Referral portion in basis points (0.5%).  Derived: TOTAL - PLATFORM.
pub const REFERRAL_FEE_BPS: u64 = 50;
/// Basis-point denominator (100% = 10 000).
pub const BPS_DENOM: u64 = 10_000;

// ── Betting Constraints ──────────────────────────────────────────────────────

/// Minimum bet amount — 1 ETH expressed in base units.
/// Fuel's native asset uses 9 decimals, so 1 ETH = 1_000_000_000.
pub const MIN_BET: u64 = 1_000_000_000;

// ── Reward Constants ─────────────────────────────────────────────────────────
// Every participant in a resolved market earns rewards, win or lose.

/// Leaderboard points awarded when user's prediction is correct.
pub const WIN_POINTS: u64 = 30;
/// Leaderboard points awarded when user's prediction is wrong.
pub const LOSE_POINTS: u64 = 10;

/// IPREDICT tokens minted to winners on claim (9 decimals → 10 tokens).
pub const WIN_TOKENS: u64 = 10_000_000_000;
/// IPREDICT tokens minted to losers on claim (9 decimals → 2 tokens).
pub const LOSE_TOKENS: u64 = 2_000_000_000;

// ── Referral Constants ───────────────────────────────────────────────────────

/// Leaderboard points awarded on first registration (welcome bonus).
pub const WELCOME_BONUS_POINTS: u64 = 5;
/// IPREDICT tokens minted on first registration (9 decimals → 1 token).
pub const WELCOME_BONUS_TOKENS: u64 = 1_000_000_000;
/// Bonus leaderboard points awarded to the referrer per referred bet.
pub const REFERRAL_BET_POINTS: u64 = 3;

// ── Leaderboard Constants ────────────────────────────────────────────────────

/// Maximum number of players stored in the sorted top-players list.
pub const MAX_TOP_PLAYERS: u64 = 50;

// ═══════════════════════════════════════════════════════════════════════════════
//  DOMAIN STRUCTS
// ═══════════════════════════════════════════════════════════════════════════════

/// A YES/NO prediction market.
///
/// Stored per market ID in the PredictionMarket contract.
/// `total_yes` and `total_no` track *net* amounts (after 2% fee deduction).
pub struct Market {
    /// Auto-incremented market identifier (starts at 1).
    pub id: u64,
    /// The prediction question text (e.g. "Will ETH hit $5 000 by Friday?").
    pub question: String,
    /// URL of the market cover image.
    pub image_url: String,
    /// Unix timestamp (seconds) after which no new bets are accepted.
    pub end_time: u64,
    /// Sum of net YES bet amounts (in base units).
    pub total_yes: u64,
    /// Sum of net NO bet amounts (in base units).
    pub total_no: u64,
    /// Whether the admin has resolved this market.
    pub resolved: bool,
    /// The resolved outcome.  Only meaningful when `resolved == true`.
    /// `true` = YES won, `false` = NO won.
    pub outcome: bool,
    /// Whether the admin has cancelled this market (bettors refunded).
    pub cancelled: bool,
    /// The admin who created this market.
    pub creator: Identity,
    /// Number of unique bettors.
    pub bet_count: u32,
}

/// A single user's bet on one market.
///
/// Key: `(market_id, user_identity)`.  Users may increase their position on the
/// same side; the `amount` field accumulates all net deposits.
pub struct Bet {
    /// Net amount staked (after 2% fee), in base units.
    pub amount: u64,
    /// `true` = bet on YES, `false` = bet on NO.
    pub is_yes: bool,
    /// Whether the user has already claimed rewards for this market.
    pub claimed: bool,
}

/// Current YES / NO probability split for a market.
///
/// Returned by `get_odds()`.  If no bets exist yet both fields are 50.
pub struct Odds {
    /// YES probability expressed as integer percentage (0–100).
    pub yes_percent: u32,
    /// NO probability expressed as integer percentage (0–100).
    pub no_percent: u32,
}

/// One entry in the sorted leaderboard.
pub struct PlayerEntry {
    /// The player's wallet / contract identity.
    pub address: Identity,
    /// Cumulative leaderboard points.
    pub points: u64,
}

/// Aggregate statistics for a single player.
///
/// Returned by `Leaderboard.get_stats()`.
pub struct PlayerStats {
    /// Cumulative leaderboard points (includes bonus & referral points).
    pub points: u64,
    /// Total number of bets placed across all markets.
    pub total_bets: u32,
    /// Markets where the user's prediction was correct.
    pub won_bets: u32,
    /// Markets where the user's prediction was wrong.
    pub lost_bets: u32,
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ERROR ENUMS
// ═══════════════════════════════════════════════════════════════════════════════
//
// Usage pattern in contracts:
//   require(condition, MarketError::SomeVariant);
// This reverts the transaction and logs the enum variant for diagnostics.

/// Errors raised by the **PredictionMarket** contract.
pub enum MarketError {
    /// `initialize` called more than once.
    AlreadyInitialized: (),
    /// Contract has not been initialized yet.
    NotInitialized: (),
    /// Caller is not the admin.
    NotAdmin: (),
    /// No market exists for the given ID.
    MarketNotFound: (),
    /// Betting period has ended (timestamp >= end_time).
    MarketExpired: (),
    /// Market has not yet passed its deadline (for resolve).
    MarketNotExpired: (),
    /// Market has already been resolved.
    MarketResolved: (),
    /// Market has been cancelled.
    MarketCancelled: (),
    /// Market has not been resolved yet (for claim).
    MarketNotResolved: (),
    /// Bet amount is below the minimum (1 ETH).
    BetTooSmall: (),
    /// User tried to bet on the opposite side of an existing position.
    OppositeSideBet: (),
    /// User already claimed rewards for this market.
    AlreadyClaimed: (),
    /// User has no bet on this market.
    NoBetFound: (),
    /// Generic invalid amount (e.g. zero).
    InvalidAmount: (),
    /// No accumulated platform fees to withdraw.
    NoFeesToWithdraw: (),
}

/// Errors raised by the **IPredictToken** contract.
pub enum TokenError {
    /// `initialize` called more than once.
    AlreadyInitialized: (),
    /// Contract has not been initialized yet.
    NotInitialized: (),
    /// Caller is not in the authorized minters set.
    UnauthorizedMinter: (),
    /// Sender does not have enough tokens for transfer / burn.
    InsufficientBalance: (),
    /// Amount must be greater than zero.
    InvalidAmount: (),
    /// Caller is not the admin.
    NotAdmin: (),
}

/// Errors raised by the **ReferralRegistry** contract.
pub enum ReferralError {
    /// `initialize` called more than once.
    AlreadyInitialized: (),
    /// Contract has not been initialized yet.
    NotInitialized: (),
    /// Caller is not the authorized market contract.
    UnauthorizedCaller: (),
    /// User has already registered.
    AlreadyRegistered: (),
    /// A user cannot be their own referrer.
    SelfReferral: (),
}

/// Errors raised by the **Leaderboard** contract.
pub enum LeaderboardError {
    /// `initialize` called more than once.
    AlreadyInitialized: (),
    /// Contract has not been initialized yet.
    NotInitialized: (),
    /// Caller is not an authorized contract (Market or Referral).
    UnauthorizedCaller: (),
    /// Points value must be greater than zero.
    InvalidPoints: (),
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EVENT STRUCTS
// ═══════════════════════════════════════════════════════════════════════════════
//
// Contracts emit events via `log(EventStruct { ... })`.
// The frontend reads these from transaction receipts.

/// Emitted when a new market is created.
pub struct MarketCreatedEvent {
    pub market_id: u64,
    pub question: String,
    pub end_time: u64,
    pub creator: Identity,
}

/// Emitted when a bet is placed (or an existing position is increased).
pub struct BetPlacedEvent {
    pub market_id: u64,
    pub user: Identity,
    pub is_yes: bool,
    /// Gross amount sent by the user (before fee).
    pub amount: u64,
    /// Net amount added to the pool (after 2% fee).
    pub net_amount: u64,
    /// Total fee deducted.
    pub fee: u64,
    /// `true` if this is an increase of an existing same-side position.
    pub is_increase: bool,
}

/// Emitted when a market is resolved.
pub struct MarketResolvedEvent {
    pub market_id: u64,
    /// `true` = YES won, `false` = NO won.
    pub outcome: bool,
}

/// Emitted when a market is cancelled and bettors are refunded.
pub struct MarketCancelledEvent {
    pub market_id: u64,
    pub refunded_count: u32,
}

/// Emitted when a user claims rewards (winner or loser).
pub struct RewardClaimedEvent {
    pub market_id: u64,
    pub user: Identity,
    pub is_winner: bool,
    /// ETH payout amount (0 for losers).
    pub payout: u64,
    /// Leaderboard points awarded.
    pub points: u64,
    /// IPREDICT tokens minted.
    pub tokens: u64,
}

/// Emitted when the admin withdraws accumulated platform fees.
pub struct FeesWithdrawnEvent {
    pub admin: Identity,
    pub amount: u64,
}

/// Emitted when a referral fee is credited to a referrer.
pub struct ReferralCreditedEvent {
    pub user: Identity,
    pub referrer: Identity,
    pub amount: u64,
}

/// Emitted when a user registers (display name + optional referrer).
pub struct ReferralRegisteredEvent {
    pub user: Identity,
    pub display_name: String,
    pub has_referrer: bool,
}

/// Emitted when IPREDICT tokens are minted.
pub struct MintEvent {
    pub to: Identity,
    pub amount: u64,
}

/// Emitted when IPREDICT tokens are transferred.
pub struct TransferEvent {
    pub from: Identity,
    pub to: Identity,
    pub amount: u64,
}

/// Emitted when IPREDICT tokens are burned.
pub struct BurnEvent {
    pub from: Identity,
    pub amount: u64,
}

/// Emitted when leaderboard points are awarded.
pub struct PointsAwardedEvent {
    pub user: Identity,
    pub points: u64,
    pub is_winner: bool,
}

/// Emitted when a minter is authorized or revoked on the token contract.
pub struct MinterChangedEvent {
    pub minter: ContractId,
    pub authorized: bool,
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ABI DEFINITIONS  (for inter-contract calls)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Contracts call each other using Sway's typed `abi()` cast:
//   let token = abi(IPredictTokenAbi, token_contract_id);
//   token.mint(recipient, amount);
//
// Only the functions needed for *cross-contract* interaction are listed here.
// Each contract's full ABI (including view functions) is defined in its own
// `main.sw` file.

/// ABI for **IPredictToken** — called by PredictionMarket (claim) and
/// ReferralRegistry (welcome bonus) to mint reward tokens.
abi IPredictTokenAbi {
    #[storage(read, write)]
    fn mint(to: Identity, amount: u64);
}

/// ABI for **Leaderboard** — called by PredictionMarket (add_pts at claim time,
/// record_bet at bet time) and ReferralRegistry (add_bonus_pts for welcome bonus
/// and referral rewards).
abi LeaderboardAbi {
    /// Award points and update win/loss counters (called at claim time).
    #[storage(read, write)]
    fn add_pts(user: Identity, points: u64, is_winner: bool);

    /// Award bonus points without touching win/loss counters
    /// (used for welcome bonus and referrer bet rewards).
    #[storage(read, write)]
    fn add_bonus_pts(user: Identity, points: u64);

    /// Increment the user's total-bets counter (called at bet time).
    #[storage(read, write)]
    fn record_bet(user: Identity);
}

/// ABI for **ReferralRegistry** — called by PredictionMarket on every bet to
/// route the 0.5% referral fee.  Returns `true` if the user has a referrer
/// (fee transferred to referrer), `false` if not (caller keeps the fee).
abi ReferralRegistryAbi {
    #[storage(read, write)]
    #[payable]
    fn credit(user: Identity, referral_fee: u64) -> bool;
}

