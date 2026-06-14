"use client";

import dynamic from "next/dynamic";

// Rendered client-side only to avoid a hydration mismatch on wallet state.
export const WalletButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);
