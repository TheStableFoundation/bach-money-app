---
name: bachmoney-app-structure
description: Reference for the bach-money-app monorepo structure. Use when navigating the codebase, adding new packages or apps, or understanding how the protocol, SDK, and frontend relate to each other.
allowed-tools: Read, Glob, Grep
user-invocable: false
---

# bach-money-app monorepo structure

Bach Money is a MakerDAO-style CDP (collateralized debt position) protocol on Solana. This repo contains the on-chain Rust program, a TypeScript client SDK, and the Next.js frontend app.

## Root layout

```
bach-money-app/
├── Cargo.toml                    # Rust workspace root (members: ["protocol"])
├── package.json                  # pnpm workspace root — no app code here
├── pnpm-workspace.yaml           # declares apps/* and packages/*
├── turbo.json                    # Turborepo build graph
├── .nvmrc
├── .npmrc
├── .gitignore
│
├── protocol/                     # Rust on-chain program (native solana-program, no Anchor)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                # constants: seeds, GOVERNANCE_MINT, STABLE_MINT_DECIMALS
│       ├── state.rs              # ProtocolConfig, CollateralConfig, VaultPosition
│       ├── instruction.rs        # BachInstruction enum (Borsh serialized)
│       ├── processor.rs          # instruction dispatch and handler logic
│       ├── math.rs               # checked arithmetic, fee accrual, liquidation math
│       ├── entrypoint.rs         # program entrypoint
│       └── error.rs              # BachError enum
│
├── packages/
│   ├── sdk/                      # @bach-money/sdk — TS client for the on-chain program
│   │   ├── package.json
│   │   ├── tsconfig.json         # type-check only (noEmit)
│   │   ├── tsconfig.build.json   # emits to dist/
│   │   └── src/
│   │       ├── index.ts          # barrel export
│   │       ├── types.ts          # ProtocolConfig, CollateralConfig, VaultPosition interfaces
│   │       ├── constants.ts      # seeds, GOVERNANCE_MINT, BPS_DENOMINATOR
│   │       ├── instructions.ts   # PDA derivation + TransactionInstruction builders
│   │       └── client.ts         # BachMoneyClient — account fetchers + deserialization
│   │
│   └── config-typescript/        # @bach-money/config-typescript — shared TS configs
│       ├── package.json
│       ├── base.json             # base compiler options
│       └── nextjs.json           # extends base, adds DOM libs and react-jsx
│
├── apps/
│   └── app/                      # @bach-money/app — Next.js CDP frontend
│       ├── package.json          # depends on @bach-money/sdk (workspace:*)
│       ├── next.config.ts
│       ├── tsconfig.json         # extends ../../packages/config-typescript/nextjs.json
│       ├── postcss.config.mjs
│       ├── next-env.d.ts
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── globals.css
│       │   ├── buy-crypto/
│       │   │   └── page.tsx      # Stripe crypto onramp UI
│       │   └── api/
│       │       └── create-onramp-session/
│       │           └── route.ts  # POST — creates Stripe onramp session
│       └── public/
│
└── docs/                         # developer markdown docs (not a build input)
    ├── DEVELOPER_GUIDE.md
    ├── DESIGN_SYSTEM.md
    ├── QUICK_START.md
    ├── PROJECT_STRUCTURE.md
    ├── IMPLEMENTATION_SUMMARY.md
    ├── USER_FLOW.md
    ├── STRIPE_SETUP.md
    └── CHANGES.md
```

## Key relationships

- `apps/app` imports from `@bach-money/sdk` via `workspace:*`
- `packages/sdk` has `@solana/web3.js` as a peer dependency; apps provide it
- `packages/config-typescript` is consumed by both `sdk` and `app` tsconfigs
- Turborepo ensures `sdk` is built before `app` (`dependsOn: ["^build"]`)
- The Rust `protocol/` is a Cargo workspace member but is otherwise independent of the JS build

## Protocol accounts (state.rs)

| Account | PDA seeds | Size |
|---|---|---|
| `ProtocolConfig` | `["config"]` | 162 bytes |
| `CollateralConfig` | `["collateral", collateral_mint]` | 102 bytes |
| `VaultPosition` | `["vault", owner, collateral_mint]` | 90 bytes |

## BachInstruction variants (instruction.rs)

`InitializeProtocol`, `InitializeCollateral`, `UpdateProtocolRiskParams`, `UpdateOraclePrice`, `OpenVault`, `DepositCollateral`, `WithdrawCollateral`, `MintStablecoin`, `BurnStablecoin`, `LiquidateVault`

Serialized as Borsh with u8 enum tag. SDK `instructions.ts` mirrors the variant order — the tag value is the enum index.

## Protocol constants (lib.rs)

```
CONFIG_SEED        = b"config"
COLLATERAL_SEED    = b"collateral"
VAULT_SEED         = b"vault"
STABLE_MINT_DECIMALS = 6
STABLECOIN_NAME    = "Bach Dollar"   (16 bytes, null-padded)
STABLECOIN_SYMBOL  = "BACHD"         (8 bytes, null-padded)
GOVERNANCE_MINT    = CTQBjyrX8pYyqbNa8vAhQfnRXfu9cUxnvrxj5PvbzTmf
```

## SDK usage pattern

```ts
import { BachMoneyClient, openVault, findVaultPda } from "@bach-money/sdk";

const client = new BachMoneyClient(connection, PROGRAM_ID);

// Read
const vault = await client.fetchVaultPosition(owner, collateralMint);
const ratio = client.collateralRatio(vault, collateral);
const canLiquidate = client.isLiquidatable(vault, collateral);

// Write — compose instruction, sign externally
const [vaultPda] = await findVaultPda(owner, collateralMint, PROGRAM_ID);
const ix = openVault({ owner, configPda, collateralConfigPda, vaultPda, programId: PROGRAM_ID });
```

## Adding a new app

1. Create `apps/<name>/` with its own `package.json` (name: `@bach-money/<name>`)
2. Extend `packages/config-typescript/nextjs.json` (or `base.json`) in its `tsconfig.json`
3. Add `@bach-money/sdk` as a dependency if it needs on-chain access
4. `pnpm install` picks it up automatically via `pnpm-workspace.yaml`

## Adding a new package

1. Create `packages/<name>/` with `package.json` (name: `@bach-money/<name>`)
2. It will be included automatically by `pnpm-workspace.yaml`
3. Add it as a `workspace:*` dependency in any app or package that needs it

## Build commands

```bash
pnpm dev          # turbo dev — starts all apps in watch mode
pnpm build        # turbo build — builds sdk then app in dependency order
pnpm lint         # turbo lint across all packages

pnpm --filter @bach-money/app dev      # run only the Next.js app
pnpm --filter @bach-money/sdk build    # build only the SDK

cargo check                            # check Rust program
cargo test --manifest-path protocol/Cargo.toml  # run protocol unit tests
```

## What this repo is not

- The marketing/landing site lives in `bach-money` (separate repo)
- The stats dashboard lives in `bach-money-stats` (separate repo)
- The Astro docs site lives in `bach-money-docs` (separate repo)
- There is no Anchor — the program uses raw `solana-program` with manual Borsh serialization
