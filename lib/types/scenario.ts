import type { TradableAsset } from "./assets"
import type { AssetEventConfig, GlobalEventDefinition } from "./events"

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

/**
 * Full scenario configuration (α on the whiteboard).
 *
 * Static parameters that define a game:
 *   Startkapital, Einkommen, Event-Wahrscheinlichkeit,
 *   Asset-Wachstumsrate, Asset-Volatilitäten
 */
export type Scenario = {
  id: string
  name: string
  description: string
  startCapital: number
  recurringRevenue: number
  startDate: string
  endDate: string
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
  /** Global events that can fire each step (Pest, Diebe, Krise, etc.) */
  globalEvents: GlobalEventDefinition[]
}
