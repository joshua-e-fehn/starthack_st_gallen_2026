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

const globalEventTypeValidator = v.union(
  v.literal("plague"),
  v.literal("thieves"),
  v.literal("market_crash"),
  v.literal("good_harvest"),
)

const assetEventTypeValidator = v.union(
  v.literal("forest_wildfire"),
  v.literal("crop_failure"),
  v.literal("cooling_failure"),
)

const eventTypeValidator = v.union(
  v.literal("plague"),
  v.literal("thieves"),
  v.literal("market_crash"),
  v.literal("good_harvest"),
  v.literal("forest_wildfire"),
  v.literal("crop_failure"),
  v.literal("cooling_failure"),
)

export const globalEventDefinitionValidator = v.object({
  type: globalEventTypeValidator,
  name: v.string(),
  description: v.string(),
  probability: v.number(),
  quantityMultiplier: v.optional(v.number()),
  goldDelta: v.optional(v.number()),
  priceMultiplier: v.optional(v.number()),
})

export const assetEventConfigValidator = v.object({
  type: assetEventTypeValidator,
  name: v.string(),
  description: v.string(),
  probability: v.number(),
  quantityMultiplier: v.optional(v.number()),
  priceMultiplier: v.optional(v.number()),
})

export const gameEventValidator = v.object({
  type: eventTypeValidator,
  name: v.string(),
  description: v.string(),
  targetAsset: v.optional(v.union(v.literal("wood"), v.literal("potatoes"), v.literal("fish"))),
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

export const scenarioFieldsValidator = {
  name: v.string(),
  description: v.string(),
  startCapital: v.number(),
  recurringRevenue: v.number(),
  startDate: v.string(),
  endDate: v.string(),
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
}
