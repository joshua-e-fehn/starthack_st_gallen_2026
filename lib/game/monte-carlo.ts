/**
 * Monte Carlo simulation — replay the player's trade decisions
 * under different random market/event outcomes.
 *
 * For each original action we record the **intent** as a fraction:
 *   - Buy:  fraction of gold spent   → spentFrac = (qty × buyPrice) / goldBefore
 *   - Sell: fraction of holding sold  → soldFrac  = qty / holdingBefore
 *
 * During replay, those fractions are converted back to concrete
 * quantities using the sim's current gold/holdings/prices.
 */

import type { PlayerAction } from "../types/actions"
import type { TradableAsset } from "../types/assets"
import { TRADABLE_ASSET_KEYS } from "../types/assets"
import { buyPrice, sellPrice } from "../types/market"
import type { Scenario } from "../types/scenario"
import type { StateVector } from "../types/state_vector"
import { gameStep, portfolioValue } from "./engine"

// ─── Fractional intent ───────────────────────────────────────────

type FractionalAction = {
  type: "buy" | "sell"
  asset: TradableAsset
  /**
   * For buy:  fraction of gold balance that was spent
   * For sell: fraction of asset holding that was sold
   */
  fraction: number
}

/**
 * Extract fractional intents from the full game history.
 *
 * Returns an array of length `history.length` where index i contains
 * the fractional intents derived from `history[i].actions`.
 *
 * For step 0 there are no actions so it's an empty array.
 * For step i, we need the portfolio **before** the actions were applied.
 * That's the portfolio from step i-1 (the committed state before trading).
 *
 * However, the engine flow is:  actions → events → market → revenue
 * So `history[i-1].portfolio` is the post-revenue state of the previous
 * step — which is exactly what the player saw when deciding their trades
 * at step i. Perfect.
 */
export function extractFractionalIntents(history: StateVector[]): FractionalAction[][] {
  const intents: FractionalAction[][] = [[] /* step 0 has no actions */]

  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1]
    const actions = history[i].actions
    const stepIntents: FractionalAction[] = []

    // Simulate gold/holdings as they change through the sequence of actions
    // so each fraction is relative to the state *before that specific action*
    let gold = prev.portfolio.gold
    const holdings: Record<TradableAsset, number> = {} as Record<TradableAsset, number>
    for (const a of TRADABLE_ASSET_KEYS) {
      holdings[a] = prev.portfolio[a]
    }

    for (const action of actions) {
      if (action.type === "buy") {
        const price = buyPrice(prev.market.prices[action.asset], prev.market.inflation)
        const cost = price * action.quantity
        const fraction = gold > 0 ? cost / gold : 0
        stepIntents.push({ type: "buy", asset: action.asset, fraction: Math.min(fraction, 1) })
        // Update running totals so subsequent fractions are correct
        gold -= cost
        holdings[action.asset] += action.quantity
      } else {
        const fraction = holdings[action.asset] > 0 ? action.quantity / holdings[action.asset] : 0
        stepIntents.push({ type: "sell", asset: action.asset, fraction: Math.min(fraction, 1) })
        const price = sellPrice(prev.market.prices[action.asset], prev.market.inflation)
        gold += price * action.quantity
        holdings[action.asset] -= action.quantity
      }
    }

    intents.push(stepIntents)
  }

  return intents
}

/**
 * Convert fractional intents back to concrete PlayerActions
 * given the sim's current state.
 */
function materializeActions(intents: FractionalAction[], state: StateVector): PlayerAction[] {
  const actions: PlayerAction[] = []

  // Track running gold/holdings so sequential fractions are correct
  let gold = state.portfolio.gold
  const holdings: Record<TradableAsset, number> = {} as Record<TradableAsset, number>
  for (const a of TRADABLE_ASSET_KEYS) {
    holdings[a] = state.portfolio[a]
  }

  for (const intent of intents) {
    if (intent.type === "buy") {
      const price = buyPrice(state.market.prices[intent.asset], state.market.inflation)
      if (price <= 0) continue
      const affordableQty = Math.floor((gold * intent.fraction) / price)
      if (affordableQty <= 0) continue
      actions.push({ type: "buy", asset: intent.asset, quantity: affordableQty })
      gold -= price * affordableQty
      holdings[intent.asset] += affordableQty
    } else {
      const qty = Math.floor(holdings[intent.asset] * intent.fraction)
      if (qty <= 0) continue
      actions.push({ type: "sell", asset: intent.asset, quantity: qty })
      const price = sellPrice(state.market.prices[intent.asset], state.market.inflation)
      gold += price * qty
      holdings[intent.asset] -= qty
    }
  }

  return actions
}

// ─── Percentile aggregation ──────────────────────────────────────

export type MonteCarloDataPoint = {
  year: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  actual: number
  goal: number
}

/** Simple percentile from a sorted array */
function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

// ─── Main Monte Carlo runner ─────────────────────────────────────

/**
 * Run N Monte Carlo simulations, replaying the player's fractional
 * trade intents under different random outcomes.
 *
 * Returns percentile data per year suitable for a fan chart.
 */
export async function runMonteCarloSimulations(
  history: StateVector[],
  scenario: Scenario,
  numSims = 100,
): Promise<MonteCarloDataPoint[]> {
  const stepsPlayed = history.length - 1 // step 0 is initial state
  if (stepsPlayed < 1) return []

  const intents = extractFractionalIntents(history)

  // Force live mode so gameStep uses fresh randomness instead of precomputed trajectories
  const liveScenario: Scenario = { ...scenario, mode: "live", precomputedTrajectories: undefined }

  // Run all simulations — collect net worth per step per sim
  // sims[step][simIndex] = net worth
  const sims: number[][] = Array.from({ length: stepsPlayed + 1 }, () => [])

  // Step 0: all sims start at the same value
  const initialValue = portfolioValue(history[0].portfolio, history[0].market)
  for (let s = 0; s < numSims; s++) {
    sims[0].push(initialValue)
  }

  for (let s = 0; s < numSims; s++) {
    let state = history[0] // all sims share the same initial state

    for (let step = 1; step <= stepsPlayed; step++) {
      // Convert fractional intents to concrete actions for this sim's state
      const actions = materializeActions(intents[step], state)

      // Run one step with fresh randomness
      state = await gameStep(liveScenario, state, actions)

      sims[step].push(portfolioValue(state.portfolio, state.market))
    }
  }

  // Aggregate into percentiles
  const result: MonteCarloDataPoint[] = []

  for (let step = 0; step <= stepsPlayed; step++) {
    const values = sims[step].slice().sort((a, b) => a - b)
    const actualValue = portfolioValue(history[step].portfolio, history[step].market)

    result.push({
      year: history[step].date,
      p10: Math.round(percentile(values, 10) * 100) / 100,
      p25: Math.round(percentile(values, 25) * 100) / 100,
      p50: Math.round(percentile(values, 50) * 100) / 100,
      p75: Math.round(percentile(values, 75) * 100) / 100,
      p90: Math.round(percentile(values, 90) * 100) / 100,
      actual: Math.round(actualValue * 100) / 100,
      goal: Math.round(history[step].goal * 100) / 100,
    })
  }

  return result
}
