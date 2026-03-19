import { v } from "convex/values"

// ─── Reusable validators (shared between schema and mutations) ───

export const assetMarketPriceValidator = v.object({
  basePrice: v.number(),
  buyFactor: v.number(),
  sellFactor: v.number(),
})

export const marketStateValidator = v.object({
  regime: v.union(v.literal("bull"), v.literal("bear")),
  inflation: v.number(),
  prices: v.object({
    wood: assetMarketPriceValidator,
    potatoes: assetMarketPriceValidator,
    fish: assetMarketPriceValidator,
  }),
})

export const portfolioValidator = v.object({
  gold: v.number(),
  wood: v.number(),
  potatoes: v.number(),
  fish: v.number(),
})

export const playerActionValidator = v.object({
  type: v.union(v.literal("buy"), v.literal("sell")),
  asset: v.union(v.literal("wood"), v.literal("potatoes"), v.literal("fish")),
  quantity: v.number(),
})

// ─── Event validators ────────────────────────────────────────────

/**
 * Event validator - type field contains the event ID (e.g. "forest_fire", "mice_infestation")
 */
export const gameEventValidator = v.object({
  type: v.string(),
  name: v.string(),
  description: v.string(),
  targetAsset: v.optional(v.union(v.literal("wood"), v.literal("potatoes"), v.literal("fish"))),
  effects: v.optional(
    v.object({
      quantityMultiplier: v.optional(v.number()),
      goldDelta: v.optional(v.number()),
      priceMultiplier: v.optional(v.number()),
    }),
  ),
})

// Legacy validators for old scenario data (not used by new event system)
export const globalEventDefinitionValidator = v.object({
  type: v.string(),
  name: v.string(),
  description: v.string(),
  probability: v.number(),
  quantityMultiplier: v.optional(v.number()),
  goldDelta: v.optional(v.number()),
  priceMultiplier: v.optional(v.number()),
})

export const assetEventConfigValidator = v.object({
  type: v.string(),
  name: v.string(),
  description: v.string(),
  probability: v.number(),
  quantityMultiplier: v.optional(v.number()),
  priceMultiplier: v.optional(v.number()),
})

// ─── Scenario validators ─────────────────────────────────────────

export const assetPricingValidator = v.object({
  startPrice: v.number(),
  priceReturn: v.number(),
  priceVolatility: v.number(),
  event: assetEventConfigValidator,
})

export const marketParamsValidator = v.object({
  bearToBullProbability: v.number(),
  bullToBearProbability: v.number(),
  bullReturn: v.number(),
  bearReturn: v.number(),
  bullVolatility: v.number(),
  bearVolatility: v.number(),
})

export const precomputedStepValidator = v.object({
  market: marketStateValidator,
  events: v.array(gameEventValidator),
})

export const scenarioFieldsValidator = {
  name: v.string(),
  description: v.string(),
  icon: v.optional(v.string()),
  mode: v.optional(v.union(v.literal("live"), v.literal("precomputed"))),
  precomputedTrajectories: v.optional(v.array(precomputedStepValidator)),
  startCapital: v.number(),
  recurringRevenue: v.number(),
  startYear: v.number(),
  endYear: v.number(),
  buyFactor: v.number(),
  sellFactor: v.number(),
  inflationReturn: v.number(),
  inflationVolatility: v.number(),
  market: marketParamsValidator,
  assets: v.object({
    wood: assetPricingValidator,
    potatoes: assetPricingValidator,
    fish: assetPricingValidator,
  }),
  globalEvents: v.array(globalEventDefinitionValidator),
  goalAmount: v.number(),
}
