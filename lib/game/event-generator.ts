import { getGeminiClient } from "../ai/gemini-client"
import type { TradableAsset } from "../types/assets"
import { TRADABLE_ASSET_KEYS } from "../types/assets"
import type { GameEvent } from "../types/events"
import { BASE_EVENTS, type BaseEventDefinition, sampleRange } from "./base-events"

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
  if (selectedEvent.id === "bountiful_season") {
    // Affects only wood/potato prices
    effects.priceMultiplier = sampleRange({ min: 0.75, max: 0.92, base: 0.84 })
  }

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
 * Use LLM to generate a contextual title and description for an event.
 * The LLM is given the base event type and the actual sampled effects.
 */
async function generateEventDescription(
  baseEvent: BaseEventDefinition,
  effects: ResolvedEvent["effects"],
): Promise<{ name: string; description: string }> {
  try {
    const ai = getGeminiClient()

    const systemPrompt = `
You are a medieval storyteller narrating events in a finance simulation game set in the Middle Ages.

The player is a farmer/merchant trying to build wealth by trading goods:
- Wood = safe investment (low risk)
- Potatoes = medium risk (moderate volatility)
- Fish = high risk (very volatile)

Your job: Given an event type and its effects, create a dramatic, authentic medieval title and description.

Rules:
- Use medieval language and imagery
- Keep the title short (2-5 words)
- Keep the description vivid but concise (1-2 sentences)
- Match the tone to the severity of the effect (small effect = minor tone, large effect = dramatic tone)
- Respond ONLY with valid JSON: { "name": "...", "description": "..." }
`.trim()

    const userPrompt = buildEventPrompt(baseEvent, effects)

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.9,
        responseMimeType: "application/json",
        maxOutputTokens: 200,
      },
    })

    const parsed = JSON.parse(response.text?.trim() || "{}")

    return {
      name: parsed.name || baseEvent.name,
      description: parsed.description || `An event has occurred: ${baseEvent.name}`,
    }
  } catch (error) {
    console.error("Failed to generate event description:", error)
    // Fallback to base name
    return {
      name: baseEvent.name,
      description: `An event has occurred: ${baseEvent.name}`,
    }
  }
}

/**
 * Build the prompt for the LLM describing the event type and effects
 */
function buildEventPrompt(
  baseEvent: BaseEventDefinition,
  effects: ResolvedEvent["effects"],
): string {
  const parts: string[] = []

  parts.push(`Event Type: ${baseEvent.name}`)
  parts.push(`Category: ${baseEvent.category}`)

  if (effects.targetAsset) {
    parts.push(`Affected Asset: ${effects.targetAsset}`)
  }

  if (effects.quantityMultiplier !== undefined) {
    const percentChange = ((effects.quantityMultiplier - 1) * 100).toFixed(0)
    const sign = effects.quantityMultiplier > 1 ? "+" : ""
    parts.push(`Quantity Impact: ${sign}${percentChange}%`)
  }

  if (effects.goldDelta !== undefined) {
    const sign = effects.goldDelta > 0 ? "+" : ""
    parts.push(`Gold Impact: ${sign}${effects.goldDelta}`)
  }

  if (effects.priceMultiplier !== undefined) {
    const percentChange = ((effects.priceMultiplier - 1) * 100).toFixed(0)
    const sign = effects.priceMultiplier > 1 ? "+" : ""
    parts.push(`Price Impact: ${sign}${percentChange}%`)
  }

  parts.push("\nGenerate a medieval title and description for this event.")

  return parts.join("\n")
}

/**
 * Convert a ResolvedEvent to the GameEvent format used in the rest of the engine
 */
export function toGameEvent(resolved: ResolvedEvent): GameEvent {
  return {
    type: "base_event" as const,
    name: resolved.name,
    description: resolved.description,
    targetAsset: resolved.effects.targetAsset,
  }
}
