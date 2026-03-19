"use client"

import { useCallback, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { DEBUG_SCENARIO } from "@/lib/game/debug-scenario"
import {
  advanceYear,
  applyActions,
  gameStep,
  initializeGame,
  isGameOver,
  portfolioValue,
  resolveEvents,
  stepMarket,
} from "@/lib/game/engine"
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

export default function DebugPage() {
  const [scenario, setScenario] = useState<Scenario>(() => structuredClone(DEBUG_SCENARIO))
  const [history, setHistory] = useState<StateVector[]>(() => [initializeGame(scenario)])
  const [actionInputs, setActionInputs] = useState<
    Record<TradableAsset, { buyQty: string; sellQty: string }>
  >({
    wood: { buyQty: "", sellQty: "" },
    potatoes: { buyQty: "", sellQty: "" },
    fish: { buyQty: "", sellQty: "" },
  })

  // ─── Step-by-step phase state ───────────────────────────────
  const [phaseState, setPhaseState] = useState<PhaseState>({ phase: "trade" })

  const current = history[history.length - 1]
  const gameOver = isGameOver(scenario, current)

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
  const handleDoneTrading = useCallback(() => {
    if (gameOver) return
    const wp = phaseState.workingPortfolio ?? current.portfolio
    const actions = phaseState.executedActions ?? []

    // Roll events on the post-trade portfolio
    const {
      firedEvents,
      portfolio: portfolioAfterEvents,
      prices: pricesAfterEvents,
    } = resolveEvents(scenario, wp, current.market.prices)

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
  const handleNextYear = useCallback(() => {
    if (!phaseState.finalPortfolio || !phaseState.newMarket) return

    const newState: StateVector = {
      step: current.step + 1,
      date: advanceYear(current.date),
      portfolio: phaseState.finalPortfolio,
      market: phaseState.newMarket,
      events: phaseState.firedEvents ?? [],
      actions: phaseState.executedActions ?? [],
      goal: phaseState.newGoal ?? current.goal,
      goalReached: phaseState.goalReached ?? current.goalReached,
    }

    setHistory((prev) => [...prev, newState])
    setPhaseState({ phase: "trade" })
  }, [current, phaseState])

  // ─── Old full-step handlers (auto-run, skip) ────────────────

  const handleStep = useCallback(() => {
    if (gameOver) return
    const actions: PlayerAction[] = []
    for (const asset of TRADABLE_ASSET_KEYS) {
      const input = actionInputs[asset]
      const buyQty = Number.parseInt(input.buyQty, 10) || 0
      const sellQty = Number.parseInt(input.sellQty, 10) || 0
      if (buyQty > 0) actions.push({ type: "buy", asset, quantity: buyQty })
      if (sellQty > 0) actions.push({ type: "sell", asset, quantity: sellQty })
    }
    const newState = gameStep(scenario, current, actions)
    setHistory((prev) => [...prev, newState])
    setActionInputs({
      wood: { buyQty: "", sellQty: "" },
      potatoes: { buyQty: "", sellQty: "" },
      fish: { buyQty: "", sellQty: "" },
    })
  }, [actionInputs, current, gameOver, scenario])

  const handleSkip = useCallback(() => {
    if (gameOver) return
    const newState = gameStep(scenario, current, [])
    setHistory((prev) => [...prev, newState])
    setPhaseState({ phase: "trade" })
  }, [current, gameOver, scenario])

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
    (steps: number) => {
      let state = current
      const newHistory = [...history]
      for (let i = 0; i < steps; i++) {
        if (isGameOver(scenario, state)) break
        state = gameStep(scenario, state, [])
        newHistory.push(state)
      }
      setHistory(newHistory)
      setPhaseState({ phase: "trade" })
    },
    [current, history, scenario],
  )

  const fmt = (n: number) => n.toFixed(2)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Game Engine Debug</h1>
          <p className="text-muted-foreground text-sm">
            Step {current.step} · {current.date} · Regime:{" "}
            <Badge variant={current.market.regime === "bull" ? "default" : "destructive"}>
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
        <div className="flex gap-2">
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

      <Tabs defaultValue="step-by-step">
        <TabsList>
          <TabsTrigger value="step-by-step">Step-by-Step</TabsTrigger>
          <TabsTrigger value="state">Current State</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
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
                        variant={phaseState.newMarket.regime === "bull" ? "default" : "destructive"}
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
                        <Badge key={`${ev.type}-${i}`} variant="secondary" className="text-xs">
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
                          variant={s.market.regime === "bull" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {s.market.regime}
                        </Badge>
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
                  label="Bull → Bear probability"
                  value={scenario.market.bullToBearProbability}
                  onChange={(v) =>
                    updateScenarioDeep((d) => {
                      d.market.bullToBearProbability = v
                    })
                  }
                  step="0.01"
                />
                <NumField
                  label="Bear → Bull probability"
                  value={scenario.market.bearToBullProbability}
                  onChange={(v) =>
                    updateScenarioDeep((d) => {
                      d.market.bearToBullProbability = v
                    })
                  }
                  step="0.01"
                />
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <NumField
                  label="Bull μ (mean return)"
                  value={scenario.market.bullReturn}
                  onChange={(v) =>
                    updateScenarioDeep((d) => {
                      d.market.bullReturn = v
                    })
                  }
                  step="0.001"
                />
                <NumField
                  label="Bull σ (volatility)"
                  value={scenario.market.bullVolatility}
                  onChange={(v) =>
                    updateScenarioDeep((d) => {
                      d.market.bullVolatility = v
                    })
                  }
                  step="0.001"
                />
                <NumField
                  label="Bear μ (mean return)"
                  value={scenario.market.bearReturn}
                  onChange={(v) =>
                    updateScenarioDeep((d) => {
                      d.market.bearReturn = v
                    })
                  }
                  step="0.001"
                />
                <NumField
                  label="Bear σ (volatility)"
                  value={scenario.market.bearVolatility}
                  onChange={(v) =>
                    updateScenarioDeep((d) => {
                      d.market.bearVolatility = v
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
