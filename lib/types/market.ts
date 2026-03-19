import type { TradableAsset } from "./assets"

export type MarketRegime = "peace" | "war" | "bull" | "bear"

/**
 * Price info for a single tradable asset at a given timestep.
 *
 * Stores a **real** base price (inflation-independent) and two
 * premium/discount factors close to 1:
 *   - buyFactor  > 1  (e.g. 1.05 → 5 % markup when buying)
 *   - sellFactor < 1  (e.g. 0.95 → 5 % discount when selling)
 *
 * Nominal (displayed) prices:
 *   nominalBase = basePrice × inflation
 *   buyPrice    = nominalBase × buyFactor
 *   sellPrice   = nominalBase × sellFactor
 */
export type AssetMarketPrice = {
  /** Real base price (before inflation) */
  basePrice: number
  /** Multiplicative factor for the buy price (> 1, e.g. 1.05) */
  buyFactor: number
  /** Multiplicative factor for the sell price (< 1, e.g. 0.95) */
  sellFactor: number
}

/** Full market state at a given timestep */
export type MarketState = {
  regime: MarketRegime
  /** Cumulative inflation factor (starts at 1.0) */
  inflation: number
  prices: Record<TradableAsset, AssetMarketPrice>
}

// ─── Derived price helpers ───────────────────────────────────────

/** Nominal (inflation-adjusted) base price */
export function nominalPrice(mp: AssetMarketPrice, inflation: number): number {
  return mp.basePrice * inflation
}

/** Price a player pays when buying one unit */
export function buyPrice(mp: AssetMarketPrice, inflation: number): number {
  return mp.basePrice * inflation * mp.buyFactor
}

/** Price a player receives when selling one unit */
export function sellPrice(mp: AssetMarketPrice, inflation: number): number {
  return mp.basePrice * inflation * mp.sellFactor
}
