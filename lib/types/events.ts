import type { TradableAsset } from "./assets"

// ─── Game events (z vector) ──────────────────────────────────────

/**
 * Global event types (affect all assets or the overall economy).
 * Real-world ↔ Game-world:
 *   Market crash  → Krieg / Krisen (war / crises)
 *   Theft/fraud   → Diebe (thieves) — steal gold
 *   Plague        → Pest — destroys portion of ALL holdings
 *   Windfall      → Gute Ernte (good harvest) — positive surprise
 */
export const GLOBAL_EVENT_TYPES = ["plague", "thieves", "market_crash", "good_harvest"] as const
export type GlobalEventType = (typeof GLOBAL_EVENT_TYPES)[number]

/**
 * Per-asset event types (each tradable asset has its own specific risk).
 * Real-world ↔ Game-world:
 *   Wood      → Waldbrand (forest wildfire)
 *   Potatoes  → Ernteausfall (crop failure)
 *   Fish      → Kühlungsausfall (cooling failure)
 */
export const ASSET_EVENT_TYPES = ["forest_wildfire", "crop_failure", "cooling_failure"] as const
export type AssetEventType = (typeof ASSET_EVENT_TYPES)[number]

/** Union of all event types */
export const EVENT_TYPES = [...GLOBAL_EVENT_TYPES, ...ASSET_EVENT_TYPES] as const
export type EventType = GlobalEventType | AssetEventType

/** Maps each tradable asset to its specific risk event type */
export const ASSET_SPECIFIC_EVENT: Record<TradableAsset, AssetEventType> = {
  wood: "forest_wildfire",
  potatoes: "crop_failure",
  fish: "cooling_failure",
}

/** Human-readable event names for display */
export const EVENT_DISPLAY_NAMES: Record<EventType, string> = {
  plague: "Pest (Plague)",
  thieves: "Diebe (Thieves)",
  market_crash: "Krise (Market Crash)",
  good_harvest: "Gute Ernte (Good Harvest)",
  forest_wildfire: "Waldbrand (Forest Wildfire)",
  crop_failure: "Ernteausfall (Crop Failure)",
  cooling_failure: "Kühlungsausfall (Cooling Failure)",
}

/** A global event definition configured in the scenario (α) */
export type GlobalEventDefinition = {
  type: GlobalEventType
  /** Human-readable name shown in the UI */
  name: string
  /** Description shown to the player when the event fires */
  description: string
  /** Probability of this event firing each step (0–1) */
  probability: number
  /** Multiplicative effect on ALL asset quantities (e.g. 0.8 = lose 20%) */
  quantityMultiplier?: number | undefined
  /** Additive effect on gold balance (e.g. -50 = lose 50 gold) */
  goldDelta?: number | undefined
  /** Multiplicative effect on ALL asset prices this step (e.g. 0.7 = 30% crash) */
  priceMultiplier?: number | undefined
}

/** Per-asset event config embedded in AssetPricing */
export type AssetEventConfig = {
  type: AssetEventType
  /** Human-readable name shown in the UI */
  name: string
  /** Description shown to the player when the event fires */
  description: string
  /** Probability of this event firing each step (0–1) */
  probability: number
  /** Multiplicative effect on this asset's quantity (e.g. 0.7 = lose 30%) */
  quantityMultiplier?: number | undefined
  /** Multiplicative effect on this asset's price this step */
  priceMultiplier?: number | undefined
}

/** A resolved event that actually fired during a step */
export type GameEvent = {
  type: EventType
  name: string
  description: string
  /** Which asset was affected (undefined = global) */
  targetAsset?: TradableAsset | undefined
}
