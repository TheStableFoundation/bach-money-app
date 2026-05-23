# Bach Protocol v1

`/protocol` contains a standalone Solana Rust program for a Maker-style over-collateralized CDP system.

## Asset model

- **Governance token (MKR equivalent):** `€BACH`
- **Governance mint:** `CTQBjyrX8pYyqbNa8vAhQfnRXfu9cUxnvrxj5PvbzTmf`
- **Stablecoin (DAI equivalent):** **Bach Dollar (`BACHD`)**
- **Peg target:** 1 `BACHD` = 1 USD

## v1 scope

- protocol config PDA with governance + oracle authorities
- collateral markets with per-asset debt ceilings and oracle prices
- user vault PDAs for over-collateralized debt positions
- collateral deposit / withdrawal flows
- `BACHD` mint / burn flows using an SPL mint whose authority is the protocol config PDA
- liquidation path for under-collateralized vaults
- simple linear stability-fee accrual

## Accounts

- `config`: PDA derived from `["config"]`
- `collateral`: PDA derived from `["collateral", collateral_mint]`
- `vault`: PDA derived from `["vault", owner, collateral_mint]`

Collateral is pooled in a per-market SPL token vault owned by the config PDA. Each vault tracks an individual user's collateral and debt accounting against that pool.

## Deployment assumptions

1. Create an SPL mint for `BACHD` with **6 decimals**.
2. Set the `BACHD` mint authority to the config PDA derived for the deployed program.
3. For every collateral asset, create a protocol-owned SPL token account to act as the collateral vault.
4. Initialize the protocol, initialize supported collateral markets, then open user vaults.
5. Keep oracle authority behind a secured off-chain signer or multisig for testnet.

## Build

```bash
cd /home/runner/work/bach-money-app/bach-money-app/protocol
cargo test
```

To build a deployable shared object:

```bash
cd /home/runner/work/bach-money-app/bach-money-app/protocol
cargo build --release
```

## Notes

- v1 intentionally uses a trusted oracle authority for price updates.
- Collateral vault token accounts are expected to be provisioned off-chain before market initialization.
- Governance is authority-based in v1, but config stores the on-chain governance mint to support later vote-escrow or token-voting upgrades.
