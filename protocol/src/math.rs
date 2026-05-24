use crate::error::BachError;

pub const BPS_DENOMINATOR: u128 = 10_000;
pub const PRICE_SCALE: u128 = 1_000_000;
pub const SECONDS_PER_YEAR: u128 = 31_536_000;

pub fn checked_add(lhs: u64, rhs: u64) -> Result<u64, BachError> {
    lhs.checked_add(rhs).ok_or(BachError::MathOverflow)
}

pub fn checked_sub(lhs: u64, rhs: u64) -> Result<u64, BachError> {
    lhs.checked_sub(rhs).ok_or(BachError::MathOverflow)
}

pub fn accrue_stability_fee(
    debt_amount: u64,
    stability_fee_bps: u16,
    elapsed_seconds: i64,
) -> Result<u64, BachError> {
    if debt_amount == 0 || stability_fee_bps == 0 || elapsed_seconds <= 0 {
        return Ok(debt_amount);
    }

    let fee = (debt_amount as u128)
        .checked_mul(stability_fee_bps as u128)
        .and_then(|value| value.checked_mul(elapsed_seconds as u128))
        .and_then(|value| value.checked_div(BPS_DENOMINATOR))
        .and_then(|value| value.checked_div(SECONDS_PER_YEAR))
        .ok_or(BachError::MathOverflow)?;

    (debt_amount as u128)
        .checked_add(fee)
        .and_then(|value| u64::try_from(value).ok())
        .ok_or(BachError::MathOverflow)
}

pub fn collateral_value_e6(
    collateral_amount: u64,
    collateral_decimals: u8,
    price_e6: u64,
) -> Result<u64, BachError> {
    let scale = 10u128
        .checked_pow(collateral_decimals as u32)
        .ok_or(BachError::MathOverflow)?;

    (collateral_amount as u128)
        .checked_mul(price_e6 as u128)
        .and_then(|value| value.checked_div(scale))
        .and_then(|value| u64::try_from(value).ok())
        .ok_or(BachError::MathOverflow)
}

pub fn max_debt_for_value(
    collateral_value_e6: u64,
    required_ratio_bps: u16,
) -> Result<u64, BachError> {
    if required_ratio_bps == 0 {
        return Err(BachError::InvalidRiskParameter);
    }

    (collateral_value_e6 as u128)
        .checked_mul(BPS_DENOMINATOR)
        .and_then(|value| value.checked_div(required_ratio_bps as u128))
        .and_then(|value| u64::try_from(value).ok())
        .ok_or(BachError::MathOverflow)
}

pub fn collateral_ratio_bps(collateral_value_e6: u64, debt_amount: u64) -> Result<u64, BachError> {
    if debt_amount == 0 {
        return Ok(u64::MAX);
    }

    (collateral_value_e6 as u128)
        .checked_mul(BPS_DENOMINATOR)
        .and_then(|value| value.checked_div(debt_amount as u128))
        .and_then(|value| u64::try_from(value).ok())
        .ok_or(BachError::MathOverflow)
}

pub fn liquidation_payout(
    repay_amount: u64,
    collateral_decimals: u8,
    price_e6: u64,
    liquidation_penalty_bps: u16,
) -> Result<u64, BachError> {
    if price_e6 == 0 {
        return Err(BachError::InvalidRiskParameter);
    }

    let scale = 10u128
        .checked_pow(collateral_decimals as u32)
        .ok_or(BachError::MathOverflow)?;
    let numerator = (repay_amount as u128)
        .checked_mul(scale)
        .and_then(|value| value.checked_mul(BPS_DENOMINATOR + liquidation_penalty_bps as u128))
        .ok_or(BachError::MathOverflow)?;

    numerator
        .checked_div(price_e6 as u128)
        .and_then(|value| value.checked_div(BPS_DENOMINATOR))
        .and_then(|value| u64::try_from(value).ok())
        .ok_or(BachError::MathOverflow)
}

#[cfg(test)]
mod tests {
    use super::{
        accrue_stability_fee, collateral_ratio_bps, collateral_value_e6, liquidation_payout,
        max_debt_for_value,
    };

    #[test]
    fn accrues_simple_stability_fee() {
        let accrued = accrue_stability_fee(1_000_000, 500, 31_536_000).unwrap();
        assert_eq!(accrued, 1_050_000);
    }

    #[test]
    fn calculates_borrowing_power() {
        let value = collateral_value_e6(2_000_000_000, 9, 150_000_000).unwrap();
        let max_debt = max_debt_for_value(value, 15_000).unwrap();
        assert_eq!(value, 300_000_000);
        assert_eq!(max_debt, 200_000_000);
    }

    #[test]
    fn calculates_liquidation_transfer() {
        let seized = liquidation_payout(50_000_000, 9, 200_000_000, 1_300).unwrap();
        assert_eq!(seized, 282_500_000);
    }

    #[test]
    fn returns_max_ratio_for_zero_debt() {
        assert_eq!(collateral_ratio_bps(1_000_000, 0).unwrap(), u64::MAX);
    }
}
