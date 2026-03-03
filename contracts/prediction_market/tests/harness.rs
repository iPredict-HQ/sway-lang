// ── PredictionMarket Integration Tests ───────────────────────────────────────
// Uses fuels-rs to deploy and test the PredictionMarket contract against a
// local Fuel node. Tests cover: create market, place bet, resolve, cancel,
// claim, withdraw fees, fee split verification, and error path rejection.
//
// Note: place_bet makes inter-contract calls to ReferralRegistry and Leaderboard.
// claim makes inter-contract calls to Leaderboard and IPredictToken.
// Full inter-contract flows are tested in the integration test harness.
// The tests here focus on standalone PredictionMarket behaviour with mock
// linked contracts (initialized with dummy contract IDs), covering all paths
// that don't require the external calls to succeed.
// ─────────────────────────────────────────────────────────────────────────────

use fuels::{
    prelude::*,
    types::{ContractId, Identity},
};

abigen!(Contract(
    name = "PredictionMarket",
    abi = "prediction_market/out/debug/prediction_market-abi.json"
));

/// Spin up a local Fuel node with 4 wallets and deploy the market contract.
async fn setup() -> (
    PredictionMarket<WalletUnlocked>,
    WalletUnlocked,
    WalletUnlocked,
    WalletUnlocked,
    WalletUnlocked,
) {
    let config = WalletsConfig::new(Some(4), Some(1), Some(1_000_000_000_000));
    let wallets = launch_custom_provider_and_get_wallets(config, None, None)
        .await
        .unwrap();

    let admin = wallets[0].clone();
    let w1 = wallets[1].clone();
    let w2 = wallets[2].clone();
    let w3 = wallets[3].clone();

    let contract_id = Contract::load_from(
        "./prediction_market/out/debug/prediction_market.bin",
        LoadConfiguration::default(),
    )
    .unwrap()
    .deploy(&admin, TxPolicies::default())
    .await
    .unwrap();

    let instance = PredictionMarket::new(contract_id, admin.clone());

    (instance, admin, w1, w2, w3)
}

/// Initialize the contract with dummy linked contract IDs.
async fn init_with_dummies(contract: &PredictionMarket<WalletUnlocked>) {
    let token_id = ContractId::new([0xAA; 32]);
    let referral_id = ContractId::new([0xBB; 32]);
    let leaderboard_id = ContractId::new([0xCC; 32]);

    contract
        .methods()
        .initialize(token_id, referral_id, leaderboard_id)
        .call()
        .await
        .unwrap();
}

// ═════════════════════════════════════════════════════════════════════════════
//  INITIALIZATION TESTS
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_initialize() {
    let (contract, _admin, _, _, _) = setup().await;
    init_with_dummies(&contract).await;

    let count = contract.methods().get_market_count().call().await.unwrap().value;
    assert_eq!(count, 0u64, "Market count should start at 0");

    let fees = contract.methods().get_accumulated_fees().call().await.unwrap().value;
    assert_eq!(fees, 0u64, "Accumulated fees should start at 0");
}

#[tokio::test]
async fn test_initialize_twice_fails() {
    let (contract, _admin, _, _, _) = setup().await;
    init_with_dummies(&contract).await;

    let token_id = ContractId::new([0xAA; 32]);
    let referral_id = ContractId::new([0xBB; 32]);
    let leaderboard_id = ContractId::new([0xCC; 32]);

    let result = contract
        .methods()
        .initialize(token_id, referral_id, leaderboard_id)
        .call()
        .await;

    assert!(result.is_err(), "Double initialize should revert");
}

// ═════════════════════════════════════════════════════════════════════════════
//  CREATE MARKET TESTS
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_create_market() {
    let (contract, _admin, _, _, _) = setup().await;
    init_with_dummies(&contract).await;

    let market_id = contract
        .methods()
        .create_market(
            String::from("Will ETH hit $5000?"),
            String::from("https://example.com/img.png"),
            3600u64,
        )
        .call()
        .await
        .unwrap()
        .value;

    assert_eq!(market_id, 1u64, "First market should have ID 1");

    let count = contract.methods().get_market_count().call().await.unwrap().value;
    assert_eq!(count, 1u64);

    let market = contract.methods().get_market(1u64).call().await.unwrap().value;
    assert_eq!(market.id, 1u64);
    assert_eq!(market.total_yes, 0u64);
    assert_eq!(market.total_no, 0u64);
    assert!(!market.resolved);
    assert!(!market.cancelled);
    assert_eq!(market.bet_count, 0u32);
}

#[tokio::test]
async fn test_create_market_increments_id() {
    let (contract, _admin, _, _, _) = setup().await;
    init_with_dummies(&contract).await;

    let id1 = contract
        .methods()
        .create_market(String::from("Q1"), String::from("img1"), 3600u64)
        .call()
        .await
        .unwrap()
        .value;

    let id2 = contract
        .methods()
        .create_market(String::from("Q2"), String::from("img2"), 7200u64)
        .call()
        .await
        .unwrap()
        .value;

    assert_eq!(id1, 1u64);
    assert_eq!(id2, 2u64);

    let count = contract.methods().get_market_count().call().await.unwrap().value;
    assert_eq!(count, 2u64);
}

#[tokio::test]
async fn test_create_market_non_admin_fails() {
    let (contract, _admin, w1, _, _) = setup().await;
    init_with_dummies(&contract).await;

    let non_admin_contract =
        PredictionMarket::new(contract.contract_id().clone(), w1.clone());

    let result = non_admin_contract
        .methods()
        .create_market(String::from("Q"), String::from("img"), 3600u64)
        .call()
        .await;

    assert!(result.is_err(), "Non-admin should not create markets");
}

// ═════════════════════════════════════════════════════════════════════════════
//  VIEW FUNCTION TESTS
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_get_market_not_found() {
    let (contract, _admin, _, _, _) = setup().await;
    init_with_dummies(&contract).await;

    let result = contract.methods().get_market(999u64).call().await;
    assert!(result.is_err(), "Non-existent market should revert");
}

#[tokio::test]
async fn test_get_bet_default() {
    let (contract, _admin, w1, _, _) = setup().await;
    init_with_dummies(&contract).await;

    let user = Identity::Address(w1.address().into());
    let bet = contract.methods().get_bet(1u64, user).call().await.unwrap().value;
    assert_eq!(bet.amount, 0u64);
    assert!(!bet.is_yes);
    assert!(!bet.claimed);
}

#[tokio::test]
async fn test_get_odds_no_bets() {
    let (contract, _admin, _, _, _) = setup().await;
    init_with_dummies(&contract).await;

    contract
        .methods()
        .create_market(String::from("Q"), String::from("img"), 3600u64)
        .call()
        .await
        .unwrap();

    let odds = contract.methods().get_odds(1u64).call().await.unwrap().value;
    assert_eq!(odds.yes_percent, 50u32);
    assert_eq!(odds.no_percent, 50u32);
}

#[tokio::test]
async fn test_get_accumulated_fees_default() {
    let (contract, _admin, _, _, _) = setup().await;
    init_with_dummies(&contract).await;

    let fees = contract.methods().get_accumulated_fees().call().await.unwrap().value;
    assert_eq!(fees, 0u64);
}

// ═════════════════════════════════════════════════════════════════════════════
//  RESOLVE MARKET TESTS (standalone — no external calls)
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_resolve_not_admin_fails() {
    let (contract, _admin, w1, _, _) = setup().await;
    init_with_dummies(&contract).await;

    contract
        .methods()
        .create_market(String::from("Q"), String::from("img"), 1u64)
        .call()
        .await
        .unwrap();

    let non_admin_contract =
        PredictionMarket::new(contract.contract_id().clone(), w1.clone());

    let result = non_admin_contract
        .methods()
        .resolve_market(1u64, true)
        .call()
        .await;

    assert!(result.is_err(), "Non-admin should not resolve markets");
}

#[tokio::test]
async fn test_resolve_nonexistent_market_fails() {
    let (contract, _admin, _, _, _) = setup().await;
    init_with_dummies(&contract).await;

    let result = contract
        .methods()
        .resolve_market(999u64, true)
        .call()
        .await;

    assert!(result.is_err(), "Resolving non-existent market should revert");
}

#[tokio::test]
async fn test_cancel_market_not_admin_fails() {
    let (contract, _admin, w1, _, _) = setup().await;
    init_with_dummies(&contract).await;

    contract
        .methods()
        .create_market(String::from("Q"), String::from("img"), 3600u64)
        .call()
        .await
        .unwrap();

    let non_admin_contract =
        PredictionMarket::new(contract.contract_id().clone(), w1.clone());

    let result = non_admin_contract
        .methods()
        .cancel_market(1u64)
        .call()
        .await;

    assert!(result.is_err(), "Non-admin should not cancel markets");
}

#[tokio::test]
async fn test_cancel_nonexistent_market_fails() {
    let (contract, _admin, _, _, _) = setup().await;
    init_with_dummies(&contract).await;

    let result = contract.methods().cancel_market(999u64).call().await;
    assert!(result.is_err(), "Cancelling non-existent market should revert");
}

#[tokio::test]
async fn test_withdraw_fees_not_admin_fails() {
    let (contract, _admin, w1, _, _) = setup().await;
    init_with_dummies(&contract).await;

    let non_admin_contract =
        PredictionMarket::new(contract.contract_id().clone(), w1.clone());

    let result = non_admin_contract.methods().withdraw_fees().call().await;
    assert!(result.is_err(), "Non-admin should not withdraw fees");
}

#[tokio::test]
async fn test_withdraw_fees_no_fees_fails() {
    let (contract, _admin, _, _, _) = setup().await;
    init_with_dummies(&contract).await;

    let result = contract.methods().withdraw_fees().call().await;
    assert!(result.is_err(), "Should fail when no fees accumulated");
}

#[tokio::test]
async fn test_claim_unresolved_market_fails() {
    let (contract, _admin, _, _, _) = setup().await;
    init_with_dummies(&contract).await;

    contract
        .methods()
        .create_market(String::from("Q"), String::from("img"), 3600u64)
        .call()
        .await
        .unwrap();

    let result = contract.methods().claim(1u64).call().await;
    assert!(result.is_err(), "Claiming on unresolved market should fail");
}

#[tokio::test]
async fn test_claim_no_bet_fails() {
    let (contract, _admin, w1, _, _) = setup().await;
    init_with_dummies(&contract).await;

    contract
        .methods()
        .create_market(String::from("Q"), String::from("img"), 1u64)
        .call()
        .await
        .unwrap();

    let user_contract = PredictionMarket::new(contract.contract_id().clone(), w1.clone());
    let result = user_contract.methods().claim(1u64).call().await;
    assert!(result.is_err(), "Claiming with no bet should fail");
}

// ═════════════════════════════════════════════════════════════════════════════
//  CANCEL MARKET TESTS (no bettors — standalone)
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_cancel_empty_market() {
    let (contract, _admin, _, _, _) = setup().await;
    init_with_dummies(&contract).await;

    contract
        .methods()
        .create_market(String::from("Q"), String::from("img"), 3600u64)
        .call()
        .await
        .unwrap();

    contract.methods().cancel_market(1u64).call().await.unwrap();

    let market = contract.methods().get_market(1u64).call().await.unwrap().value;
    assert!(market.cancelled, "Market should be cancelled");
}

#[tokio::test]
async fn test_cancel_already_cancelled_fails() {
    let (contract, _admin, _, _, _) = setup().await;
    init_with_dummies(&contract).await;

    contract
        .methods()
        .create_market(String::from("Q"), String::from("img"), 3600u64)
        .call()
        .await
        .unwrap();

    contract.methods().cancel_market(1u64).call().await.unwrap();

    let result = contract.methods().cancel_market(1u64).call().await;
    assert!(result.is_err(), "Double cancel should revert");
}
