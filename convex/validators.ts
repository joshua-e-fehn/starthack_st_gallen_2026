import { v } from "convex/values"

// ─── Reusable validators (shared between schema and mutations) ───

export const assetMarketPriceValidator = v.object({
  basePrice: v.number(),
  buyFactor: v.number(),
  sellFactor: v.number(),
})

export const marketStateValidator = v.object({
  regime: v.union(v.literal("peace"), v.literal("war")),
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
  v.literal("fire"),
  v.literal("mice_infestation"),
  v.literal("cooling_failure"),
)

const eventTypeValidator = v.union(
  v.literal("plague"),
  v.literal("thieves"),
  v.literal("market_crash"),
  v.literal("good_harvest"),
  v.literal("fire"),
  v.literal("mice_infestation"),
  v.literal("cooling_failure"),
  v.literal("ai_generated"), // AI-generated events
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
  warToPeaceProbability: v.number(),
  peaceToWarProbability: v.number(),
  peaceReturn: v.number(),
  warReturn: v.number(),
  peaceVolatility: v.number(),
  warVolatility: v.number(),
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
