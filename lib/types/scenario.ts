import type { TradableAsset } from "./assets"
import type { AssetEventConfig, GameEvent, GlobalEventDefinition } from "./events"
import type { MarketState } from "./market"

/** Per-asset pricing + event risk parameters within a scenario */
export type AssetPricing = {
  startPrice: number
  priceReturn: number
  priceVolatility: number
  /** Asset-specific risk event (e.g. crop_failure for potatoes) */
  event: AssetEventConfig
}

/** Maps every tradable asset to its pricing parameters */
export type AssetPricingMap = Record<TradableAsset, AssetPricing>

/** Market-regime transition & return parameters */
export type MarketParams = {
  bearToBullProbability: number
  bullToBearProbability: number
  bullReturn: number
  bearReturn: number
  bullVolatility: number
  bearVolatility: number
}

/** A single precomputed step containing the market state and events that fired */
export type PrecomputedStep = {
  market: MarketState
  events: GameEvent[]
}

/**
 * Full scenario configuration (α on the whiteboard).
 *
 * Static parameters that define a game:
 *   Start capital, Income, Event probabilities,
 *   Asset growth rates, Asset volatilities
 */
export type Scenario = {
  id: string
  name: string
  description: string
  mode: "live" | "precomputed"
  /** Only populated if mode === "precomputed" */
  precomputedTrajectories?: PrecomputedStep[]
  startCapital: number
  recurringRevenue: number
  /** First year of the simulation (e.g. 1400) */
  startYear: number
  /** Last year (exclusive) — game ends when year >= endYear */
  endYear: number
  /** Multiplicative factor for buy price (> 1, e.g. 1.05 = 5 % markup) */
  buyFactor: number
  /** Multiplicative factor for sell price (< 1, e.g. 0.95 = 5 % discount) */
  sellFactor: number
  /** Average per-step inflation rate */
  inflationReturn: number
  /** Volatility of per-step inflation */
  inflationVolatility: number
  market: MarketParams
  assets: AssetPricingMap
  /** Global events that can fire each step (Plague, Thieves, Crisis, etc.) */
  globalEvents: GlobalEventDefinition[]
  /** Target portfolio value the player must reach (nominal, adjusts with inflation) */
  goalAmount: number
}
