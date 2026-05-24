"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

declare global {
  interface Window {
    Stripe: any;
    StripeOnramp: any;
  }
}

export default function BuyCryptoPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [destinationCurrency, setDestinationCurrency] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOnramp, setShowOnramp] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [onrampLoaded, setOnrampLoaded] = useState(false);

  const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  useEffect(() => {
    // Load Stripe.js
    const loadStripeJS = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.Stripe) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://js.stripe.com/v3/";
        script.async = true;
        script.onload = () => {
          console.log("Stripe.js loaded");
          setStripeLoaded(true);
          resolve();
        };
        script.onerror = () => reject(new Error("Failed to load Stripe.js"));
        document.head.appendChild(script);
      });
    };

    // Load Stripe Crypto Onramp SDK
    const loadCryptoOnrampSDK = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.StripeOnramp) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://crypto-js.stripe.com/crypto-onramp-outer.js";
        script.async = true;
        script.onload = () => {
          console.log("Stripe Crypto Onramp SDK loaded");
          setOnrampLoaded(true);
          resolve();
        };
        script.onerror = () =>
          reject(new Error("Failed to load Crypto Onramp SDK"));
        document.head.appendChild(script);
      });
    };

    Promise.all([loadStripeJS(), loadCryptoOnrampSDK()]).catch((error) => {
      console.error("Error loading Stripe scripts:", error);
      setError("Failed to load payment system. Please refresh the page.");
    });
  }, []);

  const handleBuyCrypto = async () => {
    setError("");

    if (!walletAddress.trim()) {
      setError("Please enter a valid wallet address");
      return;
    }

    // Basic Solana address validation (32-44 characters, base58)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      setError("Please enter a valid Solana wallet address");
      return;
    }

    if (!STRIPE_PUBLISHABLE_KEY) {
      setError("Stripe is not configured. Please contact support.");
      return;
    }

    setLoading(true);

    try {
      // Create onramp session
      const response = await fetch("/api/create-onramp-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          destination_currency: destinationCurrency || "sol",
          destination_network: "solana",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create session");
      }

      const { client_secret } = await response.json();

      // Wait for Crypto Onramp to be initialized
      if (!window.StripeOnramp) {
        let attempts = 0;
        while (!window.StripeOnramp && attempts < 50) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }
      }

      if (window.StripeOnramp) {
        const stripeOnramp = window.StripeOnramp(STRIPE_PUBLISHABLE_KEY);
        const session = stripeOnramp.createSession({
          clientSecret: client_secret,
          appearance: {
            theme: "light",
          },
        });

        // Mount the onramp element
        const onrampElement = document.getElementById("onramp-element");
        if (onrampElement) {
          setShowOnramp(true);
          session.mount("#onramp-element");
        }

        // Listen for session events
        session.addEventListener("onramp_session_updated", (e: any) => {
          console.log("Onramp session updated:", e.payload);

          if (e.payload.session.status === "fulfillment_complete") {
            console.log("Transaction complete!");
          }
        });
      } else {
        throw new Error("Stripe Onramp SDK not loaded");
      }
    } catch (error) {
      console.error("Error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to initialize crypto purchase. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-4xl">
        <div className="flex items-center justify-between w-full mb-4">
          <h1 className="text-4xl sm:text-5xl font-bold">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              Bach Money dApp
            </Link>
          </h1>
          <Link
            href="/"
            className="text-sm hover:underline hover:underline-offset-4"
          >
            ← Back
          </Link>
        </div>

        <div className="w-full text-center sm:text-left">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Buy Crypto Instantly
          </h2>
          <p className="text-sm sm:text-base opacity-80">
            Purchase cryptocurrency directly to your Solana wallet using credit
            card, debit card, or bank transfer. Powered by Stripe.
          </p>
        </div>

        {/* Wallet Address Input Section */}
        <div
          className={`w-full transition-all duration-300 ${
            showOnramp ? "hidden" : ""
          }`}
        >
          <div className="flex flex-col gap-6">
            <div>
              <label
                htmlFor="wallet-address"
                className="block text-sm font-medium mb-2 font-[family-name:var(--font-geist-mono)]"
              >
                Your Solana Wallet Address
              </label>
              <input
                type="text"
                id="wallet-address"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter your Solana wallet address..."
                className="w-full px-4 py-3 bg-[var(--background)] border border-black/[.08] dark:border-white/[.145] rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors placeholder:opacity-50"
              />
              <p className="text-xs opacity-60 mt-2 font-[family-name:var(--font-geist-mono)]">
                Enter your Solana wallet address to receive crypto
              </p>
            </div>

            <div>
              <label
                htmlFor="destination-currency"
                className="block text-sm font-medium mb-2 font-[family-name:var(--font-geist-mono)]"
              >
                Select Cryptocurrency
              </label>
              <select
                id="destination-currency"
                value={destinationCurrency}
                onChange={(e) => setDestinationCurrency(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--background)] border border-black/[.08] dark:border-white/[.145] rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-colors"
              >
                <option value="">Select currency</option>
                <option value="sol">Solana (SOL)</option>
                <option value="usdc">USD Coin (USDC)</option>
                <option value="usdt">Tether (USDT)</option>
              </select>
            </div>

            <button
              onClick={handleBuyCrypto}
              disabled={loading || !stripeLoaded || !onrampLoaded}
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-semibold text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Creating session..."
                : !stripeLoaded || !onrampLoaded
                  ? "Loading..."
                  : "Buy Crypto"}
            </button>

            {error && (
              <div className="mt-2 text-red-600 dark:text-red-400 text-sm border border-red-600/20 dark:border-red-400/20 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg font-[family-name:var(--font-geist-mono)]">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Crypto Onramp Container */}
        <div
          id="onramp-container"
          className={`w-full transition-all duration-300 ${
            showOnramp ? "block" : "hidden"
          }`}
        >
          <div id="onramp-element" className="onramp-wrapper"></div>
        </div>

        {/* Information Section */}
        <div className="grid sm:grid-cols-3 gap-6 w-full mt-8">
          <div className="flex flex-col gap-4 border border-black/[.08] dark:border-white/[.145] p-6 rounded-lg hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 border border-black/[.08] dark:border-white/[.145] rounded-lg">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  ></path>
                </svg>
              </div>
              <h3 className="font-semibold text-sm">Secure & Safe</h3>
            </div>
            <p className="text-xs opacity-70 font-[family-name:var(--font-geist-mono)]">
              Your transactions are secured by Stripe&apos;s industry-leading
              payment infrastructure.
            </p>
          </div>

          <div className="flex flex-col gap-4 border border-black/[.08] dark:border-white/[.145] p-6 rounded-lg hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 border border-black/[.08] dark:border-white/[.145] rounded-lg">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  ></path>
                </svg>
              </div>
              <h3 className="font-semibold text-sm">Fast Processing</h3>
            </div>
            <p className="text-xs opacity-70 font-[family-name:var(--font-geist-mono)]">
              Receive your crypto quickly with instant processing and delivery.
            </p>
          </div>

          <div className="flex flex-col gap-4 border border-black/[.08] dark:border-white/[.145] p-6 rounded-lg hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 border border-black/[.08] dark:border-white/[.145] rounded-lg">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  ></path>
                </svg>
              </div>
              <h3 className="font-semibold text-sm">
                Multiple Payment Methods
              </h3>
            </div>
            <p className="text-xs opacity-70 font-[family-name:var(--font-geist-mono)]">
              Pay with credit card, debit card, or bank transfer - whatever
              works for you.
            </p>
          </div>
        </div>
      </main>

      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4 text-sm"
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
          Docs
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4 text-sm"
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

      <style jsx global>{`
        /* Custom styles for Stripe Onramp element */
        #onramp-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          width: 100%;
          padding: 0;
        }

        .onramp-wrapper {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          width: 100%;
          max-width: 600px;
          min-height: 600px;
          padding: 0 !important;
          margin: 0 auto;
        }

        /* Target the Stripe iframe directly */
        #onramp-element iframe,
        #onramp-element > div,
        #onramp-element > div > iframe {
          width: 100% !important;
          max-width: 600px !important;
          margin: 0 auto !important;
          padding: 0 !important;
          border-radius: 0.75rem;
          border: 1px solid rgba(0, 0, 0, 0.08);
          display: block !important;
        }

        @media (prefers-color-scheme: dark) {
          #onramp-element iframe,
          #onramp-element > div,
          #onramp-element > div > iframe {
            border: 1px solid rgba(255, 255, 255, 0.145);
          }
        }

        @media (max-width: 768px) {
          .onramp-wrapper {
            max-width: 100%;
          }

          #onramp-element iframe,
          #onramp-element > div,
          #onramp-element > div > iframe {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
