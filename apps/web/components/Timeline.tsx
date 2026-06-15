import {
  CurrencyDollarIcon,
  FireIcon,
  GlobeAltIcon,
  GlobeAsiaAustraliaIcon,
  MapIcon,
  MoonIcon,
  SunIcon,
} from "@heroicons/react/24/solid"
import type { ComponentType, CSSProperties, ReactNode } from "react"
import { twMerge } from "tailwind-merge"

type IconColor = "gray" | "green" | "purple" | "yellow"

const iconColorClasses: Record<IconColor, string> = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-green-100 text-green-700",
  purple: "bg-purple-100 text-purple-700",
  yellow: "bg-yellow-100 text-yellow-700",
}

const PURPLE = "#9932CC"
const INK = "#111827"

type TimelineEntry = {
  icon: ComponentType<{ className?: string }>
  iconColor: IconColor
  iconClassName?: string
  title: ReactNode
  titleStyle?: CSSProperties
  badge?: string
  subtitle: ReactNode
  subtitleStyle?: CSSProperties
}

const entries: TimelineEntry[] = [
  {
    icon: SunIcon,
    iconColor: "gray",
    title: "The Big Bang",
    subtitle: "13.79 billion years ago",
  },
  {
    icon: GlobeAsiaAustraliaIcon,
    iconColor: "green",
    title: "Earth",
    subtitle: "4.5 billion years ago",
  },
  {
    icon: MapIcon,
    iconColor: "gray",
    title: "BACH was born",
    subtitle: "21 March 1685",
  },
  {
    icon: MoonIcon,
    iconColor: "purple",
    iconClassName: "text-purple-600",
    title: "Solana first block",
    titleStyle: { color: PURPLE },
    subtitle: "16 March 2020",
  },
  {
    icon: CurrencyDollarIcon,
    iconColor: "green",
    title: "€BACH was minted.",
    subtitle: (
      <>
        December 31, 2021. Total supply 18,419,500.{" "}
        <span className="font-bold text-purple-600 italic">Chromatic</span>.
      </>
    ),
  },
  {
    icon: GlobeAltIcon,
    iconColor: "green",
    title: "€BACH Community",
    badge: "We are here",
    subtitle: "2021 - 2025. Airdrops, token burn, liquidity.",
  },
  {
    icon: GlobeAltIcon,
    iconColor: "green",
    title: "NotWallet Crypto v1 Release",
    titleStyle: { color: INK },
    subtitle: (
      <>
        Visit{" "}
        <a
          href="https://notwallet.eu"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 underline hover:text-green-800"
        >
          NotWallet Crypto non-custodial Solana stablecoin wallet.
        </a>
      </>
    ),
    subtitleStyle: { color: INK },
  },
  {
    icon: FireIcon,
    iconColor: "purple",
    iconClassName: "text-purple-600",
    title: "1st midsummer burn",
    titleStyle: { color: PURPLE },
    subtitle: "21 June 2025. Target total supply: 12,000,000",
  },
  {
    icon: FireIcon,
    iconColor: "purple",
    iconClassName: "text-purple-600",
    title: "ICO Preparation",
    titleStyle: { color: PURPLE },
    badge: "We are here",
    subtitle: "Non-profit organization, IPs coordination, legal stuff, and more.",
  },
  {
    icon: CurrencyDollarIcon,
    iconColor: "yellow",
    iconClassName: "text-yellow-500",
    title: "Token Upgrade",
    titleStyle: { color: INK },
    subtitle: (
      <a
        href="https://spl.solana.com/token-upgrade"
        target="_blank"
        rel="noopener noreferrer"
        className="text-green-600 underline hover:text-black"
      >
        SPL Token 2022 upgrade
      </a>
    ),
    subtitleStyle: { color: INK },
  },
  {
    icon: CurrencyDollarIcon,
    iconColor: "purple",
    title: "NotDAX Digital Assets Exchange",
    titleStyle: { color: PURPLE },
    subtitle: (
      <>
        2026, Q3.{" "}
        <a
          href="https://notdax.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 underline hover:text-purple-800"
        >
          Visit NotDAX
        </a>
      </>
    ),
  },
  {
    icon: FireIcon,
    iconColor: "purple",
    iconClassName: "text-purple-600",
    title: "12th burn",
    titleStyle: { color: PURPLE },
    subtitle: "Target total supply: 2,100,000",
  },
  {
    icon: GlobeAltIcon,
    iconColor: "green",
    title: "Ubiquity",
    subtitle: "Money flows like data.™",
  },
]

export default function TimelineView() {
  return (
    <div className="w-[25rem]">
      <ol className="relative flex flex-col">
        {entries.map((entry, index) => {
          const Icon = entry.icon
          const isLast = index === entries.length - 1
          return (
            <li key={index} className="relative flex gap-4 pb-8 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute top-12 left-[22px] -ml-px h-[calc(100%-2.5rem)] w-0.5 bg-gray-200"
                />
              )}
              <span
                className={twMerge(
                  "z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                  iconColorClasses[entry.iconColor],
                )}
              >
                <Icon className={twMerge("h-5 w-5", entry.iconClassName)} />
              </span>
              <div className="border-slate-100 shadow-slate-900/5 flex flex-col gap-1 rounded-xl border bg-white px-4 py-3 text-left shadow-lg">
                <div className="flex items-center gap-2">
                  <h6
                    className="text-base font-semibold text-slate-700"
                    style={entry.titleStyle}
                  >
                    {entry.title}
                  </h6>
                  {entry.badge && (
                    <span className="rounded-full bg-purple-200 px-3 py-1 text-xs font-semibold text-purple-700 shadow">
                      {entry.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm font-normal text-gray-600" style={entry.subtitleStyle}>
                  {entry.subtitle}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
