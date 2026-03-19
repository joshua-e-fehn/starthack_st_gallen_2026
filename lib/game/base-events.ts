import type { TradableAsset } from "../types/assets"

/**
 * Base event definition with effect ranges.
 * The actual values are randomly selected within the ranges when an event fires.
 */
export type BaseEventDefinition = {
  id: string
  category: "asset" | "personal" | "global"
  name: string // Human-readable name for this event type
  probability: number // Chance of firing per step (0-1)
  effects: {
    /** If defined, this event targets a specific asset */
    targetAsset?: TradableAsset
    /** Multiplier for asset quantities (applies to targetAsset if specified, else all) */
    quantityMultiplier?: { min: number; max: number; base: number }
    /** Additive gold change */
    goldDelta?: { min: number; max: number; base: number }
    /** Multiplier for asset prices (applies to targetAsset if specified, else all) */
    priceMultiplier?: { min: number; max: number; base: number }
  }
}

/**
 * All base events in the game.
 * Probabilities are tuned so that on average, an event fires every 3-4 years.
 * Total probability: ~36% per year → event every 2.7 years on average
 */
export const BASE_EVENTS: BaseEventDefinition[] = [
  // ─── Asset-specific: Wood (6% total) ────────────────────────────
  {
    id: "forest_fire",
    category: "asset",
    name: "Forest Fire",
    probability: 0.02,
    effects: {
      targetAsset: "wood",
      quantityMultiplier: { min: 0.5, max: 0.85, base: 0.7 }, // -50% to -15%
      priceMultiplier: { min: 1.05, max: 1.35, base: 1.2 }, // +5% to +35%
    },
  },
  {
    id: "timber_shortage",
    category: "asset",
    name: "Timber Shortage",
    probability: 0.02,
    effects: {
      targetAsset: "wood",
      priceMultiplier: { min: 1.15, max: 1.4, base: 1.28 }, // +15% to +40%
    },
  },
  {
    id: "woodworm_infestation",
    category: "asset",
    name: "Woodworm Infestation",
    probability: 0.02,
    effects: {
      targetAsset: "wood",
      quantityMultiplier: { min: 0.7, max: 0.95, base: 0.82 }, // -30% to -5%
      priceMultiplier: { min: 0.9, max: 1.15, base: 1.03 }, // -10% to +15%
    },
  },

  // ─── Asset-specific: Fish (6% total) ────────────────────────────
  {
    id: "fishing_ban",
    category: "asset",
    name: "Fishing Ban",
    probability: 0.02,
    effects: {
      targetAsset: "fish",
      quantityMultiplier: { min: 0.4, max: 0.8, base: 0.6 }, // -60% to -20%
      priceMultiplier: { min: 1.1, max: 1.4, base: 1.25 }, // +10% to +40%
    },
  },
  {
    id: "ice_house_failure",
    category: "asset",
    name: "Ice House Failure",
    probability: 0.02,
    effects: {
      targetAsset: "fish",
      quantityMultiplier: { min: 0.3, max: 0.7, base: 0.5 }, // -70% to -30%
      priceMultiplier: { min: 0.95, max: 1.1, base: 1.02 }, // -5% to +10%
    },
  },
  {
    id: "abundant_catch",
    category: "asset",
    name: "Abundant Catch",
    probability: 0.02,
    effects: {
      targetAsset: "fish",
      quantityMultiplier: { min: 1.15, max: 1.6, base: 1.35 }, // +15% to +60%
      priceMultiplier: { min: 0.7, max: 0.95, base: 0.82 }, // -30% to -5%
    },
  },

  // ─── Asset-specific: Potatoes (6% total) ────────────────────────
  {
    id: "mice_infestation",
    category: "asset",
    name: "Mice Infestation",
    probability: 0.02,
    effects: {
      targetAsset: "potatoes",
      quantityMultiplier: { min: 0.5, max: 0.85, base: 0.68 }, // -50% to -15%
      priceMultiplier: { min: 1.03, max: 1.25, base: 1.14 }, // +3% to +25%
    },
  },
  {
    id: "crop_blight",
    category: "asset",
    name: "Crop Blight",
    probability: 0.02,
    effects: {
      targetAsset: "potatoes",
      quantityMultiplier: { min: 0.4, max: 0.75, base: 0.58 }, // -60% to -25%
      priceMultiplier: { min: 1.15, max: 1.45, base: 1.3 }, // +15% to +45%
    },
  },
  {
    id: "bumper_crop",
    category: "asset",
    name: "Bumper Crop",
    probability: 0.02,
    effects: {
      targetAsset: "potatoes",
      quantityMultiplier: { min: 1.2, max: 1.7, base: 1.45 }, // +20% to +70%
      priceMultiplier: { min: 0.65, max: 0.9, base: 0.78 }, // -35% to -10%
    },
  },

  // ─── Personal Events (10% total) ─────────────────────────────────
  {
    id: "thieves",
    category: "personal",
    name: "Thieves in the Night",
    probability: 0.03,
    effects: {
      goldDelta: { min: -400, max: -50, base: -220 },
      quantityMultiplier: { min: 0.8, max: 0.97, base: 0.88 }, // -20% to -3% all goods
    },
  },
  {
    id: "barn_collapse",
    category: "personal",
    name: "Barn Collapse",
    probability: 0.02,
    effects: {
      quantityMultiplier: { min: 0.65, max: 0.9, base: 0.78 }, // -35% to -10% all goods
      goldDelta: { min: -150, max: -50, base: -100 }, // Repair cost
    },
  },
  {
    id: "tax_collection",
    category: "personal",
    name: "Tax Collection",
    probability: 0.03,
    effects: {
      goldDelta: { min: -350, max: -100, base: -225 },
    },
  },
  {
    id: "inheritance",
    category: "personal",
    name: "Unexpected Inheritance",
    probability: 0.01,
    effects: {
      goldDelta: { min: 150, max: 500, base: 325 },
    },
  },
  {
    id: "merchant_gift",
    category: "personal",
    name: "Merchant's Gift",
    probability: 0.01,
    effects: {
      // Note: targetAsset is randomly chosen at runtime for this event
      quantityMultiplier: { min: 1.05, max: 1.4, base: 1.22 }, // +5% to +40%
    },
  },

  // ─── Global Events (8% total) ────────────────────────────────────
  {
    id: "economic_crisis",
    category: "global",
    name: "Economic Crisis",
    probability: 0.02,
    effects: {
      priceMultiplier: { min: 0.6, max: 0.85, base: 0.73 }, // -40% to -15% all prices
    },
  },
  {
    id: "war_outbreak",
    category: "global",
    name: "War Outbreak",
    probability: 0.015,
    effects: {
      priceMultiplier: { min: 1.1, max: 1.35, base: 1.22 }, // +10% to +35%
      quantityMultiplier: { min: 0.75, max: 0.95, base: 0.85 }, // -25% to -5% (requisition)
    },
  },
  {
    id: "bountiful_season",
    category: "global",
    name: "Bountiful Season",
    probability: 0.02,
    effects: {
      goldDelta: { min: 80, max: 300, base: 180 },
      // Only affects agriculture assets - handled specially in engine
    },
  },
  {
    id: "plague",
    category: "global",
    name: "Plague",
    probability: 0.01,
    effects: {
      quantityMultiplier: { min: 0.7, max: 0.92, base: 0.82 }, // -30% to -8%
      priceMultiplier: { min: 0.85, max: 1.2, base: 1.02 }, // -15% to +20% (volatile)
    },
  },
  {
    id: "severe_drought",
    category: "global",
    name: "Severe Drought",
    probability: 0.01,
    effects: {
      // Only affects wood/potatoes - handled specially in engine
    },
  },
  {
    id: "kings_prosperity",
    category: "global",
    name: "King's Prosperity",
    probability: 0.005,
    effects: {
      priceMultiplier: { min: 1.08, max: 1.3, base: 1.18 }, // +8% to +30%
      goldDelta: { min: 30, max: 200, base: 120 },
    },
  },
]

/**
 * Helper: Sample a random value from a range using triangular distribution
 * (favors the base value over the extremes)
 */
export function sampleRange(range: { min: number; max: number; base: number }): number {
  const { min, max, base } = range

  // Use triangular distribution with mode at base
  const u = Math.random()
  const fc = (base - min) / (max - min)

  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (base - min))
  }
  return max - Math.sqrt((1 - u) * (max - min) * (max - base))
}
