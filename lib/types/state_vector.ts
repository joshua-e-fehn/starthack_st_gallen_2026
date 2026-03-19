import type { PlayerAction } from "./actions"
import type { Portfolio } from "./assets"
import type { GameEvent } from "./events"
import type { MarketState } from "./market"

/**
 * Complete game state snapshot at a single point in time.
 *
 * Maps to the whiteboard formulation:
 *   def step(x, y, z) → (x', y', z')
 *
 *   x = portfolio   {Gold, Wood, Fish, Potatoes}       (player holdings)
 *   y = market       {Market phase, asset prices}       (market state)
 *   z = eventHistory {events that have occurred}        (event log)
 *   α = scenario     {Start capital, Income, ...}       (static config, not stored per step)
 *
 * **Step flow per timestep:**
 *   1. Start state (x, y, z)
 *   2. Events step   → events fire, modify portfolio & prices → (x₁, y₁, z')
 *   3. Market step   → regime transition, real returns, inflation → (x₁, y', z')
 *   4. Display state to user (x₁, y', z')
 *   5. User actions  → buy/sell at displayed prices → (x', y', z')
 *   6. x' becomes x for next timestep
 *
 * One StateVector is persisted to Convex per game step,
 * forming the time series used for graphs and history.
 */
export type StateVector = {
  /** Step number (0 = initial state, 1 = after first step, …) */
  step: number
  /** Year number for this timestep (e.g. 1400, 1401, …) */
  date: number

  // ─── x: Player holdings ────────────────────────────────────────
  /** Player's current holdings (gold balance + asset quantities) */
  portfolio: Portfolio

  // ─── y: Market state ──────────────────────────────────────────
  /**
   * Market prices (real), regime (peace/war), and inflation at this timestep.
   * Asset/market returns are REAL — multiply by inflation for nominal prices.
   */
  market: MarketState

  // ─── z: Event history ─────────────────────────────────────────
  /** Random events that fired this step (Plague, Thieves, Crop Failure, etc.) */
  events: GameEvent[]

  // ─── Player input ────────────────────────────────────────────
  /** Actions the player took this step (empty for step 0) */
  actions: PlayerAction[]

  // ─── Goal tracking ─────────────────────────────────────────
  /** Inflation-adjusted goal amount for this timestep */
  goal: number
  /** Whether the player has reached the goal at any point */
  goalReached: boolean
}
