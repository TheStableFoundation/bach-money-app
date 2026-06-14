"use client";

import { Buffer } from "buffer";
import { useMemo, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import type { Adapter } from "@solana/wallet-adapter-base";
import { RPC_ENDPOINT } from "@/lib/solana/config";
import "@solana/wallet-adapter-react-ui/styles.css";

// @solana/web3.js and the SDK reference the global Buffer; provide it in the
// browser where it is not defined by default.
if (typeof globalThis !== "undefined" && !("Buffer" in globalThis)) {
  (globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;
}

export function Providers({ children }: { children: ReactNode }) {
  // Empty list — modern wallets are discovered via the Wallet Standard.
  const wallets = useMemo<Adapter[]>(() => [], []);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
