import type { TradableAsset } from "./assets"

// ─── Game events (z vector) ──────────────────────────────────────

/**
 * Global event types (affect all assets or the overall economy).
 * Real-world ↔ Game-world:
 *   Market crash  → War / Economic crisis
 *   Theft/fraud   → Thieves — steal gold
 *   Plague        → Plague — destroys portion of ALL holdings
 *   Windfall      → Good Harvest — positive surprise
 */
export const GLOBAL_EVENT_TYPES = ["plague", "thieves", "market_crash", "good_harvest"] as const
export type GlobalEventType = (typeof GLOBAL_EVENT_TYPES)[number]

/**
 * Per-asset event types (each tradable asset has its own specific risk).
 * Real-world ↔ Game-world:
 *   Wood      → Fire
 *   Potatoes  → Mice Infestation
 *   Fish      → Cooling Failure
 */
export const ASSET_EVENT_TYPES = ["fire", "mice_infestation", "cooling_failure"] as const
export type AssetEventType = (typeof ASSET_EVENT_TYPES)[number]

/** Union of all event types */
export const EVENT_TYPES = [...GLOBAL_EVENT_TYPES, ...ASSET_EVENT_TYPES] as const
export type EventType = GlobalEventType | AssetEventType

/** Maps each tradable asset to its specific risk event type */
export const ASSET_SPECIFIC_EVENT: Record<TradableAsset, AssetEventType> = {
  wood: "fire",
  potatoes: "mice_infestation",
  fish: "cooling_failure",
}

/** Human-readable event names for display */
export const EVENT_DISPLAY_NAMES: Record<EventType, string> = {
  plague: "Plague",
  thieves: "Thieves",
  market_crash: "Market Crash",
  good_harvest: "Good Harvest",
  fire: "Fire",
  mice_infestation: "Mice Infestation",
  cooling_failure: "Cooling Failure",
}

/** A global event definition configured in the scenario (α) - legacy, not used by new event system */
export type GlobalEventDefinition = {
  type: string
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

/** Per-asset event config embedded in AssetPricing (legacy - not used by new event system) */
export type AssetEventConfig = {
  type: string
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
  /** Event type/ID (e.g. "forest_fire", "mice_infestation") */
  type: string
  name: string
  description: string
  /** Which asset was affected (undefined = global) */
  targetAsset?: TradableAsset | undefined
  /** Actual effects that were applied (for UI display) */
  effects?: {
    quantityMultiplier?: number
    goldDelta?: number
    priceMultiplier?: number
  }
}
