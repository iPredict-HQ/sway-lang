// ── Leaderboard Integration Tests ────────────────────────────────────────────
// Uses fuels-rs to deploy and test the Leaderboard contract against a local
// Fuel node. Tests cover: add_pts, add_bonus_pts, record_bet, sorted top-50
// list, stats aggregation, rank calculation, and authorized caller checks.
//
// Note: add_pts/record_bet require `msg_sender() == market_contract`, and
// add_bonus_pts requires `msg_sender() == referral_contract`. Because these
// are ContractId-based checks, a real integration test would deploy proxy
// contracts that forward calls. The tests below cover the view functions
// and authorization rejection paths that can be tested with EOA wallets.
// ─────────────────────────────────────────────────────────────────────────────

use fuels::{
    prelude::*,
    types::Identity,
};

abigen!(Contract(
    name = "Leaderboard",
    abi = "leaderboard/out/debug/leaderboard-abi.json"
));

/// Spin up a local node and deploy the leaderboard contract.
async fn setup() -> (
    Leaderboard<WalletUnlocked>,
    WalletUnlocked,
    WalletUnlocked,
    WalletUnlocked,
) {
    let config = WalletsConfig::new(Some(3), Some(1), Some(1_000_000_000_000));
    let wallets = launch_custom_provider_and_get_wallets(config, None, None)
        .await
        .unwrap();

    let admin = wallets[0].clone();
    let w1 = wallets[1].clone();
    let w2 = wallets[2].clone();

    let contract_id = Contract::load_from(
        "./leaderboard/out/debug/leaderboard.bin",
        LoadConfiguration::default(),
    )
    .unwrap()
    .deploy(&admin, TxPolicies::default())
    .await
    .unwrap();

    let instance = Leaderboard::new(contract_id, admin.clone());

    (instance, admin, w1, w2)
}

// ═════════════════════════════════════════════════════════════════════════════
//  TESTS
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_initialize() {
    let (contract, _admin, _, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let referral_id = ContractId::new([0xBB; 32]);

    contract
        .methods()
        .initialize(market_id, referral_id)
        .call()
        .await
        .unwrap();
}

#[tokio::test]
async fn test_initialize_twice_fails() {
    let (contract, _admin, _, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let referral_id = ContractId::new([0xBB; 32]);

    contract
        .methods()
        .initialize(market_id, referral_id)
        .call()
        .await
        .unwrap();

    let result = contract
        .methods()
        .initialize(market_id, referral_id)
        .call()
        .await;

    assert!(result.is_err(), "Double initialize should revert");
}

#[tokio::test]
async fn test_get_points_default_zero() {
    let (contract, _admin, w1, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let referral_id = ContractId::new([0xBB; 32]);
    contract
        .methods()
        .initialize(market_id, referral_id)
        .call()
        .await
        .unwrap();

    let user = Identity::Address(w1.address().into());
    let pts = contract.methods().get_points(user).call().await.unwrap().value;
    assert_eq!(pts, 0u64, "Default points should be 0");
}

#[tokio::test]
async fn test_get_stats_default() {
    let (contract, _admin, w1, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let referral_id = ContractId::new([0xBB; 32]);
    contract
        .methods()
        .initialize(market_id, referral_id)
        .call()
        .await
        .unwrap();

    let user = Identity::Address(w1.address().into());
    let stats = contract.methods().get_stats(user).call().await.unwrap().value;
    assert_eq!(stats.points, 0u64);
    assert_eq!(stats.total_bets, 0u32);
    assert_eq!(stats.won_bets, 0u32);
    assert_eq!(stats.lost_bets, 0u32);
}

#[tokio::test]
async fn test_get_top_players_empty() {
    let (contract, _admin, _, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let referral_id = ContractId::new([0xBB; 32]);
    contract
        .methods()
        .initialize(market_id, referral_id)
        .call()
        .await
        .unwrap();

    let top = contract
        .methods()
        .get_top_players(10u32)
        .call()
        .await
        .unwrap()
        .value;

    assert!(top.is_empty(), "Should return empty list before any activity");
}

#[tokio::test]
async fn test_get_rank_not_ranked() {
    let (contract, _admin, w1, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let referral_id = ContractId::new([0xBB; 32]);
    contract
        .methods()
        .initialize(market_id, referral_id)
        .call()
        .await
        .unwrap();

    let user = Identity::Address(w1.address().into());
    let rank = contract.methods().get_rank(user).call().await.unwrap().value;
    assert_eq!(rank, 0u32, "Unranked user should return 0");
}

#[tokio::test]
async fn test_add_pts_unauthorized_eoa() {
    let (contract, _admin, w1, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let referral_id = ContractId::new([0xBB; 32]);
    contract
        .methods()
        .initialize(market_id, referral_id)
        .call()
        .await
        .unwrap();

    // An EOA wallet trying to call add_pts should fail (not the market contract).
    let user = Identity::Address(w1.address().into());
    let result = contract
        .methods()
        .add_pts(user, 10u64, true)
        .call()
        .await;

    assert!(result.is_err(), "EOA should not be able to call add_pts");
}

#[tokio::test]
async fn test_add_bonus_pts_unauthorized_eoa() {
    let (contract, _admin, w1, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let referral_id = ContractId::new([0xBB; 32]);
    contract
        .methods()
        .initialize(market_id, referral_id)
        .call()
        .await
        .unwrap();

    let user = Identity::Address(w1.address().into());
    let result = contract
        .methods()
        .add_bonus_pts(user, 5u64)
        .call()
        .await;

    assert!(
        result.is_err(),
        "EOA should not be able to call add_bonus_pts"
    );
}

#[tokio::test]
async fn test_record_bet_unauthorized_eoa() {
    let (contract, _admin, w1, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let referral_id = ContractId::new([0xBB; 32]);
    contract
        .methods()
        .initialize(market_id, referral_id)
        .call()
        .await
        .unwrap();

    let user = Identity::Address(w1.address().into());
    let result = contract
        .methods()
        .record_bet(user)
        .call()
        .await;

    assert!(
        result.is_err(),
        "EOA should not be able to call record_bet"
    );
}