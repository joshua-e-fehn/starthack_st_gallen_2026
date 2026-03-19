import type { PlayerAction } from "../types/actions"
import type { Portfolio, TradableAsset } from "../types/assets"
import { createPortfolio, TRADABLE_ASSET_KEYS } from "../types/assets"
import type { GameEvent } from "../types/events"
import type { AssetMarketPrice, MarketState } from "../types/market"
import { buyPrice, sellPrice } from "../types/market"
import type { Scenario } from "../types/scenario"
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
    date: scenario.startDate,
    portfolio: createPortfolio(scenario.startCapital),
    market: initializeMarket(scenario),
    events: [],
    actions: [],
  }
}

// ─── Player actions (user step) ──────────────────────────────────

/**
 * Apply player buy/sell actions to the portfolio at current market prices.
 * Uses nominal prices (real base × inflation × factor).
 * Invalid actions (insufficient gold or assets) are silently skipped.
 */
function applyActions(
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
function resolveEvents(
  scenario: Scenario,
  portfolio: Portfolio,
  prices: Record<TradableAsset, AssetMarketPrice>,
): {
  firedEvents: GameEvent[]
  portfolio: Portfolio
  prices: Record<TradableAsset, AssetMarketPrice>
} {
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
function stepMarket(scenario: Scenario, prev: MarketState): MarketState {
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
    const newBase = Math.max(0.01, prev.prices[asset].basePrice * (1 + rAsset) * (1 + rMarket))

    prices[asset] = {
      basePrice: newBase,
      buyFactor: scenario.buyFactor,
      sellFactor: scenario.sellFactor,
    }
  }

  return { regime, inflation, prices }
}

// ─── Date helpers ────────────────────────────────────────────────

/** Advance an ISO date string by one month */
function advanceDate(dateStr: string): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split("T")[0]
}

// ─── Main step function ──────────────────────────────────────────

/**
 * Execute one full game step: def step(x, y, z) → (x', y', z')
 *
 * **Flow per timestep:**
 *   1. Start state (x, y, z)
 *   2. Events step   → resolve random events, may modify portfolio (x) and prices (y)
 *   3. Market step   → regime transition, real returns, inflation evolve
 *   4. ── state is displayed to user here ──
 *   5. User actions  → buy/sell at the displayed nominal prices
 *   6. Add recurring revenue (Bauernhof gold income)
 *   7. Result (x', y', z') becomes start state for next timestep
 *
 * `actions` are the user's decisions AFTER seeing the post-event/post-market state.
 */
export function gameStep(
  scenario: Scenario,
  prevState: StateVector,
  actions: PlayerAction[],
): StateVector {
  // 1. Resolve random events — may modify portfolio and real base prices
  const {
    firedEvents,
    portfolio: portfolioAfterEvents,
    prices: pricesAfterEvents,
  } = resolveEvents(scenario, prevState.portfolio, prevState.market.prices)

  // 2. Evolve market (regime transition, real returns, inflation)
  //    Start from event-modified prices so event price shocks carry forward
  const marketAfterEvents: MarketState = { ...prevState.market, prices: pricesAfterEvents }
  const newMarket = stepMarket(scenario, marketAfterEvents)

  // ── State displayed to user: (portfolioAfterEvents, newMarket, firedEvents) ──

  // 3. Apply player actions at the DISPLAYED nominal prices
  const portfolioAfterActions = applyActions(portfolioAfterEvents, actions, newMarket)

  // 4. Add recurring revenue (Bauernhof income)
  const portfolio: Portfolio = {
    ...portfolioAfterActions,
    gold: portfolioAfterActions.gold + scenario.recurringRevenue,
  }

  return {
    step: prevState.step + 1,
    date: advanceDate(prevState.date),
    portfolio,
    market: newMarket,
    events: firedEvents,
    actions,
  }
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
  return state.date >= scenario.endDate
}
