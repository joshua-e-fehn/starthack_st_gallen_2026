import type { TradableAsset } from "../types/assets"
import { TRADABLE_ASSET_KEYS } from "../types/assets"
import type { GameEvent } from "../types/events"
import { BASE_EVENTS, type BaseEventDefinition, sampleRange } from "./base-events"

/**
 * Fallback descriptions for events when AI generation fails
 */
const FALLBACK_DESCRIPTIONS: Record<string, string> = {
  forest_fire:
    "A devastating fire tears through the forest, destroying timber reserves and driving prices up.",
  timber_shortage: "A severe shortage of timber has struck the region, causing prices to soar.",
  woodworm_infestation:
    "Woodworms have infested the timber stores, damaging the wood and affecting its value.",
  fishing_ban: "The lord has declared a fishing ban to protect dwindling fish stocks.",
  ice_house_failure: "The ice house has failed, spoiling much of the stored fish.",
  abundant_catch: "Fishermen return with an abundant catch, flooding the market with fish.",
  mice_infestation:
    "Mice have ravaged the potato stores, destroying a significant portion of the harvest.",
  crop_blight: "A terrible blight has struck the potato fields, decimating the crop.",
  bumper_crop: "The potato harvest is exceptional this year, yielding far more than expected.",
  thieves: "Thieves struck in the night, stealing gold and goods from your stores.",
  barn_collapse: "Your barn has collapsed, destroying stored goods and requiring costly repairs.",
  tax_collection: "The tax collector arrives, demanding payment to the crown.",
  inheritance: "You receive an unexpected inheritance from a distant relative.",
  merchant_gift: "A grateful merchant gifts you additional goods as thanks for past dealings.",
  economic_crisis: "An economic crisis grips the land, causing all prices to plummet.",
  war_outbreak: "War breaks out in the region, driving up prices as goods are requisitioned.",
  plague: "A plague spreads through the land, disrupting trade and affecting all goods.",
  severe_drought: "A severe drought strikes, devastating crops and timber.",
  kings_prosperity: "The king declares a time of prosperity, and the economy flourishes.",
}

/**
 * A resolved event with concrete effect values (sampled from ranges)
 */
export type ResolvedEvent = {
  baseEventId: string
  category: "asset" | "personal" | "global"
  name: string // AI-generated title
  description: string // AI-generated description
  effects: {
    targetAsset?: TradableAsset
    quantityMultiplier?: number
    goldDelta?: number
    priceMultiplier?: number
  }
}

/**
 * Roll for events and return at most ONE event that fires this step.
 *
 * Process:
 * 1. Calculate total probability across all events
 * 2. Roll once to decide if ANY event fires
 * 3. If yes, weighted random selection of which event fires
 * 4. Sample concrete values from effect ranges using RNG
 * 5. Generate title + description via LLM
 * 6. Return resolved event with all details
 */
export async function generateEvents(): Promise<ResolvedEvent[]> {
  // 1. Calculate total probability (sum of all event probabilities)
  const totalProbability = BASE_EVENTS.reduce((sum, event) => sum + event.probability, 0)

  // 2. Roll to see if ANY event fires
  const roll = Math.random()
  if (roll >= totalProbability) {
    // No event this year
    return []
  }

  // 3. Weighted random selection: which event fires?
  let cumulativeProbability = 0
  let selectedEvent: BaseEventDefinition | null = null

  for (const baseEvent of BASE_EVENTS) {
    cumulativeProbability += baseEvent.probability
    if (roll < cumulativeProbability) {
      selectedEvent = baseEvent
      break
    }
  }

  if (!selectedEvent) return [] // Should never happen, but safety check

  // 4. Sample concrete effect values for the selected event
  const effects: ResolvedEvent["effects"] = {}

  // Special handling for merchant_gift: randomly pick asset
  if (selectedEvent.id === "merchant_gift") {
    effects.targetAsset = TRADABLE_ASSET_KEYS[
      Math.floor(Math.random() * TRADABLE_ASSET_KEYS.length)
    ] as TradableAsset
  } else if (selectedEvent.effects.targetAsset) {
    effects.targetAsset = selectedEvent.effects.targetAsset
  }

  if (selectedEvent.effects.quantityMultiplier) {
    effects.quantityMultiplier = sampleRange(selectedEvent.effects.quantityMultiplier)
  }

  if (selectedEvent.effects.goldDelta) {
    effects.goldDelta = Math.round(sampleRange(selectedEvent.effects.goldDelta))
  }

  if (selectedEvent.effects.priceMultiplier) {
    effects.priceMultiplier = sampleRange(selectedEvent.effects.priceMultiplier)
  }

  // Special cases for events with custom logic
  if (selectedEvent.id === "severe_drought") {
    // Affects only wood/potato
    effects.priceMultiplier = sampleRange({ min: 1.15, max: 1.45, base: 1.3 })
    effects.quantityMultiplier = sampleRange({ min: 0.75, max: 0.9, base: 0.83 })
  }

  // 5. Generate description via LLM
  const { name, description } = await generateEventDescription(selectedEvent, effects)

  // 6. Return single resolved event
  return [
    {
      baseEventId: selectedEvent.id,
      category: selectedEvent.category,
      name,
      description,
      effects,
    },
  ]
}

/**
 * Get event title and description.
 * Uses predefined descriptions for consistent, medieval-themed text.
 */
async function generateEventDescription(
  baseEvent: BaseEventDefinition,
  _effects: ResolvedEvent["effects"],
): Promise<{ name: string; description: string }> {
  // Use predefined descriptions for consistent experience
  return {
    name: baseEvent.name,
    description: FALLBACK_DESCRIPTIONS[baseEvent.id] || baseEvent.name,
  }
}

/**
 * Convert a ResolvedEvent to the GameEvent format used in the rest of the engine
 */
export function toGameEvent(resolved: ResolvedEvent): GameEvent {
  return {
    type: resolved.baseEventId, // Use the event ID as the type
    name: resolved.name,
    description: resolved.description,
    targetAsset: resolved.effects.targetAsset,
    effects: {
      quantityMultiplier: resolved.effects.quantityMultiplier,
      goldDelta: resolved.effects.goldDelta,
      priceMultiplier: resolved.effects.priceMultiplier,
    },
  }
}
