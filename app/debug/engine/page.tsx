"use client"

import { useMutation, useQuery } from "convex/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { DEBUG_SCENARIO } from "@/lib/game/debug-scenario"
import {
  applyActions,
  gameStep,
  initializeGame,
  isGameOver,
  portfolioValue,
  resolveEvents,
  stepMarket,
} from "@/lib/game/engine"
import { type MonteCarloDataPoint, runMonteCarloSimulations } from "@/lib/game/monte-carlo"
import type { PlayerAction } from "@/lib/types/actions"
import type { Portfolio, TradableAsset } from "@/lib/types/assets"
import { TRADABLE_ASSET_KEYS } from "@/lib/types/assets"
import type { GameEvent } from "@/lib/types/events"
import type { AssetMarketPrice, MarketState } from "@/lib/types/market"
import { buyPrice, nominalPrice, sellPrice } from "@/lib/types/market"
import type { Scenario } from "@/lib/types/scenario"
import type { StateVector } from "@/lib/types/state_vector"

// ─── Step-by-step phase machine ──────────────────────────────────

/** Phases for manual step-through mode */
type StepPhase = "trade" | "events" | "results"

/** Intermediate state between sub-steps */
type PhaseState = {
  phase: StepPhase
  /** Working portfolio during trade phase (live-updating as trades execute) */
  workingPortfolio?: Portfolio
  /** All trades executed so far in the trade phase */
  executedActions?: PlayerAction[]
  /** Portfolio after user actions (set after "trade" phase) */
  portfolioAfterActions?: Portfolio
  /** Portfolio after events (set after "events" phase) */
  portfolioAfterEvents?: Portfolio
  /** Prices after events (set after "events" phase) */
  pricesAfterEvents?: Record<TradableAsset, AssetMarketPrice>
  /** Events that fired this step */
  firedEvents?: GameEvent[]
  /** Market after full evolution (set after "results" phase) */
  newMarket?: MarketState
  /** Final portfolio including recurring revenue (set after "results" phase) */
  finalPortfolio?: Portfolio
  /** Inflation-adjusted goal for the new year (set after "results" phase) */
  newGoal?: number
  /** Whether goal was reached (set after "results" phase) */
  goalReached?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Editable number field with label */
function NumField({
  label,
  value,
  onChange,
  step = "any",
  min,
  className = "",
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: string
  min?: number
  className?: string
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <Input
        type="number"
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value) || 0)}
        className="h-8 font-mono text-xs"
      />
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold tracking-tight">{children}</h3>
}

// ─── Chart configuration ─────────────────────────────────────────

const chartConfig = {
  netWorth: {
    label: "Net Worth",
    color: "var(--chart-1)",
  },
  goal: {
    label: "Goal",
    color: "var(--chart-3)",
  },
  market: {
    label: "Market Index",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

/** Compute chart data from game history */
function buildChartData(history: StateVector[], scenario: Scenario) {
  // Get initial market value for normalizing the market index
  const initial = history[0]
  const initialMarketSum = TRADABLE_ASSET_KEYS.reduce(
    (sum, asset) => sum + nominalPrice(initial.market.prices[asset], initial.market.inflation),
    0,
  )
  // Scale factor: normalize market index so it starts at the same value as starting capital
  const marketScale = initialMarketSum > 0 ? scenario.startCapital / initialMarketSum : 1

  return history.map((state) => {
    const netWorth = portfolioValue(state.portfolio, state.market)
    const marketSum = TRADABLE_ASSET_KEYS.reduce(
      (sum, asset) => sum + nominalPrice(state.market.prices[asset], state.market.inflation),
      0,
    )
    return {
      year: state.date,
      netWorth: Math.round(netWorth * 100) / 100,
      goal: Math.round(state.goal * 100) / 100,
      market: Math.round(marketSum * marketScale * 100) / 100,
    }
  })
}

function PerformanceChart({ history, scenario }: { history: StateVector[]; scenario: Scenario }) {
  const data = buildChartData(history, scenario)

  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Over Time</CardTitle>
          <CardDescription>Play at least one year to see the chart.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Performance Over Time</CardTitle>
        <CardDescription>
          Portfolio net worth vs inflation-adjusted goal vs market index
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => String(v)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono">
                      {typeof value === "number" ? value.toLocaleString() : value} gold
                    </span>
                  )}
                />
              }
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="netWorth"
              name="Net Worth"
              fill="var(--color-netWorth)"
              fillOpacity={0.1}
              stroke="var(--color-netWorth)"
              strokeWidth={2.5}
            />
            <Line
              type="monotone"
              dataKey="goal"
              name="Goal"
              stroke="var(--color-goal)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="market"
              name="Market Index"
              stroke="var(--color-market)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              opacity={0.7}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ─── Monte Carlo chart ───────────────────────────────────────────

const mcChartConfig = {
  p10_p90: {
    label: "P10–P90 range",
    color: "var(--chart-4)",
  },
  p25_p75: {
    label: "P25–P75 range",
    color: "var(--chart-4)",
  },
  p50: {
    label: "Median (P50)",
    color: "var(--chart-4)",
  },
  actual: {
    label: "Your Path",
    color: "var(--chart-1)",
  },
  goal: {
    label: "Goal",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

const NUM_SIMS = 100

function MonteCarloChart({ history, scenario }: { history: StateVector[]; scenario: Scenario }) {
  const [mcData, setMcData] = useState<MonteCarloDataPoint[]>([])

  useEffect(() => {
    const loadData = async () => {
      const data = await runMonteCarloSimulations(history, scenario, NUM_SIMS)
      setMcData(data)
    }
    loadData()
  }, [history, scenario])

  if (mcData.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monte Carlo Simulation</CardTitle>
          <CardDescription>Play at least one year to see the simulation.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Transform data for stacked area bands
  // Recharts stacked areas need the *delta* between bands, not absolute values
  const bandData = mcData.map((d) => ({
    year: d.year,
    // Base (invisible) — bottom of the fan
    base: d.p10,
    // P10→P25 band
    band_10_25: d.p25 - d.p10,
    // P25→P75 band (IQR)
    band_25_75: d.p75 - d.p25,
    // P75→P90 band
    band_75_90: d.p90 - d.p75,
    // Lines (absolute)
    p50: d.p50,
    actual: d.actual,
    goal: d.goal,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monte Carlo Simulation ({NUM_SIMS} runs)</CardTitle>
        <CardDescription>
          What could have happened with your same strategy but different market outcomes. Shaded
          bands show the P10–P90 and P25–P75 ranges. Bold line is your actual path.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={mcChartConfig} className="h-[400px] w-full">
          <ComposedChart data={bandData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => String(v)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    // Hide the stacking helper fields
                    if (
                      name === "base" ||
                      name === "band_10_25" ||
                      name === "band_25_75" ||
                      name === "band_75_90"
                    )
                      return null
                    return (
                      <span className="font-mono">
                        {typeof value === "number" ? value.toLocaleString() : value} gold
                      </span>
                    )
                  }}
                />
              }
            />
            <Legend
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  base: "",
                  band_10_25: "P10–P90 range",
                  band_25_75: "P25–P75 range",
                  band_75_90: "",
                  p50: "Median (P50)",
                  actual: "Your Path",
                  goal: "Goal",
                }
                return labels[value] ?? value
              }}
            />

            {/* Invisible base to position the bands correctly */}
            <Area
              type="monotone"
              dataKey="base"
              stackId="band"
              fill="transparent"
              stroke="transparent"
              legendType="none"
            />
            {/* P10→P25 band (outer) */}
            <Area
              type="monotone"
              dataKey="band_10_25"
              stackId="band"
              fill="var(--color-p10_p90)"
              fillOpacity={0.1}
              stroke="transparent"
              name="band_10_25"
              legendType="none"
            />
            {/* P25→P75 band (inner / IQR) */}
            <Area
              type="monotone"
              dataKey="band_25_75"
              stackId="band"
              fill="var(--color-p25_p75)"
              fillOpacity={0.2}
              stroke="transparent"
              name="band_25_75"
              legendType="none"
            />
            {/* P75→P90 band (outer) */}
            <Area
              type="monotone"
              dataKey="band_75_90"
              stackId="band"
              fill="var(--color-p10_p90)"
              fillOpacity={0.1}
              stroke="transparent"
              name="band_75_90"
              legendType="none"
            />

            {/* Median line */}
            <Line
              type="monotone"
              dataKey="p50"
              name="p50"
              stroke="var(--color-p50)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              opacity={0.6}
            />
            {/* Actual player path */}
            <Line
              type="monotone"
              dataKey="actual"
              name="actual"
              stroke="var(--color-actual)"
              strokeWidth={2.5}
              dot={false}
            />
            {/* Goal line */}
            <Line
              type="monotone"
              dataKey="goal"
              name="goal"
              stroke="var(--color-goal)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>

        {/* Summary stats */}
        {mcData.length > 1 && (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
            {(() => {
              const last = mcData[mcData.length - 1]
              return (
                <>
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">P10 (worst 10%)</p>
                    <p className="font-mono text-sm font-semibold">{last.p10.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">P25</p>
                    <p className="font-mono text-sm font-semibold">{last.p25.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">Median (P50)</p>
                    <p className="font-mono text-sm font-semibold">{last.p50.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">P75</p>
                    <p className="font-mono text-sm font-semibold">{last.p75.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">P90 (best 10%)</p>
                    <p className="font-mono text-sm font-semibold">{last.p90.toLocaleString()}</p>
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Market Prices chart ─────────────────────────────────────────

const marketPriceChartConfig = {
  wood: {
    label: "Wood",
    color: "#8B4513",
  },
  potatoes: {
    label: "Potatoes",
    color: "#DAA520",
  },
  fish: {
    label: "Fish",
    color: "#00CED1",
  },
} satisfies ChartConfig

function MarketPriceChart({ history }: { history: StateVector[] }) {
  const data = useMemo(
    () =>
      history.map((state) => ({
        year: state.date,
        wood:
          Math.round(nominalPrice(state.market.prices.wood, state.market.inflation) * 100) / 100,
        potatoes:
          Math.round(nominalPrice(state.market.prices.potatoes, state.market.inflation) * 100) /
          100,
        fish:
          Math.round(nominalPrice(state.market.prices.fish, state.market.inflation) * 100) / 100,
        regime: state.market.regime,
      })),
    [history],
  )

  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Market Prices Over Time</CardTitle>
          <CardDescription>Play at least one year to see the chart.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Build reference areas for regimes
  const referenceAreas = []
  for (let i = 0; i < data.length - 1; i++) {
    const start = data[i].year
    const end = data[i + 1].year
    const regime = data[i].regime
    referenceAreas.push(
      <ReferenceArea
        key={i}
        x1={start}
        x2={end}
        fill={regime === "peace" ? "#22c55e" : "#ef4444"}
        fillOpacity={0.1}
        strokeOpacity={0}
      />,
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Market Prices Over Time</CardTitle>
        <CardDescription>
          Nominal prices (gold) for tradable assets. Background shows market regime (Green = Peace,
          Red = War).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={marketPriceChartConfig} className="h-[350px] w-full">
          <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => String(v)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => String(Math.round(v))}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono">
                      {typeof value === "number" ? value.toLocaleString() : value} gold
                    </span>
                  )}
                />
              }
            />
            <Legend />
            {referenceAreas}
            <Line
              type="monotone"
              dataKey="wood"
              name="Wood"
              stroke="#8B4513"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="potatoes"
              name="Potatoes"
              stroke="#DAA520"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="fish"
              name="Fish"
              stroke="#00CED1"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ─── Strategy: target allocation (buy-only rebalancing) ──────

/** Compute buy-only actions to move portfolio toward target allocation percentages */
function computeStrategyActions(
  portfolio: Portfolio,
  market: MarketState,
  targetPcts: { gold: number; wood: number; potatoes: number; fish: number },
): PlayerAction[] {
  const total = portfolioValue(portfolio, market)
  const actions: PlayerAction[] = []
  const sumPcts = targetPcts.gold + targetPcts.wood + targetPcts.potatoes + targetPcts.fish
  if (sumPcts <= 0) return actions

  // How much gold to keep as cash based on target gold %
  const goldTarget = total * (targetPcts.gold / sumPcts)
  const spendableGold = Math.max(0, portfolio.gold - goldTarget)
  if (spendableGold <= 0) return actions

  // Calculate deficit for each tradable asset vs target allocation
  const deficits: { asset: TradableAsset; deficit: number }[] = []
  let totalDeficit = 0

  for (const asset of TRADABLE_ASSET_KEYS) {
    const assetPct = targetPcts[asset] / sumPcts
    const targetValue = total * assetPct
    const currentValue = portfolio[asset] * sellPrice(market.prices[asset], market.inflation)
    const deficit = Math.max(0, targetValue - currentValue)
    if (deficit > 0) {
      deficits.push({ asset, deficit })
      totalDeficit += deficit
    }
  }

  if (totalDeficit <= 0) return actions

  // Allocate spendable gold proportionally to deficits
  let remainingGold = spendableGold
  for (const { asset, deficit } of deficits) {
    if (remainingGold <= 0) break
    const allocatedGold = spendableGold * (deficit / totalDeficit)
    const bp = buyPrice(market.prices[asset], market.inflation)
    if (bp <= 0) continue
    const qty = Math.floor(Math.min(allocatedGold, remainingGold) / bp)
    if (qty > 0) {
      actions.push({ type: "buy", asset, quantity: qty })
      remainingGold -= qty * bp
    }
  }

  return actions
}

export default function DebugPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8">Loading engine...</div>}>
      <DebugPage />
    </Suspense>
  )
}

function DebugPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gameId = searchParams.get("gameId") as Id<"games"> | null

  // ─── Convex state ───────────────────────────────────────────
  const convexHistory = useQuery(api.game.getGameTimeSeries, gameId ? { gameId } : "skip")
  const convexGame = useQuery(api.game.getGame, gameId ? { gameId } : "skip")
  const convexScenario = useQuery(
    api.game.getScenario,
    convexGame?.scenarioId ? { scenarioId: convexGame.scenarioId } : "skip",
  )
  const submitStepMutation = useMutation(api.game.submitStep)

  const [scenario, setScenario] = useState<Scenario>(() => structuredClone(DEBUG_SCENARIO))
  const [history, setHistory] = useState<StateVector[]>(() => [initializeGame(scenario)])

  // Sync convex data into local state
  useEffect(() => {
    if (convexHistory && convexHistory.length > 0) {
      // biome-ignore lint/suspicious/noExplicitAny: debug-only
      setHistory(convexHistory as any)
    }
    if (convexScenario) {
      const { _id, _creationTime, ...rest } = convexScenario
      // biome-ignore lint/suspicious/noExplicitAny: debug-only
      setScenario({ id: _id, ...rest } as any)
    }
  }, [convexHistory, convexScenario])

  const [actionInputs, setActionInputs] = useState<
    Record<TradableAsset, { buyQty: string; sellQty: string }>
  >({
    wood: { buyQty: "", sellQty: "" },
    potatoes: { buyQty: "", sellQty: "" },
    fish: { buyQty: "", sellQty: "" },
  })

  // ─── Step-by-step phase state ───────────────────────────────
  const [phaseState, setPhaseState] = useState<PhaseState>({ phase: "trade" })

  // ─── Strategy auto-run ──────────────────────────────────────
  const [strategyAlloc, setStrategyAlloc] = useState({ gold: 20, wood: 30, potatoes: 30, fish: 20 })

  const current = history[history.length - 1]
  const gameOver = isGameOver(scenario, current)

  const handleSubmitStep = useCallback(
    async (actions: PlayerAction[]) => {
      if (gameOver) return
      if (gameId) {
        try {
          await submitStepMutation({ gameId, actions })
        } catch (e) {
          console.error("Mutation failed:", e)
        }
        // History will be updated via useQuery sync
      } else {
        const newState = await gameStep(scenario, current, actions)
        setHistory((prev) => [...prev, newState])
      }
    },
    [current, gameId, gameOver, scenario, submitStepMutation],
  )

  // Working portfolio is either the in-progress trade state or the committed state
  const activePortfolio = phaseState.workingPortfolio ?? current.portfolio
  const totalValue = portfolioValue(activePortfolio, current.market)

  // ─── Step-by-step handlers ──────────────────────────────────

  /** Execute a single trade (buy or sell) on the working portfolio */
  const handleExecuteTrade = useCallback(
    (type: "buy" | "sell", asset: TradableAsset, quantity: number) => {
      if (gameOver || quantity <= 0) return
      const action: PlayerAction = { type, asset, quantity }
      const wp = phaseState.workingPortfolio ?? current.portfolio
      const newPortfolio = applyActions(wp, [action], current.market)

      // Only update if something actually changed (action wasn't skipped)
      const changed =
        type === "buy" ? newPortfolio[asset] !== wp[asset] : newPortfolio.gold !== wp.gold

      if (!changed) return

      setPhaseState((prev) => ({
        ...prev,
        workingPortfolio: newPortfolio,
        executedActions: [...(prev.executedActions ?? []), action],
      }))
    },
    [current.market, current.portfolio, gameOver, phaseState.workingPortfolio],
  )

  /** Undo all trades made this phase — reset working portfolio */
  const handleUndoAllTrades = useCallback(() => {
    setPhaseState((prev) => ({
      ...prev,
      workingPortfolio: undefined,
      executedActions: undefined,
    }))
    setActionInputs({
      wood: { buyQty: "", sellQty: "" },
      potatoes: { buyQty: "", sellQty: "" },
      fish: { buyQty: "", sellQty: "" },
    })
  }, [])

  /** Finalize trades and roll events */
  const handleDoneTrading = useCallback(async () => {
    if (gameOver) return
    const wp = phaseState.workingPortfolio ?? current.portfolio
    const actions = phaseState.executedActions ?? []

    // Roll events on the post-trade portfolio
    const {
      firedEvents,
      portfolio: portfolioAfterEvents,
      prices: pricesAfterEvents,
    } = await resolveEvents(scenario, wp, current.market.prices)

    setPhaseState({
      phase: "events",
      executedActions: actions,
      workingPortfolio: wp,
      portfolioAfterActions: wp,
      firedEvents,
      portfolioAfterEvents,
      pricesAfterEvents,
    })

    setActionInputs({
      wood: { buyQty: "", sellQty: "" },
      potatoes: { buyQty: "", sellQty: "" },
      fish: { buyQty: "", sellQty: "" },
    })
  }, [current, gameOver, phaseState.workingPortfolio, phaseState.executedActions, scenario])

  /** Phase 2: See market results — evolve market from event-modified state */
  const handleEvolveMarket = useCallback(() => {
    if (!phaseState.pricesAfterEvents || !phaseState.portfolioAfterEvents) return
    const marketAfterEvents: MarketState = {
      ...current.market,
      prices: phaseState.pricesAfterEvents,
    }
    const newMarket = stepMarket(scenario, marketAfterEvents)

    // Add recurring revenue
    const finalPortfolio: Portfolio = {
      ...phaseState.portfolioAfterEvents,
      gold: phaseState.portfolioAfterEvents.gold + scenario.recurringRevenue,
    }

    // Update inflation-adjusted goal
    const inflationRatio = newMarket.inflation / current.market.inflation
    const newGoal = current.goal * inflationRatio

    // Check if goal reached (sticky)
    const totalVal = portfolioValue(finalPortfolio, newMarket)
    const goalReached = current.goalReached || totalVal >= newGoal

    setPhaseState((prev) => ({
      ...prev,
      phase: "results",
      newMarket,
      finalPortfolio,
      newGoal,
      goalReached,
    }))
  }, [current, phaseState.pricesAfterEvents, phaseState.portfolioAfterEvents, scenario])

  /** Phase 3: Advance to next year — commit the completed step to history */
  const handleNextYear = useCallback(async () => {
    if (!phaseState.finalPortfolio || !phaseState.newMarket) return

    const actions = phaseState.executedActions ?? []
    await handleSubmitStep(actions)
    setPhaseState({ phase: "trade" })

    // Navigate to leaderboard if playing in a session
    if (gameId && convexGame?.sessionId) {
      const nextStep = current.step + 1
      const name = convexGame.playerName ?? ""
      router.push(
        `/debug/sessions/${convexGame.sessionId}/leaderboard?step=${nextStep}&gameId=${gameId}&name=${encodeURIComponent(name)}`,
      )
    }
  }, [phaseState, handleSubmitStep, gameId, convexGame, current.step, router])

  // ─── Old full-step handlers (auto-run, skip) ────────────────

  const handleStep = useCallback(async () => {
    if (gameOver) return
    const actions: PlayerAction[] = []
    for (const asset of TRADABLE_ASSET_KEYS) {
      const input = actionInputs[asset]
      const buyQty = Number.parseInt(input.buyQty, 10) || 0
      const sellQty = Number.parseInt(input.sellQty, 10) || 0
      if (buyQty > 0) actions.push({ type: "buy", asset, quantity: buyQty })
      if (sellQty > 0) actions.push({ type: "sell", asset, quantity: sellQty })
    }
    await handleSubmitStep(actions)
    setActionInputs({
      wood: { buyQty: "", sellQty: "" },
      potatoes: { buyQty: "", sellQty: "" },
      fish: { buyQty: "", sellQty: "" },
    })
  }, [actionInputs, gameOver, handleSubmitStep])

  const handleSkip = useCallback(async () => {
    if (gameOver) return
    await handleSubmitStep([])
    setPhaseState({ phase: "trade" })
  }, [gameOver, handleSubmitStep])

  const handleReset = useCallback(() => {
    setHistory([initializeGame(scenario)])
    setActionInputs({
      wood: { buyQty: "", sellQty: "" },
      potatoes: { buyQty: "", sellQty: "" },
      fish: { buyQty: "", sellQty: "" },
    })
    setPhaseState({ phase: "trade" })
  }, [scenario])

  /** Update a top-level scenario field and reset the game */
  const updateScenario = useCallback((patch: Partial<Scenario>) => {
    setScenario((prev) => {
      const next = { ...prev, ...patch }
      setHistory([initializeGame(next)])
      setPhaseState({ phase: "trade" })
      return next
    })
  }, [])

  /** Update a nested field via path and reset */
  const updateScenarioDeep = useCallback((updater: (draft: Scenario) => void) => {
    setScenario((prev) => {
      const next = structuredClone(prev)
      updater(next)
      setHistory([initializeGame(next)])
      setPhaseState({ phase: "trade" })
      return next
    })
  }, [])

  const handleResetToDefault = useCallback(() => {
    const fresh = structuredClone(DEBUG_SCENARIO)
    setScenario(fresh)
    setHistory([initializeGame(fresh)])
    setActionInputs({
      wood: { buyQty: "", sellQty: "" },
      potatoes: { buyQty: "", sellQty: "" },
      fish: { buyQty: "", sellQty: "" },
    })
    setPhaseState({ phase: "trade" })
  }, [])

  const handleAutoRun = useCallback(
    async (steps: number) => {
      if (gameId) {
        // Run steps one-by-one to persist them
        for (let i = 0; i < steps; i++) {
          const currentLatest = history[history.length - 1]
          if (isGameOver(scenario, currentLatest)) break
          await submitStepMutation({ gameId, actions: [] })
        }
      } else {
        let state = current
        const newHistory = [...history]
        for (let i = 0; i < steps; i++) {
          if (isGameOver(scenario, state)) break
          state = await gameStep(scenario, state, [])
          newHistory.push(state)
        }
        setHistory(newHistory)
      }
      setPhaseState({ phase: "trade" })
    },
    [current, history, scenario, gameId, submitStepMutation],
  )

  /** Auto-run with target allocation strategy (buy-only rebalancing) */
  const handleAutoRunStrategy = useCallback(
    async (steps: number) => {
      if (gameId) {
        for (let i = 0; i < steps; i++) {
          const currentLatest = history[history.length - 1]
          if (isGameOver(scenario, currentLatest)) break
          const actions = computeStrategyActions(
            currentLatest.portfolio,
            currentLatest.market,
            strategyAlloc,
          )
          await submitStepMutation({ gameId, actions })
        }
      } else {
        let state = current
        const newHistory = [...history]
        for (let i = 0; i < steps; i++) {
          if (isGameOver(scenario, state)) break
          const actions = computeStrategyActions(state.portfolio, state.market, strategyAlloc)
          state = await gameStep(scenario, state, actions)
          newHistory.push(state)
        }
        setHistory(newHistory)
      }
      setPhaseState({ phase: "trade" })
    },
    [current, history, scenario, strategyAlloc, gameId, submitStepMutation],
  )

  const fmt = (n: number) => n.toFixed(2)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {convexGame?.playerName ? `${convexGame.playerName}'s Game` : "Game Engine Debug"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Step {current.step} · {current.date} · Regime:{" "}
              <Badge variant={current.market.regime === "peace" ? "default" : "destructive"}>
                {current.market.regime.toUpperCase()}
              </Badge>{" "}
              · Goal: {fmt(current.goal)} /{" "}
              <span className={totalValue >= current.goal ? "text-green-600 font-bold" : ""}>
                {fmt(totalValue)}
              </span>
              {current.goalReached && (
                <Badge variant="default" className="ml-2 bg-green-600">
                  GOAL REACHED
                </Badge>
              )}
              {gameOver && (
                <Badge variant="outline" className="ml-2">
                  GAME OVER
                </Badge>
              )}
            </p>
          </div>
          {convexGame?.sessionId && (
            <Button
              variant="outline"
              size="sm"
              className={gameOver ? "animate-bounce border-primary" : ""}
              onClick={() => router.push(`/?sessionId=${convexGame.sessionId}`)}
            >
              ← Leave Game & Back to Dashboard
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={gameOver ? "animate-bounce border-primary" : ""}
            onClick={() =>
              router.push(convexGame?.sessionId ? `/?sessionId=${convexGame.sessionId}` : "/")
            }
          >
            {gameOver ? "Exit to Dashboard" : "Leave Game"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAutoRun(5)}>
            Auto +5
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAutoRun(12)}>
            Auto +12
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAutoRun(100)}>
            Auto All
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSkip} disabled={gameOver}>
            Skip (no action)
          </Button>
        </div>
      </div>

      {/* Strategy auto-run */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-3">
          <SectionTitle>Target Allocation</SectionTitle>
          <div className="flex items-center gap-1">
            <Label className="text-muted-foreground w-14 text-xs">Gold %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={strategyAlloc.gold}
              onChange={(e) =>
                setStrategyAlloc((prev) => ({ ...prev, gold: Number(e.target.value) || 0 }))
              }
              className="h-8 w-16 font-mono text-xs"
            />
          </div>
          {TRADABLE_ASSET_KEYS.map((asset) => (
            <div key={asset} className="flex items-center gap-1">
              <Label className="text-muted-foreground w-14 text-xs">
                {asset === "wood" ? "🪵" : asset === "potatoes" ? "🥔" : "🐟"}{" "}
                {asset.charAt(0).toUpperCase() + asset.slice(1)} %
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={strategyAlloc[asset]}
                onChange={(e) =>
                  setStrategyAlloc((prev) => ({
                    ...prev,
                    [asset]: Number(e.target.value) || 0,
                  }))
                }
                className="h-8 w-16 font-mono text-xs"
              />
            </div>
          ))}
          <span
            className={`font-mono text-xs ${
              strategyAlloc.gold +
                strategyAlloc.wood +
                strategyAlloc.potatoes +
                strategyAlloc.fish ===
              100
                ? "text-muted-foreground"
                : "text-destructive font-bold"
            }`}
          >
            Σ{" "}
            {strategyAlloc.gold + strategyAlloc.wood + strategyAlloc.potatoes + strategyAlloc.fish}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAutoRunStrategy(1)}
            disabled={gameOver}
          >
            Strategy +1
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAutoRunStrategy(5)}
            disabled={gameOver}
          >
            Strategy +5
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleAutoRunStrategy(100)}
            disabled={gameOver}
          >
            Strategy to End
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="step-by-step">
        <TabsList>
          <TabsTrigger value="step-by-step">Step-by-Step</TabsTrigger>
          <TabsTrigger value="state">Current State</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="scenario">Scenario Config</TabsTrigger>
        </TabsList>

        {/* ─── Step-by-Step Tab ────────────────────────────────── */}
        <TabsContent value="step-by-step" className="space-y-4">
          {/* Phase indicator */}
          <div className="flex items-center gap-3">
            <Badge
              variant={phaseState.phase === "trade" ? "default" : "outline"}
              className="text-xs"
            >
              1. Trade
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge
              variant={phaseState.phase === "events" ? "default" : "outline"}
              className="text-xs"
            >
              2. Events
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge
              variant={phaseState.phase === "results" ? "default" : "outline"}
              className="text-xs"
            >
              3. Year Results
            </Badge>
          </div>

          {/* ── Phase: TRADE — show portfolio + prices, let user buy/sell ── */}
          {phaseState.phase === "trade" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Year {current.date} · Step {current.step} — Trade
                </CardTitle>
                <CardDescription>
                  Execute trades one by one. Each trade updates your portfolio immediately. When
                  done, click &quot;Done Trading&quot; to roll events.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Portfolio summary (shows working portfolio) */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">💰 Gold</Label>
                    <p className="font-mono text-sm font-bold">
                      {fmt(activePortfolio.gold)}
                      {activePortfolio.gold !== current.portfolio.gold && (
                        <span
                          className={`ml-1 text-xs font-normal ${activePortfolio.gold < current.portfolio.gold ? "text-red-500" : "text-green-500"}`}
                        >
                          ({activePortfolio.gold > current.portfolio.gold ? "+" : ""}
                          {fmt(activePortfolio.gold - current.portfolio.gold)})
                        </span>
                      )}
                    </p>
                  </div>
                  {TRADABLE_ASSET_KEYS.map((asset) => {
                    const cur = current.portfolio[asset]
                    const wp = activePortfolio[asset]
                    return (
                      <div key={asset} className="space-y-1">
                        <Label className="text-muted-foreground text-xs">
                          {asset === "wood" ? "🪵" : asset === "potatoes" ? "🥔" : "🐟"}{" "}
                          {asset.charAt(0).toUpperCase() + asset.slice(1)}
                        </Label>
                        <p className="font-mono text-sm">
                          {wp} units
                          {wp !== cur && (
                            <span
                              className={`ml-1 text-xs ${wp > cur ? "text-green-500" : "text-red-500"}`}
                            >
                              ({wp > cur ? "+" : ""}
                              {wp - cur})
                            </span>
                          )}
                        </p>
                      </div>
                    )
                  })}
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Total Value</Label>
                    <p className="font-mono text-sm font-bold">{fmt(totalValue)}</p>
                  </div>
                </div>

                {/* Goal progress */}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">🎯 Goal: {fmt(current.goal)} gold</span>
                    <span
                      className={`text-sm font-bold ${totalValue >= current.goal ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      {fmt(totalValue)} / {fmt(current.goal)} (
                      {((totalValue / current.goal) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="bg-muted mt-2 h-2 w-full overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${totalValue >= current.goal ? "bg-green-500" : "bg-primary"}`}
                      style={{
                        width: `${Math.min(100, (totalValue / current.goal) * 100)}%`,
                      }}
                    />
                  </div>
                  {current.goalReached && (
                    <p className="mt-1 text-xs font-medium text-green-600">
                      ✅ Goal already reached! Continue playing until {scenario.endYear}.
                    </p>
                  )}
                </div>

                {/* Executed trades so far */}
                {phaseState.executedActions && phaseState.executedActions.length > 0 && (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <SectionTitle>Trades Executed</SectionTitle>
                      <Button variant="ghost" size="sm" onClick={handleUndoAllTrades}>
                        ↩ Undo All
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {phaseState.executedActions.map((a, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: debug-only
                        <Badge key={`${a.type}-${a.asset}-${i}`} variant="outline">
                          {a.type.toUpperCase()} {a.quantity}× {a.asset}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Per-asset trade cards */}
                <div>
                  <SectionTitle>Trade</SectionTitle>
                  <p className="text-muted-foreground mb-3 text-sm">
                    Enter quantity and click Buy or Sell. Each trade executes immediately at current
                    prices.
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {TRADABLE_ASSET_KEYS.map((asset) => {
                      const mp = current.market.prices[asset]
                      const inf = current.market.inflation
                      const bp = buyPrice(mp, inf)
                      const sp = sellPrice(mp, inf)
                      const holding = activePortfolio[asset]
                      return (
                        <Card key={asset}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">
                              {asset === "wood" ? "🪵" : asset === "potatoes" ? "🥔" : "🐟"}{" "}
                              {asset.charAt(0).toUpperCase() + asset.slice(1)}
                            </CardTitle>
                            <p className="text-muted-foreground text-xs">
                              Holding: <strong>{holding}</strong> · Buy @{fmt(bp)} · Sell @{fmt(sp)}
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                placeholder="Qty"
                                value={actionInputs[asset].buyQty}
                                onChange={(e) =>
                                  setActionInputs((prev) => ({
                                    ...prev,
                                    [asset]: { ...prev[asset], buyQty: e.target.value },
                                  }))
                                }
                                className="font-mono"
                              />
                              <Button
                                size="sm"
                                variant="default"
                                disabled={
                                  gameOver ||
                                  !(Number.parseInt(actionInputs[asset].buyQty, 10) > 0) ||
                                  activePortfolio.gold <
                                    bp * (Number.parseInt(actionInputs[asset].buyQty, 10) || 0)
                                }
                                onClick={() => {
                                  const qty = Number.parseInt(actionInputs[asset].buyQty, 10) || 0
                                  if (qty > 0) {
                                    handleExecuteTrade("buy", asset, qty)
                                    setActionInputs((prev) => ({
                                      ...prev,
                                      [asset]: { ...prev[asset], buyQty: "" },
                                    }))
                                  }
                                }}
                                className="shrink-0"
                              >
                                Buy
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                max={holding}
                                placeholder="Qty"
                                value={actionInputs[asset].sellQty}
                                onChange={(e) =>
                                  setActionInputs((prev) => ({
                                    ...prev,
                                    [asset]: { ...prev[asset], sellQty: e.target.value },
                                  }))
                                }
                                className="font-mono"
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={
                                  gameOver ||
                                  !(Number.parseInt(actionInputs[asset].sellQty, 10) > 0) ||
                                  holding < (Number.parseInt(actionInputs[asset].sellQty, 10) || 0)
                                }
                                onClick={() => {
                                  const qty = Number.parseInt(actionInputs[asset].sellQty, 10) || 0
                                  if (qty > 0) {
                                    handleExecuteTrade("sell", asset, qty)
                                    setActionInputs((prev) => ({
                                      ...prev,
                                      [asset]: { ...prev[asset], sellQty: "" },
                                    }))
                                  }
                                }}
                                className="shrink-0"
                              >
                                Sell
                              </Button>
                            </div>
                            <p className="text-muted-foreground text-xs">
                              Max buy: {Math.floor(activePortfolio.gold / bp)} · Max sell: {holding}
                            </p>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>

                <Button
                  onClick={handleDoneTrading}
                  disabled={gameOver}
                  className="w-full"
                  size="lg"
                >
                  ✅ Done Trading → Roll Events
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Phase: EVENTS — show trades + events, button to see market results ── */}
          {phaseState.phase === "events" && phaseState.portfolioAfterEvents && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Year {current.date} · Events Resolved</CardTitle>
                <CardDescription>
                  Your trades have been executed. Random events have been rolled — review the
                  effects below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Trades recap */}
                {phaseState.executedActions && phaseState.executedActions.length > 0 && (
                  <div>
                    <SectionTitle>Trades Executed</SectionTitle>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {phaseState.executedActions.map((a, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: debug-only
                        <Badge key={`${a.type}-${a.asset}-${i}`} variant="outline">
                          {a.type.toUpperCase()} {a.quantity}× {a.asset}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Portfolio after trades (before events) */}
                {phaseState.portfolioAfterActions && (
                  <div>
                    <SectionTitle>Portfolio after Trades</SectionTitle>
                    <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-5">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Gold</Label>
                        <p className="font-mono text-sm">
                          {fmt(phaseState.portfolioAfterActions.gold)}
                          {phaseState.portfolioAfterActions.gold !== current.portfolio.gold && (
                            <span
                              className={`ml-1 text-xs ${phaseState.portfolioAfterActions.gold < current.portfolio.gold ? "text-red-500" : "text-green-500"}`}
                            >
                              (
                              {phaseState.portfolioAfterActions.gold > current.portfolio.gold
                                ? "+"
                                : ""}
                              {fmt(phaseState.portfolioAfterActions.gold - current.portfolio.gold)})
                            </span>
                          )}
                        </p>
                      </div>
                      {TRADABLE_ASSET_KEYS.map((asset) => {
                        const before = current.portfolio[asset]
                        const after = phaseState.portfolioAfterActions![asset]
                        return (
                          <div key={asset} className="space-y-1">
                            <Label className="text-muted-foreground text-xs">
                              {asset === "wood" ? "🪵" : asset === "potatoes" ? "🥔" : "🐟"}{" "}
                              {asset.charAt(0).toUpperCase() + asset.slice(1)}
                            </Label>
                            <p className="font-mono text-sm">
                              {after}
                              {after !== before && (
                                <span
                                  className={`ml-1 text-xs ${after > before ? "text-green-500" : "text-red-500"}`}
                                >
                                  ({after > before ? "+" : ""}
                                  {after - before})
                                </span>
                              )}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Events display */}
                <SectionTitle>Events</SectionTitle>
                {phaseState.firedEvents && phaseState.firedEvents.length > 0 ? (
                  <div className="space-y-3">
                    {phaseState.firedEvents.map((ev, i) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: debug-only
                        key={`${ev.type}-${i}`}
                        className="bg-destructive/10 border-destructive/20 rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">{ev.name}</Badge>
                          {ev.targetAsset && <Badge variant="outline">→ {ev.targetAsset}</Badge>}
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">{ev.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      ✨ No events fired this year — a peaceful year!
                    </p>
                  </div>
                )}

                {/* Portfolio after events (if different from after-trades) */}
                {phaseState.portfolioAfterActions && (
                  <div>
                    <SectionTitle>Portfolio after Events</SectionTitle>
                    <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-5">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Gold</Label>
                        <p className="font-mono text-sm">
                          {fmt(phaseState.portfolioAfterEvents.gold)}
                          {phaseState.portfolioAfterEvents.gold !==
                            phaseState.portfolioAfterActions.gold && (
                            <span className="ml-1 text-xs text-red-500">
                              (
                              {fmt(
                                phaseState.portfolioAfterEvents.gold -
                                  phaseState.portfolioAfterActions.gold,
                              )}
                              )
                            </span>
                          )}
                        </p>
                      </div>
                      {TRADABLE_ASSET_KEYS.map((asset) => {
                        const before = phaseState.portfolioAfterActions![asset]
                        const after = phaseState.portfolioAfterEvents![asset]
                        return (
                          <div key={asset} className="space-y-1">
                            <Label className="text-muted-foreground text-xs">
                              {asset === "wood" ? "🪵" : asset === "potatoes" ? "🥔" : "🐟"}{" "}
                              {asset.charAt(0).toUpperCase() + asset.slice(1)}
                            </Label>
                            <p className="font-mono text-sm">
                              {after}
                              {after !== before && (
                                <span className="ml-1 text-xs text-red-500">
                                  ({after - before})
                                </span>
                              )}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Price changes from events */}
                {phaseState.pricesAfterEvents && (
                  <div>
                    <SectionTitle>Base Prices after Events</SectionTitle>
                    <div className="mt-2 grid grid-cols-3 gap-4">
                      {TRADABLE_ASSET_KEYS.map((asset) => {
                        const before = current.market.prices[asset].basePrice
                        const after = phaseState.pricesAfterEvents![asset].basePrice
                        return (
                          <div key={asset} className="space-y-1">
                            <Label className="text-muted-foreground text-xs">
                              {asset.charAt(0).toUpperCase() + asset.slice(1)} base
                            </Label>
                            <p className="font-mono text-sm">
                              {fmt(after)}
                              {Math.abs(after - before) > 0.001 && (
                                <span
                                  className={`ml-1 text-xs ${after < before ? "text-red-500" : "text-green-500"}`}
                                >
                                  ({after > before ? "+" : ""}
                                  {fmt(after - before)})
                                </span>
                              )}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <Separator />
                <Button onClick={handleEvolveMarket} className="w-full" size="lg">
                  📈 See Market Development
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Phase: RESULTS — show final year results, advance to next year ── */}
          {phaseState.phase === "results" && phaseState.finalPortfolio && phaseState.newMarket && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Year {current.date} · End-of-Year Results
                </CardTitle>
                <CardDescription>
                  The market has evolved and your farm produced {fmt(scenario.recurringRevenue)}{" "}
                  gold income. Review the final state of the year.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Regime + inflation */}
                <div className="flex items-center gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Regime</Label>
                    <div>
                      <Badge
                        variant={
                          phaseState.newMarket.regime === "peace" ? "default" : "destructive"
                        }
                      >
                        {phaseState.newMarket.regime.toUpperCase()}
                      </Badge>
                      {phaseState.newMarket.regime !== current.market.regime && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          (was {current.market.regime})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Inflation</Label>
                    <p className="font-mono text-sm">
                      {fmt(phaseState.newMarket.inflation)}x
                      <span className="text-muted-foreground ml-1 text-xs">
                        (was {fmt(current.market.inflation)}x)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Market prices table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Old Nominal</TableHead>
                      <TableHead className="text-right">New Nominal</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TRADABLE_ASSET_KEYS.map((asset) => {
                      const oldMp = current.market.prices[asset]
                      const newMp = phaseState.newMarket!.prices[asset]
                      const inf = phaseState.newMarket!.inflation
                      const oldNom = nominalPrice(oldMp, current.market.inflation)
                      const newNom = nominalPrice(newMp, inf)
                      const pctChange = ((newNom - oldNom) / oldNom) * 100
                      return (
                        <TableRow key={asset}>
                          <TableCell className="font-medium">
                            {asset === "wood" ? "🪵" : asset === "potatoes" ? "🥔" : "🐟"} {asset}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-right font-mono">
                            {fmt(oldNom)}
                          </TableCell>
                          <TableCell className="text-right font-mono">{fmt(newNom)}</TableCell>
                          <TableCell
                            className={`text-right font-mono text-xs ${pctChange >= 0 ? "text-green-500" : "text-red-500"}`}
                          >
                            {pctChange >= 0 ? "+" : ""}
                            {pctChange.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {/* Events + actions recap */}
                <div className="flex flex-wrap gap-2">
                  {phaseState.executedActions && phaseState.executedActions.length > 0 && (
                    <>
                      <span className="text-muted-foreground text-xs">Trades:</span>
                      {phaseState.executedActions.map((a, i) => (
                        <Badge
                          // biome-ignore lint/suspicious/noArrayIndexKey: debug-only
                          key={`${a.type}-${a.asset}-${i}`}
                          variant="outline"
                          className="text-xs"
                        >
                          {a.type.toUpperCase()} {a.quantity}× {a.asset}
                        </Badge>
                      ))}
                    </>
                  )}
                  {phaseState.firedEvents && phaseState.firedEvents.length > 0 && (
                    <>
                      <span className="text-muted-foreground text-xs">Events:</span>
                      {phaseState.firedEvents.map((ev, i) => (
                        <Badge
                          // biome-ignore lint/suspicious/noArrayIndexKey: debug-only
                          key={`${ev.type}-${i}`}
                          variant="secondary"
                          className="text-xs"
                        >
                          {ev.name}
                          {ev.targetAsset ? ` → ${ev.targetAsset}` : ""}
                        </Badge>
                      ))}
                    </>
                  )}
                </div>

                <Separator />

                {/* Final portfolio */}
                <div>
                  <SectionTitle>Final Portfolio (entering next year)</SectionTitle>
                  <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-5">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">💰 Gold</Label>
                      <p className="font-mono text-sm font-bold">
                        {fmt(phaseState.finalPortfolio.gold)}
                        <span className="text-muted-foreground ml-1 text-xs font-normal">
                          (was {fmt(current.portfolio.gold)})
                        </span>
                      </p>
                    </div>
                    {TRADABLE_ASSET_KEYS.map((asset) => {
                      const before = current.portfolio[asset]
                      const after = phaseState.finalPortfolio![asset]
                      const newSp = sellPrice(
                        phaseState.newMarket!.prices[asset],
                        phaseState.newMarket!.inflation,
                      )
                      return (
                        <div key={asset} className="space-y-1">
                          <Label className="text-muted-foreground text-xs">
                            {asset === "wood" ? "🪵" : asset === "potatoes" ? "🥔" : "🐟"}{" "}
                            {asset.charAt(0).toUpperCase() + asset.slice(1)}
                          </Label>
                          <p className="font-mono text-sm">
                            {after} units ({fmt(after * newSp)})
                            {after !== before && (
                              <span
                                className={`ml-1 text-xs ${after > before ? "text-green-500" : "text-red-500"}`}
                              >
                                ({after > before ? "+" : ""}
                                {after - before})
                              </span>
                            )}
                          </p>
                        </div>
                      )
                    })}
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">New Total Value</Label>
                      <p className="font-mono text-sm font-bold">
                        {fmt(portfolioValue(phaseState.finalPortfolio, phaseState.newMarket))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Goal progress for end-of-year */}
                {phaseState.newGoal !== undefined && (
                  <div
                    className={`rounded-lg border p-3 ${phaseState.goalReached ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        🎯 Goal (inflation-adjusted): {fmt(phaseState.newGoal)} gold
                      </span>
                      <span
                        className={`text-sm font-bold ${portfolioValue(phaseState.finalPortfolio, phaseState.newMarket) >= phaseState.newGoal ? "text-green-600" : "text-muted-foreground"}`}
                      >
                        {fmt(portfolioValue(phaseState.finalPortfolio, phaseState.newMarket))} /{" "}
                        {fmt(phaseState.newGoal)}
                      </span>
                    </div>
                    <div className="bg-muted mt-2 h-2 w-full overflow-hidden rounded-full">
                      <div
                        className={`h-full rounded-full transition-all ${portfolioValue(phaseState.finalPortfolio, phaseState.newMarket) >= phaseState.newGoal ? "bg-green-500" : "bg-primary"}`}
                        style={{
                          width: `${Math.min(100, (portfolioValue(phaseState.finalPortfolio, phaseState.newMarket) / phaseState.newGoal) * 100)}%`,
                        }}
                      />
                    </div>
                    {phaseState.goalReached && !current.goalReached && (
                      <p className="mt-2 text-sm font-bold text-green-600">
                        🎉 Congratulations! You reached the goal this year!
                      </p>
                    )}
                    {phaseState.goalReached && current.goalReached && (
                      <p className="mt-1 text-xs font-medium text-green-600">
                        ✅ Goal already reached. Continue to end year {scenario.endYear}.
                      </p>
                    )}
                  </div>
                )}

                <Button onClick={handleNextYear} className="w-full" size="lg">
                  ➡️ Advance to Year {current.date + 1}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Current State Tab ──────────────────────────────────── */}
        <TabsContent value="state" className="space-y-4">
          {/* Portfolio + Value */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Portfolio (x)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Nominal Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">💰 Gold</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(current.portfolio.gold)}
                      </TableCell>
                    </TableRow>
                    {TRADABLE_ASSET_KEYS.map((asset) => {
                      const qty = current.portfolio[asset]
                      const sp = sellPrice(current.market.prices[asset], current.market.inflation)
                      return (
                        <TableRow key={asset}>
                          <TableCell className="font-medium">
                            {asset === "wood" ? "🪵" : asset === "potatoes" ? "🥔" : "🐟"} {asset}
                          </TableCell>
                          <TableCell className="text-right font-mono">{qty}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(qty * sp)}</TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow className="border-t-2">
                      <TableCell className="font-bold">Total</TableCell>
                      <TableCell />
                      <TableCell className="text-right font-mono font-bold">
                        {fmt(totalValue)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Market Prices */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Market Prices (y) · Inflation: {fmt(current.market.inflation)}x
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Real Base</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead className="text-right">Buy @</TableHead>
                      <TableHead className="text-right">Sell @</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TRADABLE_ASSET_KEYS.map((asset) => {
                      const mp = current.market.prices[asset]
                      const inf = current.market.inflation
                      return (
                        <TableRow key={asset}>
                          <TableCell className="font-medium">{asset}</TableCell>
                          <TableCell className="text-right font-mono">
                            {fmt(mp.basePrice)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {fmt(nominalPrice(mp, inf))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-500">
                            {fmt(buyPrice(mp, inf))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-500">
                            {fmt(sellPrice(mp, inf))}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <div className="text-muted-foreground mt-2 text-xs">
                  Buy factor: {scenario.buyFactor}× · Sell factor: {scenario.sellFactor}×
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Events this step */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Events this Step (z)</CardTitle>
            </CardHeader>
            <CardContent>
              {current.events.length === 0 ? (
                <p className="text-muted-foreground text-sm">No events fired this step.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {current.events.map((ev, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: debug-only
                    <Badge key={`${ev.type}-${i}`} variant="secondary">
                      {ev.name}
                      {ev.targetAsset ? ` → ${ev.targetAsset}` : " (global)"}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions taken */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Actions taken this Step</CardTitle>
            </CardHeader>
            <CardContent>
              {current.actions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No actions (step 0 or skipped).</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {current.actions.map((a, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: debug-only
                    <Badge key={`${a.type}-${a.asset}-${i}`} variant="outline">
                      {a.type.toUpperCase()} {a.quantity}× {a.asset}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Actions Tab ────────────────────────────────────────── */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Submit Actions & Advance Step</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Enter quantities to buy/sell, then click &quot;Execute Step&quot;. Leave empty or 0
                to skip. Gold available: <strong>{fmt(current.portfolio.gold)}</strong>
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {TRADABLE_ASSET_KEYS.map((asset) => {
                  const mp = current.market.prices[asset]
                  const inf = current.market.inflation
                  return (
                    <Card key={asset}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {asset === "wood" ? "🪵" : asset === "potatoes" ? "🥔" : "🐟"}{" "}
                          {asset.charAt(0).toUpperCase() + asset.slice(1)}
                        </CardTitle>
                        <p className="text-muted-foreground text-xs">
                          Holding: {current.portfolio[asset]} · Buy @{fmt(buyPrice(mp, inf))} · Sell
                          @{fmt(sellPrice(mp, inf))}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="w-10 text-xs">Buy</Label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={actionInputs[asset].buyQty}
                            onChange={(e) =>
                              setActionInputs((prev) => ({
                                ...prev,
                                [asset]: { ...prev[asset], buyQty: e.target.value },
                              }))
                            }
                            className="font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="w-10 text-xs">Sell</Label>
                          <Input
                            type="number"
                            min={0}
                            max={current.portfolio[asset]}
                            placeholder="0"
                            value={actionInputs[asset].sellQty}
                            onChange={(e) =>
                              setActionInputs((prev) => ({
                                ...prev,
                                [asset]: { ...prev[asset], sellQty: e.target.value },
                              }))
                            }
                            className="font-mono"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
              <Button onClick={handleStep} disabled={gameOver} className="w-full">
                Execute Step →
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── History Tab ─────────────────────────────────────────── */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Full State History ({history.length} steps)
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Step</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Regime</TableHead>
                    <TableHead className="text-right">Inflation</TableHead>
                    <TableHead className="text-right">Gold</TableHead>
                    <TableHead className="text-right">Wood</TableHead>
                    <TableHead className="text-right">Potatoes</TableHead>
                    <TableHead className="text-right">Fish</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-right">Goal</TableHead>
                    <TableHead>Goal?</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((s) => (
                    <TableRow key={s.step}>
                      <TableCell className="font-mono">{s.step}</TableCell>
                      <TableCell className="font-mono text-xs">{s.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant={s.market.regime === "peace" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {s.market.regime}
                        </Badge>{" "}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(s.market.inflation)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmt(s.portfolio.gold)}
                      </TableCell>
                      <TableCell className="text-right font-mono">{s.portfolio.wood}</TableCell>
                      <TableCell className="text-right font-mono">{s.portfolio.potatoes}</TableCell>
                      <TableCell className="text-right font-mono">{s.portfolio.fish}</TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {fmt(portfolioValue(s.portfolio, s.market))}
                      </TableCell>
                      <TableCell className="text-right font-mono">{fmt(s.goal)}</TableCell>
                      <TableCell>
                        {s.goalReached && (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            ✓
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-32 text-xs">
                        {s.events.length === 0 ? "—" : s.events.map((e) => e.name).join(", ")}
                      </TableCell>
                      <TableCell className="max-w-32 text-xs">
                        {s.actions.length === 0
                          ? "—"
                          : s.actions.map((a) => `${a.type} ${a.quantity}× ${a.asset}`).join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Charts Tab ──────────────────────────────────────── */}
        <TabsContent value="charts" className="space-y-4">
          <PerformanceChart history={history} scenario={scenario} />
          <MarketPriceChart history={history} />
          <MonteCarloChart history={history} scenario={scenario} />
        </TabsContent>

        {/* ─── Scenario Config Tab (editable) ──────────────────────── */}
        <TabsContent value="scenario" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Edit any value below. The game resets automatically when you change a parameter.
            </p>
            <Button variant="outline" size="sm" onClick={handleResetToDefault}>
              Reset to Defaults
            </Button>
          </div>

          {/* General */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">General</CardTitle>
              <CardDescription>Basic game parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <NumField
                  label="Start Capital (gold)"
                  value={scenario.startCapital}
                  onChange={(v) => updateScenario({ startCapital: v })}
                  min={0}
                />
                <NumField
                  label="Recurring Revenue (gold/step)"
                  value={scenario.recurringRevenue}
                  onChange={(v) => updateScenario({ recurringRevenue: v })}
                  min={0}
                />
                <NumField
                  label="Buy Factor (>1)"
                  value={scenario.buyFactor}
                  onChange={(v) => updateScenario({ buyFactor: v })}
                  step="0.01"
                />
                <NumField
                  label="Sell Factor (<1)"
                  value={scenario.sellFactor}
                  onChange={(v) => updateScenario({ sellFactor: v })}
                  step="0.01"
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <NumField
                  label="Start Year"
                  value={scenario.startYear}
                  onChange={(v) => updateScenario({ startYear: v })}
                  step="1"
                  min={1}
                />
                <NumField
                  label="End Year"
                  value={scenario.endYear}
                  onChange={(v) => updateScenario({ endYear: v })}
                  step="1"
                  min={1}
                />
                <NumField
                  label="Goal Amount"
                  value={scenario.goalAmount}
                  onChange={(v) => updateScenario({ goalAmount: v })}
                  min={0}
                />
              </div>
            </CardContent>
          </Card>

          {/* Inflation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Inflation</CardTitle>
              <CardDescription>
                r_inflation ~ N(μ, σ²) · cumulative factor multiplied each step
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <NumField
                  label="μ (mean return)"
                  value={scenario.inflationReturn}
                  onChange={(v) => updateScenario({ inflationReturn: v })}
                  step="0.001"
                />
                <NumField
                  label="σ (volatility)"
                  value={scenario.inflationVolatility}
                  onChange={(v) => updateScenario({ inflationVolatility: v })}
                  step="0.001"
                />
              </div>
            </CardContent>
          </Card>

          {/* Market Regime */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Market Regime</CardTitle>
              <CardDescription>
                r_market ~ N(μ_regime, σ_regime²) · regime transitions with Markov probabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <NumField
                  label="Peace → War probability"
                  value={scenario.market.peaceToWarProbability ?? 0}
                  onChange={(v) =>
                    updateScenarioDeep((d) => {
                      d.market.peaceToWarProbability = v
                    })
                  }
                  step="0.01"
                />
                <NumField
                  label="War → Peace probability"
                  value={scenario.market.warToPeaceProbability ?? 0}
                  onChange={(v) =>
                    updateScenarioDeep((d) => {
                      d.market.warToPeaceProbability = v
                    })
                  }
                  step="0.01"
                />
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <NumField
                  label="Peace μ (mean return)"
                  value={scenario.market.peaceReturn ?? 0}
                  onChange={(v) =>
                    updateScenarioDeep((d) => {
                      d.market.peaceReturn = v
                    })
                  }
                  step="0.001"
                />
                <NumField
                  label="Peace σ (volatility)"
                  value={scenario.market.peaceVolatility ?? 0}
                  onChange={(v) =>
                    updateScenarioDeep((d) => {
                      d.market.peaceVolatility = v
                    })
                  }
                  step="0.001"
                />
                <NumField
                  label="War μ (mean return)"
                  value={scenario.market.warReturn ?? 0}
                  onChange={(v) =>
                    updateScenarioDeep((d) => {
                      d.market.warReturn = v
                    })
                  }
                  step="0.001"
                />
                <NumField
                  label="War σ (volatility)"
                  value={scenario.market.warVolatility ?? 0}
                  onChange={(v) =>
                    updateScenarioDeep((d) => {
                      d.market.warVolatility = v
                    })
                  }
                  step="0.001"
                />
              </div>
            </CardContent>
          </Card>

          {/* Per-Asset Pricing */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Asset Pricing & Events</CardTitle>
              <CardDescription>
                r_asset ~ N(μ_asset, σ_asset²) · per-asset real return + specific risk event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {TRADABLE_ASSET_KEYS.map((asset) => {
                const cfg = scenario.assets[asset]
                const icon = asset === "wood" ? "🪵" : asset === "potatoes" ? "🥔" : "🐟"
                return (
                  <div key={asset}>
                    <SectionTitle>
                      {icon} {asset.charAt(0).toUpperCase() + asset.slice(1)}
                    </SectionTitle>
                    <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-3">
                      <NumField
                        label="Start Price"
                        value={cfg.startPrice}
                        onChange={(v) =>
                          updateScenarioDeep((d) => {
                            d.assets[asset].startPrice = v
                          })
                        }
                        min={0.01}
                        step="0.1"
                      />
                      <NumField
                        label="μ (mean real return)"
                        value={cfg.priceReturn}
                        onChange={(v) =>
                          updateScenarioDeep((d) => {
                            d.assets[asset].priceReturn = v
                          })
                        }
                        step="0.001"
                      />
                      <NumField
                        label="σ (volatility)"
                        value={cfg.priceVolatility}
                        onChange={(v) =>
                          updateScenarioDeep((d) => {
                            d.assets[asset].priceVolatility = v
                          })
                        }
                        step="0.001"
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Event Type</Label>
                        <Input
                          type="text"
                          value={cfg.event.type}
                          disabled
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <NumField
                        label="Event Probability"
                        value={cfg.event.probability}
                        onChange={(v) =>
                          updateScenarioDeep((d) => {
                            d.assets[asset].event.probability = v
                          })
                        }
                        step="0.01"
                        min={0}
                      />
                      <NumField
                        label="Qty Multiplier"
                        value={cfg.event.quantityMultiplier ?? 1}
                        onChange={(v) =>
                          updateScenarioDeep((d) => {
                            d.assets[asset].event.quantityMultiplier = v
                          })
                        }
                        step="0.05"
                      />
                      <NumField
                        label="Price Multiplier"
                        value={cfg.event.priceMultiplier ?? 1}
                        onChange={(v) =>
                          updateScenarioDeep((d) => {
                            d.assets[asset].event.priceMultiplier = v
                          })
                        }
                        step="0.05"
                      />
                    </div>
                    {asset !== "fish" && <Separator className="mt-4" />}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Global Events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Global Events</CardTitle>
              <CardDescription>
                Events that affect all assets or gold balance each step
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scenario.globalEvents.map((ev, idx) => (
                <div key={ev.type}>
                  <SectionTitle>
                    {ev.name} ({ev.type})
                  </SectionTitle>
                  <p className="text-muted-foreground mb-2 text-xs">{ev.description}</p>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <NumField
                      label="Probability"
                      value={ev.probability}
                      onChange={(v) =>
                        updateScenarioDeep((d) => {
                          d.globalEvents[idx].probability = v
                        })
                      }
                      step="0.01"
                      min={0}
                    />
                    {ev.quantityMultiplier !== undefined && (
                      <NumField
                        label="Qty Multiplier"
                        value={ev.quantityMultiplier}
                        onChange={(v) =>
                          updateScenarioDeep((d) => {
                            d.globalEvents[idx].quantityMultiplier = v
                          })
                        }
                        step="0.05"
                      />
                    )}
                    {ev.goldDelta !== undefined && (
                      <NumField
                        label="Gold Delta"
                        value={ev.goldDelta}
                        onChange={(v) =>
                          updateScenarioDeep((d) => {
                            d.globalEvents[idx].goldDelta = v
                          })
                        }
                        step="10"
                      />
                    )}
                    {ev.priceMultiplier !== undefined && (
                      <NumField
                        label="Price Multiplier"
                        value={ev.priceMultiplier}
                        onChange={(v) =>
                          updateScenarioDeep((d) => {
                            d.globalEvents[idx].priceMultiplier = v
                          })
                        }
                        step="0.05"
                      />
                    )}
                  </div>
                  {idx < scenario.globalEvents.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Raw JSON (read-only, for copy-paste) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Raw JSON (read-only)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted max-h-64 overflow-auto rounded-md p-4 text-xs">
                {JSON.stringify(scenario, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
