use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{program_error::ProgramError, pubkey::Pubkey};

use crate::error::BachError;

#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub enum BachInstruction {
    InitializeProtocol {
        governance_authority: Pubkey,
        oracle_authority: Pubkey,
        stability_fee_bps: u16,
        liquidation_ratio_bps: u16,
        liquidation_penalty_bps: u16,
        min_collateral_ratio_bps: u16,
    },
    InitializeCollateral {
        price_e6: u64,
        debt_ceiling: u64,
        liquidation_ratio_bps: u16,
    },
    UpdateProtocolRiskParams {
        oracle_authority: Pubkey,
        stability_fee_bps: u16,
        liquidation_ratio_bps: u16,
        liquidation_penalty_bps: u16,
        min_collateral_ratio_bps: u16,
    },
    UpdateOraclePrice {
        price_e6: u64,
    },
    OpenVault,
    DepositCollateral {
        amount: u64,
    },
    WithdrawCollateral {
        amount: u64,
    },
    MintStablecoin {
        amount: u64,
    },
    BurnStablecoin {
        amount: u64,
    },
    LiquidateVault {
        repay_amount: u64,
    },
}

impl BachInstruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        Self::try_from_slice(input).map_err(|_| BachError::InvalidInstruction.into())
    }
}

#[cfg(test)]
mod tests {
    use solana_program::pubkey::Pubkey;

    use super::BachInstruction;

    #[test]
    fn instruction_round_trip() {
        let instruction = BachInstruction::InitializeProtocol {
            governance_authority: Pubkey::new_unique(),
            oracle_authority: Pubkey::new_unique(),
            stability_fee_bps: 250,
            liquidation_ratio_bps: 15_000,
            liquidation_penalty_bps: 1_300,
            min_collateral_ratio_bps: 13_000,
        };

        let serialized = borsh::to_vec(&instruction).unwrap();
        let decoded = BachInstruction::unpack(&serialized).unwrap();

        assert_eq!(instruction, decoded);
    }
}
