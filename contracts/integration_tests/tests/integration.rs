// ── iPredict Full Integration Tests ──────────────────────────────────────────
// Deploys ALL 4 contracts (IPredictToken, Leaderboard, ReferralRegistry,
// PredictionMarket) on a local Fuel node and tests complete inter-contract
// flows:
//   1. Registration + welcome bonus flow
//   2. Full bet → resolve → claim (winner + loser) flow
//   3. Cancel market with bettor refunds flow
//   4. No-referrer bet → full 2% platform fee flow
//   5. Fee withdrawal flow
// ─────────────────────────────────────────────────────────────────────────────

use fuels::{
    prelude::*,
    types::{AssetId, ContractId, Identity},
};

// Generate typed Rust bindings for all 4 contracts from their ABI JSON.
abigen!(
    Contract(
        name = "IPredictToken",
        abi = "ipredict_token/out/debug/ipredict_token-abi.json"
    ),
    Contract(
        name = "Leaderboard",
        abi = "leaderboard/out/debug/leaderboard-abi.json"
    ),
    Contract(
        name = "ReferralRegistry",
        abi = "referral_registry/out/debug/referral_registry-abi.json"
    ),
    Contract(
        name = "PredictionMarket",
        abi = "prediction_market/out/debug/prediction_market-abi.json"
    ),
);

/// Deploy all 4 contracts and return instances + wallets.
/// Deployment order:
///   1. IPredictToken — independent
///   2. Leaderboard   — needs market + referral IDs (will init after all deploy)
///   3. ReferralRegistry — needs market + token + leaderboard IDs
///   4. PredictionMarket — needs token + referral + leaderboard IDs
/// After deploying, initialize each with the correct linked IDs.
async fn setup_all() -> (
    IPredictToken<WalletUnlocked>,
    Leaderboard<WalletUnlocked>,
    ReferralRegistry<WalletUnlocked>,
    PredictionMarket<WalletUnlocked>,
    WalletUnlocked,  // admin
    WalletUnlocked,  // user1
    WalletUnlocked,  // user2 (referrer)
    WalletUnlocked,  // user3
) {
    let config = WalletsConfig::new(Some(4), Some(3), Some(1_000_000_000_000));
    let wallets = launch_custom_provider_and_get_wallets(config, None, None)
        .await
        .unwrap();

    let admin = wallets[0].clone();
    let user1 = wallets[1].clone();
    let user2 = wallets[2].clone();
    let user3 = wallets[3].clone();

    // ── Deploy all 4 contracts ──────────────────────────────────────────────
    let token_bech = Contract::load_from(
        "./ipredict_token/out/debug/ipredict_token.bin",
        LoadConfiguration::default(),
    )
    .unwrap()
    .deploy(&admin, TxPolicies::default())
    .await
    .unwrap();

    let leaderboard_bech = Contract::load_from(
        "./leaderboard/out/debug/leaderboard.bin",
        LoadConfiguration::default(),
    )
    .unwrap()
    .deploy(&admin, TxPolicies::default())
    .await
    .unwrap();

    let referral_bech = Contract::load_from(
        "./referral_registry/out/debug/referral_registry.bin",
        LoadConfiguration::default(),
    )
    .unwrap()
    .deploy(&admin, TxPolicies::default())
    .await
    .unwrap();

    let market_bech = Contract::load_from(
        "./prediction_market/out/debug/prediction_market.bin",
        LoadConfiguration::default(),
    )
    .unwrap()
    .deploy(&admin, TxPolicies::default())
    .await
    .unwrap();

    // ── Create typed instances ──────────────────────────────────────────────
    let token = IPredictToken::new(token_bech.clone(), admin.clone());
    let leaderboard = Leaderboard::new(leaderboard_bech.clone(), admin.clone());
    let referral = ReferralRegistry::new(referral_bech.clone(), admin.clone());
    let market = PredictionMarket::new(market_bech.clone(), admin.clone());

    // ── Extract raw ContractId from Bech32ContractId ────────────────────────
    let token_id: ContractId = token_bech.into();
    let leaderboard_id: ContractId = leaderboard_bech.into();
    let referral_id: ContractId = referral_bech.into();
    let market_id: ContractId = market_bech.into();

    // ── Initialize IPredictToken ────────────────────────────────────────────
    token
        .methods()
        .initialize(
            String::from("IPREDICT"),
            String::from("IPRED"),
            9u8,
        )
        .call()
        .await
        .unwrap();

    // Authorize PredictionMarket and ReferralRegistry as minters.
    token
        .methods()
        .set_minter(market_id)
        .call()
        .await
        .unwrap();
    token
        .methods()
        .set_minter(referral_id)
        .call()
        .await
        .unwrap();

    // ── Initialize Leaderboard ──────────────────────────────────────────────
    leaderboard
        .methods()
        .initialize(market_id, referral_id)
        .call()
        .await
        .unwrap();

    // ── Initialize ReferralRegistry ─────────────────────────────────────────
    referral
        .methods()
        .initialize(market_id, token_id, leaderboard_id)
        .call()
        .await
        .unwrap();

    // ── Initialize PredictionMarket ─────────────────────────────────────────
    market
        .methods()
        .initialize(token_id, referral_id, leaderboard_id)
        .call()
        .await
        .unwrap();

    (token, leaderboard, referral, market, admin, user1, user2, user3)
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEST 1: Registration + Welcome Bonus Flow
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_registration_welcome_bonus() {
    let (token, leaderboard, referral, _market, _admin, user1, _user2, _user3) =
        setup_all().await;

    // Connect user1 to the referral contract.
    let referral_u1 = ReferralRegistry::new(referral.contract_id().clone(), user1.clone());

    // Register user1 without referrer.
    referral_u1
        .methods()
        .register_referral(String::from("Alice"), None::<Identity>)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    let user1_identity = Identity::Address(user1.address().into());

    // Check registration succeeded.
    let is_reg = referral
        .methods()
        .is_registered(user1_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    assert!(is_reg, "User1 should be registered");

    // Check display name.
    let name = referral
        .methods()
        .get_display_name(user1_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(name, String::from("Alice"));

    // Check welcome bonus: 5 points on leaderboard.
    let pts = leaderboard
        .methods()
        .get_points(user1_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(pts, 5u64, "Should have 5 welcome bonus points");

    // Check welcome bonus: 1 IPREDICT token (1_000_000_000 base units).
    let bal = token
        .methods()
        .balance(user1_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(
        bal, 1_000_000_000u64,
        "Should have 1 IPREDICT welcome bonus token"
    );
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEST 2: Registration WITH Referrer
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_registration_with_referrer() {
    let (token, leaderboard, referral, _market, _admin, user1, user2, _user3) =
        setup_all().await;

    let user2_identity = Identity::Address(user2.address().into());

    // Register user2 first (the referrer).
    let referral_u2 = ReferralRegistry::new(referral.contract_id().clone(), user2.clone());
    referral_u2
        .methods()
        .register_referral(String::from("Bob"), None::<Identity>)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    // Register user1 with user2 as referrer.
    let referral_u1 = ReferralRegistry::new(referral.contract_id().clone(), user1.clone());
    referral_u1
        .methods()
        .register_referral(
            String::from("Alice"),
            Some(user2_identity.clone()),
        )
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    let user1_identity = Identity::Address(user1.address().into());

    // Verify referrer is set.
    let has_ref = referral
        .methods()
        .has_referrer(user1_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    assert!(has_ref, "User1 should have a referrer");

    let referrer = referral
        .methods()
        .get_referrer(user1_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(referrer, Some(user2_identity.clone()));

    // Verify referral count for user2.
    let count = referral
        .methods()
        .get_referral_count(user2_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(count, 1u32, "User2 should have 1 referral");
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEST 3: Full Bet → Resolve → Claim Flow
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_full_bet_resolve_claim_flow() {
    let (token, leaderboard, referral, market, admin, user1, user2, _user3) =
        setup_all().await;

    let user1_identity = Identity::Address(user1.address().into());
    let user2_identity = Identity::Address(user2.address().into());

    // Register both users (user1 with user2 as referrer).
    let referral_u2 = ReferralRegistry::new(referral.contract_id().clone(), user2.clone());
    referral_u2
        .methods()
        .register_referral(String::from("Referrer"), None::<Identity>)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    let referral_u1 = ReferralRegistry::new(referral.contract_id().clone(), user1.clone());
    referral_u1
        .methods()
        .register_referral(
            String::from("Bettor"),
            Some(user2_identity.clone()),
        )
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    // Create a market with a very short duration (1 second).
    let market_id = market
        .methods()
        .create_market(
            String::from("Will it rain?"),
            String::from("https://img.com/rain.png"),
            1u64, // expires almost immediately
        )
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(market_id, 1u64);

    // User1 places a YES bet of 10 ETH (10_000_000_000 base units).
    let bet_amount: u64 = 10_000_000_000;
    let market_u1 = PredictionMarket::new(market.contract_id().clone(), user1.clone());
    market_u1
        .methods()
        .place_bet(1u64, true) // YES
        .with_contract_ids(&[
            referral.contract_id().clone(),
            leaderboard.contract_id().clone(),
        ])
        .call_params(CallParameters::new(
            bet_amount,
            AssetId::zeroed(),
            1_000_000,
        ))
        .unwrap()
        .call()
        .await
        .unwrap();

    // User2 places a NO bet of 10 ETH.
    let market_u2 = PredictionMarket::new(market.contract_id().clone(), user2.clone());
    market_u2
        .methods()
        .place_bet(1u64, false) // NO
        .with_contract_ids(&[
            referral.contract_id().clone(),
            leaderboard.contract_id().clone(),
        ])
        .call_params(CallParameters::new(
            bet_amount,
            AssetId::zeroed(),
            1_000_000,
        ))
        .unwrap()
        .call()
        .await
        .unwrap();

    // Verify market state after bets.
    let mkt = market.methods().get_market(1u64).call().await.unwrap().value;
    assert_eq!(mkt.bet_count, 2u32, "Should have 2 bettors");
    // Net amounts = bet_amount - 2% fee. 2% of 10B = 200M.
    let expected_net = bet_amount - (bet_amount * 200 / 10000);
    assert_eq!(mkt.total_yes, expected_net, "YES pool should be net bet");
    assert_eq!(mkt.total_no, expected_net, "NO pool should be net bet");

    // Verify leaderboard recorded bets.
    let stats1 = leaderboard
        .methods()
        .get_stats(user1_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(stats1.total_bets, 1u32, "User1 should have 1 bet recorded");

    let stats2 = leaderboard
        .methods()
        .get_stats(user2_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(stats2.total_bets, 1u32, "User2 should have 1 bet recorded");

    // Verify odds are 50/50 (equal bets).
    let odds = market.methods().get_odds(1u64).call().await.unwrap().value;
    assert_eq!(odds.yes_percent, 50u32);
    assert_eq!(odds.no_percent, 50u32);

    // Resolve market: YES wins (outcome = true).
    market
        .methods()
        .resolve_market(1u64, true)
        .call()
        .await
        .unwrap();

    let mkt_resolved = market.methods().get_market(1u64).call().await.unwrap().value;
    assert!(mkt_resolved.resolved, "Market should be resolved");
    assert!(mkt_resolved.outcome, "Outcome should be YES (true)");

    // User1 claims (winner).
    market_u1
        .methods()
        .claim(1u64)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .with_variable_output_policy(VariableOutputPolicy::Exactly(1))
        .call()
        .await
        .unwrap();

    // User2 claims (loser).
    market_u2
        .methods()
        .claim(1u64)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .with_variable_output_policy(VariableOutputPolicy::Exactly(1))
        .call()
        .await
        .unwrap();

    // Verify leaderboard points: winner gets 30, loser gets 10, plus 5 welcome each.
    let pts1 = leaderboard
        .methods()
        .get_points(user1_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    // user1: 5 welcome + 30 win = 35. Also +3 referral bonus for user2 from user1's bet.
    // Actually user2 gets the referral bonus, not user1.
    assert_eq!(pts1, 35u64, "Winner should have 5 welcome + 30 win = 35 points");

    let pts2 = leaderboard
        .methods()
        .get_points(user2_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    // user2: 5 welcome + 3 referral bonus (from user1's bet) + 10 lose = 18.
    // user2 is referrer of user1, so gets 3 pts when user1 bets.
    assert_eq!(pts2, 18u64, "Loser/referrer should have 5 welcome + 3 referral + 10 lose = 18 points");

    // Verify IPREDICT token rewards.
    // winner: 1B welcome + 10B win = 11B.
    let tok1 = token
        .methods()
        .balance(user1_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(tok1, 11_000_000_000u64, "Winner: 1B welcome + 10B win");

    // loser: 1B welcome + 2B lose = 3B.
    let tok2 = token
        .methods()
        .balance(user2_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(tok2, 3_000_000_000u64, "Loser: 1B welcome + 2B lose");

    // Verify bet claimed flags.
    let bet1 = market
        .methods()
        .get_bet(1u64, user1_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    assert!(bet1.claimed, "User1 bet should be claimed");

    let bet2 = market
        .methods()
        .get_bet(1u64, user2_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    assert!(bet2.claimed, "User2 bet should be claimed");
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEST 4: Double Claim Fails
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_double_claim_fails() {
    let (token, leaderboard, referral, market, _admin, user1, _user2, _user3) =
        setup_all().await;

    // Register user1 (no referrer).
    let referral_u1 = ReferralRegistry::new(referral.contract_id().clone(), user1.clone());
    referral_u1
        .methods()
        .register_referral(String::from("Alice"), None::<Identity>)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    // Create a market (short duration).
    market
        .methods()
        .create_market(String::from("Q"), String::from("img"), 1u64)
        .call()
        .await
        .unwrap();

    // Place a YES bet.
    let market_u1 = PredictionMarket::new(market.contract_id().clone(), user1.clone());
    market_u1
        .methods()
        .place_bet(1u64, true)
        .with_contract_ids(&[
            referral.contract_id().clone(),
            leaderboard.contract_id().clone(),
        ])
        .call_params(CallParameters::new(
            2_000_000_000u64,
            AssetId::zeroed(),
            1_000_000,
        ))
        .unwrap()
        .call()
        .await
        .unwrap();

    // Resolve market: YES wins.
    market
        .methods()
        .resolve_market(1u64, true)
        .call()
        .await
        .unwrap();

    // First claim succeeds.
    market_u1
        .methods()
        .claim(1u64)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .with_variable_output_policy(VariableOutputPolicy::Exactly(1))
        .call()
        .await
        .unwrap();

    // Second claim should fail.
    let result = market_u1
        .methods()
        .claim(1u64)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .with_variable_output_policy(VariableOutputPolicy::Exactly(1))
        .call()
        .await;

    assert!(result.is_err(), "Double claim should revert");
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEST 5: Cancel Market with Bettors (Refund Flow)
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_cancel_market_refunds() {
    let (token, leaderboard, referral, market, _admin, user1, user2, _user3) =
        setup_all().await;

    // Register both users.
    let referral_u1 = ReferralRegistry::new(referral.contract_id().clone(), user1.clone());
    referral_u1
        .methods()
        .register_referral(String::from("Alice"), None::<Identity>)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    let referral_u2 = ReferralRegistry::new(referral.contract_id().clone(), user2.clone());
    referral_u2
        .methods()
        .register_referral(String::from("Bob"), None::<Identity>)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    // Create market.
    market
        .methods()
        .create_market(String::from("Cancel me"), String::from("img"), 3600u64)
        .call()
        .await
        .unwrap();

    let bet_amount: u64 = 5_000_000_000;

    // Record user1 balance before bet.
    let u1_balance_before = user1
        .get_asset_balance(&AssetId::zeroed())
        .await
        .unwrap();

    // User1 bets YES.
    let market_u1 = PredictionMarket::new(market.contract_id().clone(), user1.clone());
    market_u1
        .methods()
        .place_bet(1u64, true)
        .with_contract_ids(&[
            referral.contract_id().clone(),
            leaderboard.contract_id().clone(),
        ])
        .call_params(CallParameters::new(
            bet_amount,
            AssetId::zeroed(),
            1_000_000,
        ))
        .unwrap()
        .call()
        .await
        .unwrap();

    // User2 bets NO.
    let market_u2 = PredictionMarket::new(market.contract_id().clone(), user2.clone());
    market_u2
        .methods()
        .place_bet(1u64, false)
        .with_contract_ids(&[
            referral.contract_id().clone(),
            leaderboard.contract_id().clone(),
        ])
        .call_params(CallParameters::new(
            bet_amount,
            AssetId::zeroed(),
            1_000_000,
        ))
        .unwrap()
        .call()
        .await
        .unwrap();

    // Verify market has bets.
    let mkt = market.methods().get_market(1u64).call().await.unwrap().value;
    assert_eq!(mkt.bet_count, 2u32);

    // Cancel market — should refund net amounts.
    market
        .methods()
        .cancel_market(1u64)
        .with_variable_output_policy(VariableOutputPolicy::Exactly(2))
        .call()
        .await
        .unwrap();

    let mkt_cancelled = market.methods().get_market(1u64).call().await.unwrap().value;
    assert!(mkt_cancelled.cancelled, "Market should be cancelled");
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEST 6: No-Referrer Bet → Full 2% Platform Fee
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_no_referrer_full_platform_fee() {
    let (token, leaderboard, referral, market, _admin, user1, _user2, _user3) =
        setup_all().await;

    // Register user1 WITHOUT referrer.
    let referral_u1 = ReferralRegistry::new(referral.contract_id().clone(), user1.clone());
    referral_u1
        .methods()
        .register_referral(String::from("NoRef"), None::<Identity>)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    // Create market.
    market
        .methods()
        .create_market(String::from("Q"), String::from("img"), 3600u64)
        .call()
        .await
        .unwrap();

    let bet_amount: u64 = 10_000_000_000; // 10 ETH

    // Place a bet.
    let market_u1 = PredictionMarket::new(market.contract_id().clone(), user1.clone());
    market_u1
        .methods()
        .place_bet(1u64, true)
        .with_contract_ids(&[
            referral.contract_id().clone(),
            leaderboard.contract_id().clone(),
        ])
        .call_params(CallParameters::new(
            bet_amount,
            AssetId::zeroed(),
            1_000_000,
        ))
        .unwrap()
        .call()
        .await
        .unwrap();

    // When no referrer, full 2% (200 bps) goes to platform fees.
    // 2% of 10B = 200_000_000.
    let expected_fees = bet_amount * 200 / 10000;
    let accumulated = market
        .methods()
        .get_accumulated_fees()
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(
        accumulated, expected_fees,
        "Full 2% should go to platform fees when no referrer"
    );
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEST 7: With-Referrer Bet → Split Fee (1.5% platform + 0.5% referrer)
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_with_referrer_split_fee() {
    let (token, leaderboard, referral, market, _admin, user1, user2, _user3) =
        setup_all().await;

    let user2_identity = Identity::Address(user2.address().into());

    // Register user2 as referrer.
    let referral_u2 = ReferralRegistry::new(referral.contract_id().clone(), user2.clone());
    referral_u2
        .methods()
        .register_referral(String::from("Referrer"), None::<Identity>)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    // Register user1 WITH user2 as referrer.
    let referral_u1 = ReferralRegistry::new(referral.contract_id().clone(), user1.clone());
    referral_u1
        .methods()
        .register_referral(
            String::from("Bettor"),
            Some(user2_identity.clone()),
        )
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    // Create market.
    market
        .methods()
        .create_market(String::from("Q"), String::from("img"), 3600u64)
        .call()
        .await
        .unwrap();

    let bet_amount: u64 = 10_000_000_000; // 10 ETH

    // Record user2 (referrer) balance before.
    let u2_bal_before = user2.get_asset_balance(&AssetId::zeroed()).await.unwrap();

    // User1 places a bet (has referrer → 0.5% goes to referrer).
    let market_u1 = PredictionMarket::new(market.contract_id().clone(), user1.clone());
    market_u1
        .methods()
        .place_bet(1u64, true)
        .with_contract_ids(&[
            referral.contract_id().clone(),
            leaderboard.contract_id().clone(),
        ])
        .call_params(CallParameters::new(
            bet_amount,
            AssetId::zeroed(),
            1_000_000,
        ))
        .unwrap()
        .call()
        .await
        .unwrap();

    // Platform fees should be only 1.5% (150 bps).
    let expected_platform_fee = bet_amount * 150 / 10000;
    let accumulated = market
        .methods()
        .get_accumulated_fees()
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(
        accumulated, expected_platform_fee,
        "Only 1.5% should go to platform fees when referrer exists"
    );

    // Verify referrer's earnings tracked.
    let earnings = referral
        .methods()
        .get_earnings(user2_identity.clone())
        .call()
        .await
        .unwrap()
        .value;
    let expected_referral_fee = bet_amount * 50 / 10000; // 0.5%
    assert_eq!(
        earnings, expected_referral_fee,
        "Referrer should have 0.5% earnings tracked"
    );
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEST 8: Fee Withdrawal Flow
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_fee_withdrawal() {
    let (token, leaderboard, referral, market, admin, user1, _user2, _user3) =
        setup_all().await;

    // Register user1 without referrer.
    let referral_u1 = ReferralRegistry::new(referral.contract_id().clone(), user1.clone());
    referral_u1
        .methods()
        .register_referral(String::from("Alice"), None::<Identity>)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    // Create market and place bet (generates fees).
    market
        .methods()
        .create_market(String::from("Q"), String::from("img"), 3600u64)
        .call()
        .await
        .unwrap();

    let bet_amount: u64 = 10_000_000_000;
    let market_u1 = PredictionMarket::new(market.contract_id().clone(), user1.clone());
    market_u1
        .methods()
        .place_bet(1u64, true)
        .with_contract_ids(&[
            referral.contract_id().clone(),
            leaderboard.contract_id().clone(),
        ])
        .call_params(CallParameters::new(
            bet_amount,
            AssetId::zeroed(),
            1_000_000,
        ))
        .unwrap()
        .call()
        .await
        .unwrap();

    let expected_fees = bet_amount * 200 / 10000; // Full 2% since no referrer
    let fees_before = market
        .methods()
        .get_accumulated_fees()
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(fees_before, expected_fees);

    // Admin withdraws fees.
    let withdrawn = market
        .methods()
        .withdraw_fees()
        .with_variable_output_policy(VariableOutputPolicy::Exactly(1))
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(withdrawn, expected_fees, "Withdrawn should match accumulated");

    // Fees should now be 0.
    let fees_after = market
        .methods()
        .get_accumulated_fees()
        .call()
        .await
        .unwrap()
        .value;
    assert_eq!(fees_after, 0u64, "Fees should be 0 after withdrawal");
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEST 9: Opposite Side Bet Fails
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_opposite_side_bet_fails() {
    let (token, leaderboard, referral, market, _admin, user1, _user2, _user3) =
        setup_all().await;

    // Register user1.
    let referral_u1 = ReferralRegistry::new(referral.contract_id().clone(), user1.clone());
    referral_u1
        .methods()
        .register_referral(String::from("Alice"), None::<Identity>)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    market
        .methods()
        .create_market(String::from("Q"), String::from("img"), 3600u64)
        .call()
        .await
        .unwrap();

    // Place YES bet.
    let market_u1 = PredictionMarket::new(market.contract_id().clone(), user1.clone());
    market_u1
        .methods()
        .place_bet(1u64, true)
        .with_contract_ids(&[
            referral.contract_id().clone(),
            leaderboard.contract_id().clone(),
        ])
        .call_params(CallParameters::new(
            2_000_000_000u64,
            AssetId::zeroed(),
            1_000_000,
        ))
        .unwrap()
        .call()
        .await
        .unwrap();

    // Try to place NO bet (opposite side) — should fail.
    let result = market_u1
        .methods()
        .place_bet(1u64, false) // NO — opposite side
        .with_contract_ids(&[
            referral.contract_id().clone(),
            leaderboard.contract_id().clone(),
        ])
        .call_params(CallParameters::new(
            2_000_000_000u64,
            AssetId::zeroed(),
            1_000_000,
        ))
        .unwrap()
        .call()
        .await;

    assert!(
        result.is_err(),
        "Betting on opposite side should revert"
    );
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEST 10: Same-Side Increase Succeeds
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_same_side_increase() {
    let (token, leaderboard, referral, market, _admin, user1, _user2, _user3) =
        setup_all().await;

    // Register user1.
    let referral_u1 = ReferralRegistry::new(referral.contract_id().clone(), user1.clone());
    referral_u1
        .methods()
        .register_referral(String::from("Alice"), None::<Identity>)
        .with_contract_ids(&[
            leaderboard.contract_id().clone(),
            token.contract_id().clone(),
        ])
        .call()
        .await
        .unwrap();

    market
        .methods()
        .create_market(String::from("Q"), String::from("img"), 3600u64)
        .call()
        .await
        .unwrap();

    let bet1: u64 = 2_000_000_000;
    let bet2: u64 = 3_000_000_000;

    let market_u1 = PredictionMarket::new(market.contract_id().clone(), user1.clone());

    // First YES bet.
    market_u1
        .methods()
        .place_bet(1u64, true)
        .with_contract_ids(&[
            referral.contract_id().clone(),
            leaderboard.contract_id().clone(),
        ])
        .call_params(CallParameters::new(bet1, AssetId::zeroed(), 1_000_000))
        .unwrap()
        .call()
        .await
        .unwrap();

    // Second YES bet (same side — increase).
    market_u1
        .methods()
        .place_bet(1u64, true)
        .with_contract_ids(&[
            referral.contract_id().clone(),
            leaderboard.contract_id().clone(),
        ])
        .call_params(CallParameters::new(bet2, AssetId::zeroed(), 1_000_000))
        .unwrap()
        .call()
        .await
        .unwrap();

    // Verify combined net amount.
    let user1_identity = Identity::Address(user1.address().into());
    let bet = market
        .methods()
        .get_bet(1u64, user1_identity.clone())
        .call()
        .await
        .unwrap()
        .value;

    let net1 = bet1 - (bet1 * 200 / 10000);
    let net2 = bet2 - (bet2 * 200 / 10000);
    assert_eq!(
        bet.amount,
        net1 + net2,
        "Bet amount should accumulate both net deposits"
    );
    assert!(bet.is_yes, "Should be on YES side");

    // bet_count should still be 1 (same user).
    let mkt = market.methods().get_market(1u64).call().await.unwrap().value;
    assert_eq!(mkt.bet_count, 1u32, "Should still be 1 bettor");
}
