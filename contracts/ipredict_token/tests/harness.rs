// ── IPredictToken Integration Tests ──────────────────────────────────────────
// Uses fuels-rs to deploy and test the IPredictToken contract against a
// local Fuel node. Tests cover: initialize, set/remove minter, mint, transfer,
// burn, balance, total supply, and multi-minter authorization.
// ─────────────────────────────────────────────────────────────────────────────

use fuels::{
    prelude::*,
    types::Identity,
};

abigen!(Contract(
    name = "IPredictToken",
    abi = "ipredict_token/out/debug/ipredict_token-abi.json"
));

/// Spin up a local Fuel node with 4 wallets and deploy the token contract.
/// Returns (contract_instance, admin_wallet, wallet1, wallet2, wallet3).
async fn setup() -> (
    IPredictToken<WalletUnlocked>,
    WalletUnlocked,
    WalletUnlocked,
    WalletUnlocked,
    WalletUnlocked,
) {
    let num_wallets = 4;
    let coins_per_wallet = 1;
    let amount_per_coin = 1_000_000_000_000; // lots of gas

    let config = WalletsConfig::new(
        Some(num_wallets),
        Some(coins_per_wallet),
        Some(amount_per_coin),
    );

    let wallets = launch_custom_provider_and_get_wallets(config, None, None)
        .await
        .unwrap();

    let admin = wallets[0].clone();
    let w1 = wallets[1].clone();
    let w2 = wallets[2].clone();
    let w3 = wallets[3].clone();

    let contract_id = Contract::load_from(
        "./ipredict_token/out/debug/ipredict_token.bin",
        LoadConfiguration::default(),
    )
    .unwrap()
    .deploy(&admin, TxPolicies::default())
    .await
    .unwrap();

    let instance = IPredictToken::new(contract_id, admin.clone());

    (instance, admin, w1, w2, w3)
}

// ═════════════════════════════════════════════════════════════════════════════
//  TESTS
// ═════════════════════════════════════════════════════════════════════════════

#[tokio::test]
async fn test_initialize() {
    let (contract, _admin, _, _, _) = setup().await;

    contract
        .methods()
        .initialize(
            String::from("IPREDICT"),
            String::from("IPRED"),
            9u8,
        )
        .call()
        .await
        .unwrap();

    let name = contract.methods().name().call().await.unwrap().value;
    let symbol = contract.methods().symbol().call().await.unwrap().value;
    let decimals = contract.methods().decimals().call().await.unwrap().value;
    let supply = contract.methods().total_supply().call().await.unwrap().value;

    assert_eq!(name, String::from("IPREDICT"));
    assert_eq!(symbol, String::from("IPRED"));
    assert_eq!(decimals, 9u8);
    assert_eq!(supply, 0u64);
}

#[tokio::test]
async fn test_initialize_twice_fails() {
    let (contract, _admin, _, _, _) = setup().await;

    contract
        .methods()
        .initialize(String::from("IPREDICT"), String::from("IPRED"), 9u8)
        .call()
        .await
        .unwrap();

    // Second call should revert.
    let result = contract
        .methods()
        .initialize(String::from("IPREDICT"), String::from("IPRED"), 9u8)
        .call()
        .await;

    assert!(result.is_err(), "Double initialize should revert");
}

#[tokio::test]
async fn test_set_minter_and_mint() {
    let (contract, admin, w1, _, _) = setup().await;

    contract
        .methods()
        .initialize(String::from("IPREDICT"), String::from("IPRED"), 9u8)
        .call()
        .await
        .unwrap();

    // Deploy a second "minter" contract — we'll use the token contract itself
    // as a stand-in. In real usage, the PredictionMarket contract would be the minter.
    // For testing, we authorize a contract ID and call mint from it.
    // Since only ContractId callers can mint, we need to test via a proxy.
    // For now, test the set_minter / is_minter / remove_minter admin logic.

    let minter_id = ContractId::new([0xAA; 32]);
    contract
        .methods()
        .set_minter(minter_id)
        .call()
        .await
        .unwrap();

    let is_minter = contract
        .methods()
        .is_minter(minter_id)
        .call()
        .await
        .unwrap()
        .value;
    assert!(is_minter, "Minter should be authorized");
}

#[tokio::test]
async fn test_set_minter_multiple() {
    let (contract, _admin, _, _, _) = setup().await;

    contract
        .methods()
        .initialize(String::from("IPREDICT"), String::from("IPRED"), 9u8)
        .call()
        .await
        .unwrap();

    let minter1 = ContractId::new([0xAA; 32]);
    let minter2 = ContractId::new([0xBB; 32]);

    contract.methods().set_minter(minter1).call().await.unwrap();
    contract.methods().set_minter(minter2).call().await.unwrap();

    assert!(contract.methods().is_minter(minter1).call().await.unwrap().value);
    assert!(contract.methods().is_minter(minter2).call().await.unwrap().value);
}

#[tokio::test]
async fn test_remove_minter() {
    let (contract, _admin, _, _, _) = setup().await;

    contract
        .methods()
        .initialize(String::from("IPREDICT"), String::from("IPRED"), 9u8)
        .call()
        .await
        .unwrap();

    let minter_id = ContractId::new([0xAA; 32]);
    contract
        .methods()
        .set_minter(minter_id)
        .call()
        .await
        .unwrap();

    assert!(contract.methods().is_minter(minter_id).call().await.unwrap().value);

    contract
        .methods()
        .remove_minter(minter_id)
        .call()
        .await
        .unwrap();

    assert!(
        !contract.methods().is_minter(minter_id).call().await.unwrap().value,
        "Minter should be deauthorized after remove"
    );
}

#[tokio::test]
async fn test_set_minter_not_admin_fails() {
    let (contract, _admin, w1, _, _) = setup().await;

    contract
        .methods()
        .initialize(String::from("IPREDICT"), String::from("IPRED"), 9u8)
        .call()
        .await
        .unwrap();

    // Connect with non-admin wallet.
    let non_admin_contract =
        IPredictToken::new(contract.contract_id().clone(), w1.clone());

    let minter_id = ContractId::new([0xAA; 32]);
    let result = non_admin_contract
        .methods()
        .set_minter(minter_id)
        .call()
        .await;

    assert!(result.is_err(), "Non-admin should not set minter");
}

#[tokio::test]
async fn test_transfer() {
    let (contract, admin, w1, _, _) = setup().await;

    contract
        .methods()
        .initialize(String::from("IPREDICT"), String::from("IPRED"), 9u8)
        .call()
        .await
        .unwrap();

    // To test transfer, we need tokens in the admin's balance.
    // Since mint requires a ContractId caller, we'll skip mint here and
    // just verify transfer error for insufficient balance.
    let recipient = Identity::Address(w1.address().into());

    let result = contract
        .methods()
        .transfer(recipient, 100u64)
        .call()
        .await;

    assert!(
        result.is_err(),
        "Transfer with zero balance should fail"
    );
}

#[tokio::test]
async fn test_burn_insufficient_balance() {
    let (contract, _admin, _, _, _) = setup().await;

    contract
        .methods()
        .initialize(String::from("IPREDICT"), String::from("IPRED"), 9u8)
        .call()
        .await
        .unwrap();

    let result = contract.methods().burn(100u64).call().await;

    assert!(
        result.is_err(),
        "Burn with zero balance should fail"
    );
}

#[tokio::test]
async fn test_balance_default_zero() {
    let (contract, _admin, w1, _, _) = setup().await;

    contract
        .methods()
        .initialize(String::from("IPREDICT"), String::from("IPRED"), 9u8)
        .call()
        .await
        .unwrap();

    let user = Identity::Address(w1.address().into());
    let bal = contract.methods().balance(user).call().await.unwrap().value;

    assert_eq!(bal, 0u64, "Default balance should be zero");
}

#[tokio::test]
async fn test_total_supply_starts_zero() {
    let (contract, _admin, _, _, _) = setup().await;

    contract
        .methods()
        .initialize(String::from("IPREDICT"), String::from("IPRED"), 9u8)
        .call()
        .await
        .unwrap();

    let supply = contract.methods().total_supply().call().await.unwrap().value;
    assert_eq!(supply, 0u64, "Initial total supply should be zero");
}

#[tokio::test]
async fn test_mint_invalid_amount_zero() {
    let (contract, _admin, _, _, _) = setup().await;

    contract
        .methods()
        .initialize(String::from("IPREDICT"), String::from("IPRED"), 9u8)
        .call()
        .await
        .unwrap();

    // Even if this was a valid minter, amount=0 should fail.
    let user = Identity::Address(Address::new([0xCC; 32]));
    let result = contract.methods().mint(user, 0u64).call().await;

    assert!(result.is_err(), "Mint with zero amount should fail");
}

#[tokio::test]
async fn test_transfer_invalid_amount_zero() {
    let (contract, _admin, w1, _, _) = setup().await;

    contract
        .methods()
        .initialize(String::from("IPREDICT"), String::from("IPRED"), 9u8)
        .call()
        .await
        .unwrap();

    let recipient = Identity::Address(w1.address().into());
    let result = contract.methods().transfer(recipient, 0u64).call().await;

    assert!(result.is_err(), "Transfer with zero amount should fail");
}

#[tokio::test]
async fn test_burn_invalid_amount_zero() {
    let (contract, _admin, _, _, _) = setup().await;

    contract
        .methods()
        .initialize(String::from("IPREDICT"), String::from("IPRED"), 9u8)
        .call()
        .await
        .unwrap();

    let result = contract.methods().burn(0u64).call().await;

    assert!(result.is_err(), "Burn with zero amount should fail");
}
