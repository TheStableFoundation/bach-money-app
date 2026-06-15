import Link from "next/link";
import { NetworkSwitcher } from "@/components/NetworkSwitcher";
import { SiteFooter } from "@/components/SiteFooter";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10 sm:px-8">
      <header className="flex items-center justify-between">
        <span className="text-base font-semibold tracking-tight">
          Bach Money
        </span>
        <NetworkSwitcher />
      </header>

      <main className="flex flex-1 flex-col justify-center py-16">
        <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          An over-collateralized stablecoin on Solana.
        </h1>
        <p className="mt-5 max-w-md text-base text-muted">
          Lock collateral, mint <span className="text-ink">toneUSD</span>, and
          keep your position healthy. Governed by the community of deflationary
          €BACH holders.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/vault"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-6 text-sm font-medium text-bg transition-colors hover:bg-accent-ink"
          >
            Launch app
          </Link>
          <a
            href="https://bach.money/whitepaper"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-6 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            Whitepaper
          </a>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
