# Bach Protocol v1

`/protocol` contains a standalone Solana Rust program for a Maker-style over-collateralized CDP system.

## Asset model

- **Governance token (MKR equivalent):** `€BACH` (`BACH`), 12 decimals
- **Stablecoin (DAI equivalent):** **`toneUSD`**, 6 decimals
- **Peg target:** 1 `toneUSD` = 1 USD

### BACH governance mint by network

| Network | BACH mint |
| --- | --- |
| mainnet-beta | `CTQBjyrX8pYyqbNa8vAhQfnRXfu9cUxnvrxj5PvbzTmf` |
| devnet | `DENNuKzCcrLhEtxZ8tm7nSeef8qvKgGGrdxX6euNkNS7` |
| testnet | `A6a2s9LTZcYZQgxrDatLHYfvHhJEfb5ZWuFENhHtxJtR` |

The `GOVERNANCE_MINT` constant in `src/lib.rs` is compiled to a single network's
mint and validated by key equality at `InitializeProtocol`. The network is
selected by a Cargo feature, with **devnet** as the default:

| Build | Feature | GOVERNANCE_MINT |
| --- | --- | --- |
| devnet (default) | _none_ | `DENNuKzC…` |
| testnet | `--features testnet` | `A6a2s9LT…` |
| mainnet-beta | `--features mainnet` | `CTQBjyrX…` |

`testnet` and `mainnet` override the default, so you do **not** need
`--no-default-features`.

## v1 scope

- protocol config PDA with governance + oracle authorities
- collateral markets with per-asset debt ceilings and oracle prices
- user vault PDAs for over-collateralized debt positions
- collateral deposit / withdrawal flows
- `toneUSD` mint / burn flows using an SPL mint whose authority is the protocol config PDA
- liquidation path for under-collateralized vaults
- simple linear stability-fee accrual

## Accounts

- `config`: PDA derived from `["config"]`
- `collateral`: PDA derived from `["collateral", collateral_mint]`
- `vault`: PDA derived from `["vault", owner, collateral_mint]`

Collateral is pooled in a per-market SPL token vault owned by the config PDA. Each vault tracks an individual user's collateral and debt accounting against that pool.

## Deployment assumptions

1. Create an SPL mint for `toneUSD` with **6 decimals**.
2. Set the `toneUSD` mint authority to the config PDA derived for the deployed program.
3. For every collateral asset, create a protocol-owned SPL token account to act as the collateral vault.
4. Initialize the protocol, initialize supported collateral markets, then open user vaults.
5. Keep oracle authority behind a secured off-chain signer or multisig for testnet.

## Build

```bash
cd protocol
cargo test
```

To build a deployable shared object, pick the target network's feature:

```bash
cd protocol
cargo build-sbf                      # devnet (default)
cargo build-sbf --features testnet   # testnet
cargo build-sbf --features mainnet   # mainnet-beta
```

Deploy each build from the same program keypair so the program id
(`yh9n52WPmWJBYTsBU1kBYfLSuxWY8zZTUPbjDB6d7wc`) is identical across clusters:

```bash
solana program deploy \
  --url testnet \
  --program-id <program-keypair.json> \
  target/deploy/protocol.so
```

Then bootstrap the cluster with `@bach-money/scripts`
(`pnpm --filter @bach-money/scripts bootstrap:testnet`).

## Notes

- v1 intentionally uses a trusted oracle authority for price updates.
- Collateral vault token accounts are expected to be provisioned off-chain before market initialization.
- Governance is authority-based in v1, but config stores the on-chain governance mint to support later vote-escrow or token-voting upgrades.
