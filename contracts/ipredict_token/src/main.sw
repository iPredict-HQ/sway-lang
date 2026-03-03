contract;

// ── IPredictToken Contract ───────────────────────────────────────────────────
// Platform token implementing SRC-20 (fungible) + SRC-3 (mint/burn) standards.
// Multi-minter authorization for PredictionMarket and ReferralRegistry contracts.
//
// Storage-based balances (not native Fuel sub-assets) — this is a ledger token
// tracked entirely within this contract, similar to ERC-20 on EVM.
// ─────────────────────────────────────────────────────────────────────────────

use std::{
    auth::msg_sender,
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
    /// Admin who called `initialize`. Only the admin can set/remove minters.
    admin: Identity = Identity::Address(Address::zero()),
    /// Token metadata.
    token_name: StorageString = StorageString {},
    token_symbol: StorageString = StorageString {},
    token_decimals: u8 = 9u8,
    /// Total minted supply (decremented on burn).
    supply: u64 = 0u64,
    /// Balances: Identity → u64.
    balances: StorageMap<Identity, u64> = StorageMap {},
    /// Authorized minters: ContractId → bool.
    authorized_minters: StorageMap<ContractId, bool> = StorageMap {},
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ABI DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

abi IPredictToken {
    // -- Lifecycle --
    #[storage(read, write)]
    fn initialize(name: String, symbol: String, decimals: u8);

    // -- Minter Management (admin only) --
    #[storage(read, write)]
    fn set_minter(minter: ContractId);

    #[storage(read, write)]
    fn remove_minter(minter: ContractId);

    // -- Token Operations --
    #[storage(read, write)]
    fn mint(to: Identity, amount: u64);

    #[storage(read, write)]
    fn transfer(to: Identity, amount: u64);

    #[storage(read, write)]
    fn burn(amount: u64);

    // -- View Functions --
    #[storage(read)]
    fn balance(account: Identity) -> u64;

    #[storage(read)]
    fn total_supply() -> u64;

    #[storage(read)]
    fn name() -> String;

    #[storage(read)]
    fn symbol() -> String;

    #[storage(read)]
    fn decimals() -> u8;

    #[storage(read)]
    fn is_minter(minter: ContractId) -> bool;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

impl IPredictToken for Contract {
    // ─── Lifecycle ───────────────────────────────────────────────────────────

    /// Initialize the token with metadata. Can only be called once.
    /// The caller becomes the admin.
    #[storage(read, write)]
    fn initialize(name: String, symbol: String, decimals: u8) {
        require(storage.initialized.read() == false, TokenError::AlreadyInitialized);

        storage.initialized.write(true);
        storage.admin.write(msg_sender().unwrap());
        storage.token_name.write_slice(name);
        storage.token_symbol.write_slice(symbol);
        storage.token_decimals.write(decimals);

        log(String::as_bytes(name));
    }

    // ─── Minter Management ──────────────────────────────────────────────────

    /// Authorize a contract to call `mint`. Admin only.
    /// Supports multiple minters (e.g. PredictionMarket + ReferralRegistry).
    #[storage(read, write)]
    fn set_minter(minter: ContractId) {
        require(storage.initialized.read(), TokenError::NotInitialized);
        require(
            msg_sender().unwrap() == storage.admin.read(),
            TokenError::NotAdmin,
        );

        storage.authorized_minters.insert(minter, true);

        log(MinterChangedEvent {
            minter,
            authorized: true,
        });
    }

    /// Revoke a contract's minting permission. Admin only.
    #[storage(read, write)]
    fn remove_minter(minter: ContractId) {
        require(storage.initialized.read(), TokenError::NotInitialized);
        require(
            msg_sender().unwrap() == storage.admin.read(),
            TokenError::NotAdmin,
        );

        storage.authorized_minters.insert(minter, false);

        log(MinterChangedEvent {
            minter,
            authorized: false,
        });
    }

    // ─── Token Operations ───────────────────────────────────────────────────

    /// Mint `amount` tokens to `to`. Caller must be an authorized minter
    /// (identified by its ContractId via msg_sender()).
    #[storage(read, write)]
    fn mint(to: Identity, amount: u64) {
        require(storage.initialized.read(), TokenError::NotInitialized);
        require(amount > 0, TokenError::InvalidAmount);

        // The caller must be an authorized minter contract.
        let sender = msg_sender().unwrap();
        let caller_contract = match sender {
            Identity::ContractId(id) => id,
            _ => {
                // EOA wallets cannot mint — revert.
                require(false, TokenError::UnauthorizedMinter);
                // Unreachable, but satisfies the match arm.
                ContractId::zero()
            },
        };
        require(
            storage.authorized_minters.get(caller_contract).try_read().unwrap_or(false),
            TokenError::UnauthorizedMinter,
        );

        // Credit recipient balance.
        let current_balance = storage.balances.get(to).try_read().unwrap_or(0);
        storage.balances.insert(to, current_balance + amount);

        // Increment total supply.
        let current_supply = storage.supply.read();
        storage.supply.write(current_supply + amount);

        log(MintEvent { to, amount });
    }

    /// Transfer `amount` tokens from the caller to `to`.
    #[storage(read, write)]
    fn transfer(to: Identity, amount: u64) {
        require(storage.initialized.read(), TokenError::NotInitialized);
        require(amount > 0, TokenError::InvalidAmount);

        let sender = msg_sender().unwrap();
        let sender_balance = storage.balances.get(sender).try_read().unwrap_or(0);
        require(sender_balance >= amount, TokenError::InsufficientBalance);

        // Debit sender.
        storage.balances.insert(sender, sender_balance - amount);

        // Credit recipient.
        let recipient_balance = storage.balances.get(to).try_read().unwrap_or(0);
        storage.balances.insert(to, recipient_balance + amount);

        log(TransferEvent {
            from: sender,
            to,
            amount,
        });
    }

    /// Burn `amount` tokens from the caller's balance.
    #[storage(read, write)]
    fn burn(amount: u64) {
        require(storage.initialized.read(), TokenError::NotInitialized);
        require(amount > 0, TokenError::InvalidAmount);

        let sender = msg_sender().unwrap();
        let sender_balance = storage.balances.get(sender).try_read().unwrap_or(0);
        require(sender_balance >= amount, TokenError::InsufficientBalance);

        // Debit sender.
        storage.balances.insert(sender, sender_balance - amount);

        // Decrement total supply.
        let current_supply = storage.supply.read();
        storage.supply.write(current_supply - amount);

        log(BurnEvent {
            from: sender,
            amount,
        });
    }

    // ─── View Functions ─────────────────────────────────────────────────────

    /// Return the token balance for `account`.
    #[storage(read)]
    fn balance(account: Identity) -> u64 {
        storage.balances.get(account).try_read().unwrap_or(0)
    }

    /// Return the current total supply.
    #[storage(read)]
    fn total_supply() -> u64 {
        storage.supply.read()
    }

    /// Return the token name.
    #[storage(read)]
    fn name() -> String {
        storage.token_name.read_slice().unwrap_or(String::new())
    }

    /// Return the token symbol.
    #[storage(read)]
    fn symbol() -> String {
        storage.token_symbol.read_slice().unwrap_or(String::new())
    }

    /// Return the number of decimals.
    #[storage(read)]
    fn decimals() -> u8 {
        storage.token_decimals.read()
    }

    /// Check whether a given ContractId is an authorized minter.
    #[storage(read)]
    fn is_minter(minter: ContractId) -> bool {
        storage.authorized_minters.get(minter).try_read().unwrap_or(false)
    }
}
