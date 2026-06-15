pub mod entrypoint;
pub mod error;
pub mod instruction;
pub mod math;
pub mod processor;
pub mod state;

use solana_program::pubkey;
use solana_program::pubkey::Pubkey;

pub const CONFIG_SEED: &[u8] = b"config";
pub const COLLATERAL_SEED: &[u8] = b"collateral";
pub const VAULT_SEED: &[u8] = b"vault";
pub const STABLE_MINT_DECIMALS: u8 = 6;
pub const STABLECOIN_NAME: [u8; state::STABLE_NAME_LEN] = *b"toneUSD\0\0\0\0\0\0\0\0\0";
pub const STABLECOIN_SYMBOL: [u8; state::STABLE_SYMBOL_LEN] = *b"toneUSD\0";
// GOVERNANCE_MINT is the BACH governance mint for the target network. It is a
// compile-time constant validated by key equality at InitializeProtocol, so the
// program must be rebuilt per network (see protocol/README.md). Pick the network
// with a Cargo feature; devnet is the default. testnet wins over mainnet if both
// are (mistakenly) enabled, so a build never produces two definitions.
#[cfg(feature = "testnet")]
pub const GOVERNANCE_MINT: Pubkey = pubkey!("A6a2s9LTZcYZQgxrDatLHYfvHhJEfb5ZWuFENhHtxJtR");
#[cfg(all(feature = "mainnet", not(feature = "testnet")))]
pub const GOVERNANCE_MINT: Pubkey = pubkey!("CTQBjyrX8pYyqbNa8vAhQfnRXfu9cUxnvrxj5PvbzTmf");
#[cfg(all(not(feature = "testnet"), not(feature = "mainnet")))]
pub const GOVERNANCE_MINT: Pubkey = pubkey!("DENNuKzCcrLhEtxZ8tm7nSeef8qvKgGGrdxX6euNkNS7");
