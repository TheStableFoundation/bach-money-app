import { Metadata } from "next"
import Link from "next/link"
import Footer from "../components/Layout/Footer"
import { LP_GRID_ITEMS } from "../lp-items"

export const metadata: Metadata = {
  title: "BACH Money — A decentralized stablecoin platform",
  description:
    "The Stable Foundation is a decentralized autonomous organization (DAO) built on the Solana blockchain, designed to revolutionize the global music industry and its derivatives through community-driven governance, transparency, and innovation.",
  twitter: {
    card: "summary_large_image",
  },
  openGraph: {
    url: "https://bach.money/",
    images: [
      {
        width: 1200,
        height: 630,
        url: "https://station.jup.ag/assets/images/full-routing-banner-98ca8b117cc86aa7d4fadf45b56d5a7c.png",
      },
    ],
  },
}

export default function Web() {
  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-semibold tracking-tight text-ink">
            Bach Money
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/tokenomics" className="hidden text-sm text-muted transition-colors hover:text-ink sm:block">
              Tokenomics
            </Link>
            <Link href="/timeline" className="hidden text-sm text-muted transition-colors hover:text-ink sm:block">
              Timeline
            </Link>
            <a
              href="https://app.bach.money"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-bg transition-colors hover:bg-accent-ink"
            >
              Launch app
            </a>
          </nav>
        </div>
      </header>

      {/* Announcement banner */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <div className="text-center">
            <Link
              href="https://drive.google.com/file/d/1iD5Fs9xkWS_TdwGF5kV1-vHq0yye0h9X/view"
              target="__blank"
              className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-positive"></span>
              The Stable Foundation whitepaper v1.0.0
            </Link>
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="py-24 md:py-32 lg:py-40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="label rounded-full border border-border px-3 py-1">
              Open Source · Decentralized · EU-Built
            </span>

            <h1 className="mt-8 text-5xl font-semibold tracking-tight text-ink md:text-6xl lg:text-7xl">
              An over-collateralized stablecoin on Solana.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted md:text-xl">
              Lock collateral, mint <span className="text-ink">toneUSD</span>, and keep your position healthy. Built for
              transparency and community governance.
            </p>

            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted">
              Governed by the{" "}
              <a
                href="https://solscan.io/token/CTQBjyrX8pYyqbNa8vAhQfnRXfu9cUxnvrxj5PvbzTmf"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink underline decoration-border underline-offset-4 transition-colors hover:decoration-ink"
              >
                €BACH token
              </a>
              , a fixed-supply deflationary governance token of The Stable Foundation DAO.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="https://app.bach.money"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-6 text-sm font-medium text-bg transition-colors hover:bg-accent-ink"
              >
                Launch app
              </a>
              <Link
                href="/tokenomics"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-6 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
              >
                Tokenomics
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">Built for the long term</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted">
              Scandinavian restraint meets on-chain transparency — a calm, community-governed platform with nothing to
              hide.
            </p>
          </div>

          <div className="grid gap-10 md:grid-cols-3 lg:gap-14">
            {LP_GRID_ITEMS.map((item) => (
              <div key={item.title} className="group text-center">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-2 text-muted transition-colors group-hover:text-ink">
                  <div className="h-6 w-6">{item.icon}</div>
                </div>
                <h3 className="mb-3 text-lg font-semibold text-ink">{item.title}</h3>
                <p className="leading-relaxed text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open source */}
      <section className="border-t border-border py-20 md:py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-2 text-muted">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 .333A9.911 9.911 0 0 0 6.866 19.65c.5.092.678-.215.678-.477 0-.237-.01-1.017-.014-1.845-2.757.6-3.338-1.169-3.338-1.169a2.627 2.627 0 0 0-1.1-1.451c-.9-.615.07-.6.07-.6a2.084 2.084 0 0 1 1.518 1.021 2.11 2.11 0 0 0 2.884.823c.044-.503.268-.973.63-1.325-2.2-.25-4.516-1.1-4.516-4.9A3.832 3.832 0 0 1 4.7 7.068a3.56 3.56 0 0 1 .095-2.623s.832-.266 2.726 1.016a9.409 9.409 0 0 1 4.962 0c1.89-1.282 2.717-1.016 2.717-1.016.366.83.402 1.768.1 2.623a3.827 3.827 0 0 1 1.02 2.659c0 3.807-2.319 4.644-4.525 4.889a2.366 2.366 0 0 1 .673 1.834c0 1.326-.012 2.394-.012 2.72 0 .263.18.572.681.475A9.911 9.911 0 0 0 10 .333Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-ink">Open source by design</h2>
          <p className="mx-auto mt-4 mb-8 max-w-xl text-base text-muted">
            Transparency and community collaboration are at the heart of everything we build. Explore the codebase and
            help shape the future of decentralized finance.
          </p>
          <a
            href="https://github.com/TheStableFoundation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-6 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 .333A9.911 9.911 0 0 0 6.866 19.65c.5.092.678-.215.678-.477 0-.237-.01-1.017-.014-1.845-2.757.6-3.338-1.169-3.338-1.169a2.627 2.627 0 0 0-1.1-1.451c-.9-.615.07-.6.07-.6a2.084 2.084 0 0 1 1.518 1.021 2.11 2.11 0 0 0 2.884.823c.044-.503.268-.973.63-1.325-2.2-.25-4.516-1.1-4.516-4.9A3.832 3.832 0 0 1 4.7 7.068a3.56 3.56 0 0 1 .095-2.623s.832-.266 2.726 1.016a9.409 9.409 0 0 1 4.962 0c1.89-1.282 2.717-1.016 2.717-1.016.366.83.402 1.768.1 2.623a3.827 3.827 0 0 1 1.02 2.659c0 3.807-2.319 4.644-4.525 4.889a2.366 2.366 0 0 1 .673 1.834c0 1.326-.012 2.394-.012 2.72 0 .263.18.572.681.475A9.911 9.911 0 0 0 10 .333Z"
                clipRule="evenodd"
              />
            </svg>
            View on GitHub
          </a>
        </div>
      </section>

      <Footer />
    </>
  )
}
