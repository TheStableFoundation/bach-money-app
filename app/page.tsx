import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl sm:text-5xl font-bold text-center sm:text-left">
          <a
            className="text-primary"
            href="https://bach.money"
            target="_blank"
            rel="noopener noreferrer"
          >
            Bach Money dApp
          </a>
        </h1>
        <p className="text-center sm:text-left">Decentralized Finance (DeFi)</p>
        <ol className="list-inside list-decimal text-sm/6 text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="tracking-[-.01em]">
            A decentralized stablecoin platform.
          </li>
          <li className="tracking-[-.01em]">
            Governed by the community of deflationary €BACH token holders.
          </li>
          <li className="tracking-[-.01em]">Built on Solana.</li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link
            className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white transition-opacity hover:opacity-90 flex items-center justify-center font-semibold text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="/buy-crypto"
          >
            Buy Crypto
          </Link>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://bach.money/whitepaper"
            target="_blank"
            rel="noopener noreferrer"
          >
            Whitepaper
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://docs.bach.money"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Docs{" "}
          <span className="text-xs text-gray-400 dark:text-red-500">WIP</span>
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://bachmoney-stats.5mb.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Stats{" "}
          <span className="text-xs text-gray-400 dark:text-red-500">WIP</span>
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://bach.money"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to bach.money →
        </a>
      </footer>
    </div>
  );
}
