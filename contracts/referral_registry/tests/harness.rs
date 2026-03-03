// ── ReferralRegistry Integration Tests ───────────────────────────────────────
// Uses fuels-rs to deploy and test the ReferralRegistry contract against a
// local Fuel node. Tests cover: register with/without referrer, credit routing,
// welcome bonus inter-contract calls, display name, earnings tracking.
//
// Note: register_referral() makes inter-contract calls to Leaderboard and
// IPredictToken. Full end-to-end flows require deploying all 3 contracts.
// The tests below cover the standalone behaviors that can be tested with
// the ReferralRegistry alone, and authorization rejection paths.
// ─────────────────────────────────────────────────────────────────────────────

use fuels::{
    prelude::*,
    types::Identity,
};

abigen!(Contract(
    name = "ReferralRegistry",
    abi = "referral_registry/out/debug/referral_registry-abi.json"
));

/// Spin up a local node and deploy the referral registry contract.
async fn setup() -> (
    ReferralRegistry<WalletUnlocked>,
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
        "./referral_registry/out/debug/referral_registry.bin",
        LoadConfiguration::default(),
    )
    .unwrap()
    .deploy(&admin, TxPolicies::default())
    .await
    .unwrap();

    let instance = ReferralRegistry::new(contract_id, admin.clone());

    (instance, admin, w1, w2)
}

// ═════════════════════════════════════════════════════════════════════════════
//  TESTS
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_initialize() {
    let (contract, _admin, _, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let token_id = ContractId::new([0xBB; 32]);
    let leaderboard_id = ContractId::new([0xCC; 32]);

    contract
        .methods()
        .initialize(market_id, token_id, leaderboard_id)
        .call()
        .await
        .unwrap();
}

#[tokio::test]
async fn test_initialize_twice_fails() {
    let (contract, _admin, _, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let token_id = ContractId::new([0xBB; 32]);
    let leaderboard_id = ContractId::new([0xCC; 32]);

    contract
        .methods()
        .initialize(market_id, token_id, leaderboard_id)
        .call()
        .await
        .unwrap();

    let result = contract
        .methods()
        .initialize(market_id, token_id, leaderboard_id)
        .call()
        .await;

    assert!(result.is_err(), "Double initialize should revert");
}

#[tokio::test]
async fn test_is_registered_default_false() {
    let (contract, _admin, w1, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let token_id = ContractId::new([0xBB; 32]);
    let leaderboard_id = ContractId::new([0xCC; 32]);
    contract
        .methods()
        .initialize(market_id, token_id, leaderboard_id)
        .call()
        .await
        .unwrap();

    let user = Identity::Address(w1.address().into());
    let registered = contract
        .methods()
        .is_registered(user)
        .call()
        .await
        .unwrap()
        .value;
    assert!(!registered, "Should not be registered by default");
}

#[tokio::test]
async fn test_has_referrer_default_false() {
    let (contract, _admin, w1, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let token_id = ContractId::new([0xBB; 32]);
    let leaderboard_id = ContractId::new([0xCC; 32]);
    contract
        .methods()
        .initialize(market_id, token_id, leaderboard_id)
        .call()
        .await
        .unwrap();

    let user = Identity::Address(w1.address().into());
    let has_ref = contract
        .methods()
        .has_referrer(user)
        .call()
        .await
        .unwrap()
        .value;
    assert!(!has_ref, "Should not have referrer by default");
}

#[tokio::test]
async fn test_get_referral_count_default_zero() {
    let (contract, _admin, w1, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let token_id = ContractId::new([0xBB; 32]);
    let leaderboard_id = ContractId::new([0xCC; 32]);
    contract
        .methods()
        .initialize(market_id, token_id, leaderboard_id)
        .call()
        .await
        .unwrap();

    let user = Identity::Address(w1.address().into());
    let count = contract
        .methods()
        .get_referral_count(user)
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(count, 0u32);
}

#[tokio::test]
async fn test_get_earnings_default_zero() {
    let (contract, _admin, w1, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let token_id = ContractId::new([0xBB; 32]);
    let leaderboard_id = ContractId::new([0xCC; 32]);
    contract
        .methods()
        .initialize(market_id, token_id, leaderboard_id)
        .call()
        .await
        .unwrap();

    let user = Identity::Address(w1.address().into());
    let earnings = contract
        .methods()
        .get_earnings(user)
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(earnings, 0u64);
}

#[tokio::test]
async fn test_get_referrer_default_none() {
    let (contract, _admin, w1, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let token_id = ContractId::new([0xBB; 32]);
    let leaderboard_id = ContractId::new([0xCC; 32]);
    contract
        .methods()
        .initialize(market_id, token_id, leaderboard_id)
        .call()
        .await
        .unwrap();

    let user = Identity::Address(w1.address().into());
    let referrer = contract
        .methods()
        .get_referrer(user)
        .call()
        .await
        .unwrap()
        .value;
    assert!(referrer.is_none(), "Should have no referrer");
}

#[tokio::test]
async fn test_credit_unauthorized_eoa() {
    let (contract, _admin, w1, _) = setup().await;

    let market_id = ContractId::new([0xAA; 32]);
    let token_id = ContractId::new([0xBB; 32]);
    let leaderboard_id = ContractId::new([0xCC; 32]);
    contract
        .methods()
        .initialize(market_id, token_id, leaderboard_id)
        .call()
        .await
        .unwrap();

    // EOA trying to call credit() should fail (only market contract allowed).
    let user = Identity::Address(w1.address().into());
    let result = contract
        .methods()
        .credit(user, 1000u64)
        .call()
        .await;

    assert!(
        result.is_err(),
        "EOA should not be able to call credit"
    );
}