import type { TokenInfo } from "@/lib/solana/config";

/**
 * The single decimals-aware token formatter for the whole app.
 *
 * All amounts move as `bigint` base units (the smallest unit of the token, e.g.
 * a semitone for BACH). Display and input parsing both go through here, so no
 * component hardcodes a decimal constant — pass the token's `decimals` instead.
 */

/** Format base units to a human string, e.g. (12_500000n, 6) -> "12.5". */
export function formatUnits(
  amount: bigint,
  decimals: number,
  opts: { maxFractionDigits?: number; group?: boolean } = {},
): string {
  const { maxFractionDigits = decimals, group = true } = opts;
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const base = 10n ** BigInt(decimals);

  const whole = abs / base;
  let fraction = (abs % base).toString().padStart(decimals, "0");
  if (maxFractionDigits < decimals) {
    fraction = fraction.slice(0, maxFractionDigits);
  }
  fraction = fraction.replace(/0+$/, "");

  let wholeStr = whole.toString();
  if (group) {
    wholeStr = wholeStr.replace(/\B(?=(\d{3})+(?!\d))/g, " "); // thin space
  }

  return `${negative ? "-" : ""}${wholeStr}${fraction ? `.${fraction}` : ""}`;
}

/** Parse a user-entered string into base units, e.g. ("12.5", 6) -> 12_500000n. */
export function parseUnits(value: string, decimals: number): bigint {
  const cleaned = value.trim().replace(/[\s, ]/g, "");
  if (cleaned === "" || cleaned === "." || cleaned === "-") return 0n;

  const negative = cleaned.startsWith("-");
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [whole = "0", fraction = ""] = unsigned.split(".");

  const fractionPadded = (fraction + "0".repeat(decimals)).slice(0, decimals);
  const result =
    BigInt(whole || "0") * 10n ** BigInt(decimals) +
    BigInt(fractionPadded || "0");

  return negative ? -result : result;
}

/** Format with the token's symbol appended, e.g. "12.5 toneUSD". */
export function formatToken(
  amount: bigint,
  token: Pick<TokenInfo, "decimals" | "symbol">,
  opts?: { maxFractionDigits?: number },
): string {
  return `${formatUnits(amount, token.decimals, opts)} ${token.symbol}`;
}

/** Is the parsed value a positive amount within the available balance? */
export function isValidAmount(
  value: string,
  decimals: number,
  max?: bigint,
): boolean {
  let parsed: bigint;
  try {
    parsed = parseUnits(value, decimals);
  } catch {
    return false;
  }
  if (parsed <= 0n) return false;
  if (max !== undefined && parsed > max) return false;
  return true;
}

/** USD value (1e6-scaled) -> "$1,234.56" style string. */
export function formatUsd(valueE6: bigint): string {
  return `$${formatUnits(valueE6, 6, { maxFractionDigits: 2 })}`;
}
