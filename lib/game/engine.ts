import { getGeminiClient } from "../ai/gemini-client"
import type { PlayerAction } from "../types/actions"
import type { Portfolio, TradableAsset } from "../types/assets"
import { createPortfolio, TRADABLE_ASSET_KEYS } from "../types/assets"
import type { GameEvent } from "../types/events"
import type { AssetMarketPrice, MarketState } from "../types/market"
import { buyPrice, sellPrice } from "../types/market"
import type { PrecomputedStep, Scenario } from "../types/scenario"
import type { StateVector } from "../types/state_vector"

// ─── Random helpers ──────────────────────────────────────────────

/** Box-Muller transform: returns a standard normal random variable */
function randomNormal(): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

// ─── Initialization ──────────────────────────────────────────────

/** Compute initial market prices from scenario config */
export function initializeMarket(scenario: Scenario): MarketState {
  const prices = {} as Record<TradableAsset, AssetMarketPrice>

  for (const asset of TRADABLE_ASSET_KEYS) {
    const cfg = scenario.assets[asset]
    prices[asset] = {
      basePrice: cfg.startPrice,
      buyFactor: scenario.buyFactor,
      sellFactor: scenario.sellFactor,
    }
  }

  return { regime: "bull", inflation: 1, prices }
}

/** Create the initial state vector (step 0) for a new game */
export function initializeGame(scenario: Scenario): StateVector {
  return {
    step: 0,
    date: scenario.startYear,
    portfolio: createPortfolio(scenario.startCapital),
    market: initializeMarket(scenario),
    events: [],
    actions: [],
    goal: scenario.goalAmount,
    goalReached: false,
  }
}

// ─── Player actions (user step) ──────────────────────────────────

/**
 * Apply player buy/sell actions to the portfolio at current market prices.
 * Uses nominal prices (real base × inflation × factor).
 * Invalid actions (insufficient gold or assets) are silently skipped.
 */
export function applyActions(
  portfolio: Portfolio,
  actions: PlayerAction[],
  market: MarketState,
): Portfolio {
  const result = { ...portfolio }

  for (const action of actions) {
    const pricePerUnit =
      action.type === "buy"
        ? buyPrice(market.prices[action.asset], market.inflation)
        : sellPrice(market.prices[action.asset], market.inflation)

    const totalCost = pricePerUnit * action.quantity

    if (action.type === "buy") {
      if (result.gold < totalCost) continue // can't afford
      result.gold -= totalCost
      result[action.asset] += action.quantity
    } else {
      if (result[action.asset] < action.quantity) continue // insufficient holdings
      result.gold += totalCost
      result[action.asset] -= action.quantity
    }
  }

  return result
}

// ─── Event resolution (z vector) ─────────────────────────────────

/**
 * Roll for random events defined in the scenario.
 *
 * Two categories:
 *  1. **Global events** (scenario.globalEvents) — affect all assets or gold
 *  2. **Per-asset events** (scenario.assets[asset].event) — each tradable
 *     asset carries its own specific risk (wood→wildfire, potatoes→crop failure, fish→cooling failure)
 *
 * Returns the list of events that fired and their effects on portfolio/prices.
 */
export async function resolveEvents(
  scenario: Scenario,
  portfolio: Portfolio,
  prices: Record<TradableAsset, AssetMarketPrice>,
): Promise<{
  firedEvents: GameEvent[]
  portfolio: Portfolio
  prices: Record<TradableAsset, AssetMarketPrice>
}> {
  const firedEvents: GameEvent[] = []
  let updatedPortfolio = { ...portfolio }
  const updatedPrices = { ...prices }

  // ── 1. Global events ──────────────────────────────────────────
  for (const def of scenario.globalEvents) {
    if (Math.random() >= def.probability) continue

    firedEvents.push({
      type: def.type,
      name: def.name,
      description: def.description,
    })

    // Quantity effects (plague, etc.) — all tradable assets
    if (def.quantityMultiplier !== undefined) {
      for (const asset of TRADABLE_ASSET_KEYS) {
        updatedPortfolio[asset] = Math.floor(updatedPortfolio[asset] * def.quantityMultiplier)
      }
    }

    // Gold delta (thieves steal gold)
    if (def.goldDelta !== undefined) {
      updatedPortfolio = {
        ...updatedPortfolio,
        gold: Math.max(0, updatedPortfolio.gold + def.goldDelta),
      }
    }

    // Price multiplier (market crash — all assets); modifies real base price
    if (def.priceMultiplier !== undefined) {
      for (const asset of TRADABLE_ASSET_KEYS) {
        updatedPrices[asset] = {
          ...updatedPrices[asset],
          basePrice: Math.max(0.01, updatedPrices[asset].basePrice * def.priceMultiplier),
        }
      }
    }
  }

  // ── 2. Per-asset events ───────────────────────────────────────
  for (const asset of TRADABLE_ASSET_KEYS) {
    const eventCfg = scenario.assets[asset].event
    if (Math.random() >= eventCfg.probability) continue

    firedEvents.push({
      type: eventCfg.type,
      name: eventCfg.name,
      description: eventCfg.description,
      targetAsset: asset,
    })

    // Quantity effect on THIS asset only
    if (eventCfg.quantityMultiplier !== undefined) {
      updatedPortfolio[asset] = Math.floor(updatedPortfolio[asset] * eventCfg.quantityMultiplier)
    }

    // Price effect on THIS asset only (real base price)
    if (eventCfg.priceMultiplier !== undefined) {
      updatedPrices[asset] = {
        ...updatedPrices[asset],
        basePrice: Math.max(0.01, updatedPrices[asset].basePrice * eventCfg.priceMultiplier),
      }
    }
  }

  // ── 3. AI event (15% chance) ──────────────────────────────────
  if (Math.random() < 0.15) {
    try {
      const ai = getGeminiClient()
      const prompt = `Generate a medieval market event. Return JSON: { "name": "Event Name", "description": "What happened", "effect": "price_up" | "price_down" | "gold_gain" | "gold_loss" }`
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
        contents: prompt,
        config: { temperature: 0.8, responseMimeType: "application/json", maxOutputTokens: 200 },
      })
      const event = JSON.parse(response.text?.trim() || "{}")
      if (event.name && event.description) {
        firedEvents.push({ type: "ai_generated", name: event.name, description: event.description })
        if (event.effect === "price_up") {
          for (const asset of TRADABLE_ASSET_KEYS) updatedPrices[asset].basePrice *= 1.1
        } else if (event.effect === "price_down") {
          for (const asset of TRADABLE_ASSET_KEYS)
            updatedPrices[asset].basePrice = Math.max(0.01, updatedPrices[asset].basePrice * 0.9)
        } else if (event.effect === "gold_gain") {
          updatedPortfolio.gold += 50
        } else if (event.effect === "gold_loss") {
          updatedPortfolio.gold = Math.max(0, updatedPortfolio.gold - 30)
        }
      }
    } catch {}
  }

  return { firedEvents, portfolio: updatedPortfolio, prices: updatedPrices }
}

// ─── Market evolution ────────────────────────────────────────────

/**
 * Evolve market state by one timestep.
 *
 * **Asset Growth Model (discretized exponential):**
 *
 *   P_nominal(t+1) = P_nominal(t) × (1 + r_asset) × (1 + r_market) × (1 + r_inflation)
 *
 * where each return is an independent normal draw:
 *   r_asset     ~ N(μ_asset,     σ_asset²)      — per-asset real return
 *   r_market    ~ N(μ_market,    σ_market²)      — regime-dependent market return
 *   r_inflation ~ N(μ_inflation, σ_inflation²)   — inflation component
 *
 * We decompose into:
 *   basePrice (real)  = basePrice_prev × (1 + r_asset) × (1 + r_market)
 *   inflation (cumul) = inflation_prev × (1 + r_inflation)
 *   nominal price     = basePrice × inflation   (computed at display/trade time)
 *
 * Steps:
 * 1. Regime transition (bull ↔ bear) with configured probabilities
 * 2. Draw r_inflation — update cumulative inflation factor
 * 3. Draw r_market    — regime-dependent (bull μ/σ or bear μ/σ)
 * 4. Per-asset: draw r_asset, compute new real basePrice via multiplicative model
 * 5. Carry forward buy/sell factors
 */
export function stepMarket(scenario: Scenario, prev: MarketState): MarketState {
  // 1. Regime transition
  let regime = prev.regime
  if (regime === "bull" && Math.random() < scenario.market.bullToBearProbability) {
    regime = "bear"
  } else if (regime === "bear" && Math.random() < scenario.market.bearToBullProbability) {
    regime = "bull"
  }

  // 2. Inflation: r_inflation ~ N(μ_inflation, σ_inflation²)
  const rInflation = scenario.inflationReturn + scenario.inflationVolatility * randomNormal()
  const inflation = prev.inflation * (1 + rInflation)

  // 3. Market regime return: r_market ~ N(μ_regime, σ_regime²)  — same for all assets
  const rMarket =
    regime === "bull"
      ? scenario.market.bullReturn + scenario.market.bullVolatility * randomNormal()
      : scenario.market.bearReturn + scenario.market.bearVolatility * randomNormal()

  // 4. Per-asset real price evolution (multiplicative)
  const prices = {} as Record<TradableAsset, AssetMarketPrice>

  for (const asset of TRADABLE_ASSET_KEYS) {
    const cfg = scenario.assets[asset]

    // r_asset ~ N(μ_asset, σ_asset²)
    const rAsset = cfg.priceReturn + cfg.priceVolatility * randomNormal()

    // Real base price: P_real(t+1) = P_real(t) × (1 + r_asset) × (1 + r_market)
    let newBase = prev.prices[asset].basePrice * (1 + rAsset) * (1 + rMarket)

    // Recovery mechanism: if real base price falls below 1, give it a chance to
    // "bottom out" and recover to prevent it from getting stuck near zero.
    if (newBase < 1 && Math.random() < 0.2) {
      // 20% chance to jump back to a "seed" price range [0.8, 1.2]
      newBase = 0.8 + Math.random() * 0.4
    }

    newBase = Math.max(0.01, newBase)

    prices[asset] = {
      basePrice: newBase,
      buyFactor: scenario.buyFactor,
      sellFactor: scenario.sellFactor,
    }
  }

  return { regime, inflation, prices }
}

// ─── Date helpers ────────────────────────────────────────────────

/** Advance the year by one timestep (1 year) */
export function advanceYear(year: number): number {
  return year + 1
}

// ─── Main step function ──────────────────────────────────────────

/**
 * Execute one full game step: def step(x, y, z) → (x', y', z')
 *
 * **Flow per timestep:**
 *   1. Start state (x, y, z) — displayed to user with current prices
 *   2. User actions  → buy/sell at current nominal prices
 *   3. Events step   → resolve random events, may modify portfolio (x) and prices (y)
 *   4. Market step   → regime transition, real returns, inflation evolve
 *   5. Add recurring revenue (farm gold income)
 *   6. Result (x', y', z') becomes start state for next timestep
 *
 * `actions` are the user's decisions BEFORE events and market evolution.
 */
export async function gameStep(
  scenario: Scenario,
  prevState: StateVector,
  actions: PlayerAction[],
): Promise<StateVector> {
  // If precomputed mode, use the saved trajectory for this step
  if (scenario.mode === "precomputed" && scenario.precomputedTrajectories) {
    const nextStepIdx = prevState.step // step 0 is initial, so trajectories[0] is result of step 0 -> 1
    const precomputed = scenario.precomputedTrajectories[nextStepIdx]

    if (precomputed) {
      // Apply actions first
      const resultPortfolio = applyActions(prevState.portfolio, actions, prevState.market)

      // Resolve specific events from precomputed data
      const updatedPortfolio = { ...resultPortfolio }
      for (const ev of precomputed.events) {
        // Find matching definition to get multipliers
        const globalDef = scenario.globalEvents.find((d) => d.type === ev.type)
        if (globalDef) {
          if (globalDef.quantityMultiplier !== undefined) {
            for (const asset of TRADABLE_ASSET_KEYS) {
              updatedPortfolio[asset] = Math.floor(
                updatedPortfolio[asset] * globalDef.quantityMultiplier,
              )
            }
          }
          if (globalDef.goldDelta !== undefined) {
            updatedPortfolio.gold = Math.max(0, updatedPortfolio.gold + globalDef.goldDelta)
          }
        }

        if (ev.targetAsset) {
          const assetCfg = scenario.assets[ev.targetAsset]
          if (assetCfg.event.quantityMultiplier !== undefined) {
            updatedPortfolio[ev.targetAsset] = Math.floor(
              updatedPortfolio[ev.targetAsset] * assetCfg.event.quantityMultiplier,
            )
          }
        }
      }

      // Add recurring revenue
      updatedPortfolio.gold += scenario.recurringRevenue

      // Goal inflation adjustment
      const inflationRatio = precomputed.market.inflation / prevState.market.inflation
      const newGoal = prevState.goal * inflationRatio
      const totalVal = portfolioValue(updatedPortfolio, precomputed.market)

      return {
        step: prevState.step + 1,
        date: advanceYear(prevState.date),
        portfolio: updatedPortfolio,
        market: precomputed.market,
        events: precomputed.events,
        actions,
        goal: newGoal,
        goalReached: totalVal >= newGoal,
      }
    }
  }

  // 1. Apply player actions at CURRENT nominal prices
  const portfolioAfterActions = applyActions(prevState.portfolio, actions, prevState.market)

  // 2. Resolve random events — may modify portfolio and real base prices
  const {
    firedEvents,
    portfolio: portfolioAfterEvents,
    prices: pricesAfterEvents,
  } = await resolveEvents(scenario, portfolioAfterActions, prevState.market.prices)

  // 3. Evolve market (regime transition, real returns, inflation)
  //    Start from event-modified prices so event price shocks carry forward
  const marketAfterEvents: MarketState = { ...prevState.market, prices: pricesAfterEvents }
  const nextMarket = stepMarket(scenario, marketAfterEvents)

  // 4. Add recurring revenue (farm income)
  const portfolio: Portfolio = {
    ...portfolioAfterEvents,
    gold: portfolioAfterEvents.gold + scenario.recurringRevenue,
  }

  // 5. Update inflation-adjusted goal
  //    goal grows with the new inflation factor relative to the previous one
  const inflationRatio = nextMarket.inflation / prevState.market.inflation
  const newGoal = prevState.goal * inflationRatio

  // 6. Check if goal is reached (re-evaluated each step)
  const totalValue = portfolioValue(portfolio, nextMarket)
  const goalReached = totalValue >= newGoal

  return {
    step: prevState.step + 1,
    date: advanceYear(prevState.date),
    portfolio,
    market: nextMarket,
    events: firedEvents,
    actions,
    goal: newGoal,
    goalReached,
  }
}

/**
 * Generate a full sequence of market states and events for a precomputed scenario.
 */
export async function generateTrajectories(scenario: Scenario): Promise<PrecomputedStep[]> {
  const steps: PrecomputedStep[] = []
  let currentMarket = initializeMarket(scenario)
  const years = scenario.endYear - scenario.startYear

  for (let i = 0; i < years; i++) {
    // 1. Roll events
    const { firedEvents, prices: pricesAfterEvents } = await resolveEvents(
      scenario,
      createPortfolio(0), // Portfolio doesn't matter for price/event generation
      currentMarket.prices,
    )

    const marketAfterEvents: MarketState = {
      ...currentMarket,
      prices: pricesAfterEvents,
    }

    // 2. Evolve market
    const nextMarket = stepMarket(scenario, marketAfterEvents)

    steps.push({
      market: nextMarket,
      events: firedEvents,
    })

    currentMarket = nextMarket
  }

  return steps
}

// ─── Utility: compute total portfolio value at current market prices ─────

/** Total portfolio value in gold (gold balance + Σ asset quantity × nominal sell price) */
export function portfolioValue(portfolio: Portfolio, market: MarketState): number {
  let total = portfolio.gold

  for (const asset of TRADABLE_ASSET_KEYS) {
    total += portfolio[asset] * sellPrice(market.prices[asset], market.inflation)
  }

  return total
}

/** Check whether the game has reached or passed the end date */
export function isGameOver(scenario: Scenario, state: StateVector): boolean {
  return state.date >= scenario.endYear
}
