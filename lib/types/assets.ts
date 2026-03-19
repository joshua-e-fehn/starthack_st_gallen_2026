/**
 * Asset system — single source of truth for all asset keys.
 * To add a new asset: add it to ASSET_KEYS (and TRADABLE_ASSET_KEYS if not gold).
 * All types, validators, and engine logic derive from these arrays.
 *
 * Real-world finance ↔ Game-world mapping:
 *   Currency : Euro       ↔ Gold
 *   Low risk : Safe ETF   ↔ Wood   (stable, slow growth)
 *   Mid risk : Aktien     ↔ Potatoes (moderate volatility)
 *   High risk: Bitcoin    ↔ Fish   (high volatility, high potential return)
 *
 * Income = recurring gold from your farm
 * Market phase: Peace/War = prosperity/conflict
 */

export const ASSET_KEYS = ["gold", "wood", "potatoes", "fish"] as const
export type AssetKey = (typeof ASSET_KEYS)[number]

/** Tradable assets — everything except gold (gold is the currency) */
export const TRADABLE_ASSET_KEYS = ["wood", "potatoes", "fish"] as const
export type TradableAsset = (typeof TRADABLE_ASSET_KEYS)[number]

/** Risk tier for display / classification purposes */
export type RiskTier = "low" | "medium" | "high"

export const ASSET_RISK: Record<TradableAsset, RiskTier> = {
  wood: "low",
  potatoes: "medium",
  fish: "high",
}

/** Portfolio: quantity of each asset held. Gold is the currency balance. */
export type Portfolio = Record<AssetKey, number>

/** Create a portfolio with all assets zeroed, optionally setting starting gold */
export function createPortfolio(gold = 0): Portfolio {
  return { gold, wood: 0, potatoes: 0, fish: 0 }
}
