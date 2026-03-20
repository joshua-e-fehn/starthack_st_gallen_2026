"use client"

import confetti from "canvas-confetti"
import { useQuery } from "convex/react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Crown, Loader2, Target, TrendingUp, Trophy } from "lucide-react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { AssetDistributionBar } from "@/components/molecules/asset-distribution-bar"
import { PublicHeader } from "@/components/organisms/public-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { clearStoredGameSession } from "@/hooks/use-game-session"
import { portfolioValue } from "@/lib/game/engine"
import { type MonteCarloDataPoint, runMonteCarloSimulations } from "@/lib/game/monte-carlo"
import { getOrCreateGuestId } from "@/lib/guest"
import { nominalPrice, sellPrice } from "@/lib/types/market"
import type { Scenario } from "@/lib/types/scenario"
import type { StateVector } from "@/lib/types/state_vector"

// ─── Constants ───────────────────────────────────────────────────

const COLORS = {
  taler: "oklch(0.84 0.18 93)",
  wood: "oklch(0.42 0.07 43)",
  potatoes: "oklch(0.56 0.21 33)",
  fish: "oklch(0.78 0.08 236)",
  total: "oklch(0.72 0.18 150)",
  goal: "oklch(0.65 0.15 25)",
}

function formatTaler(n: number) {
  return new Intl.NumberFormat("de-CH").format(Math.round(n))
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}

// ─── Confetti Burst ──────────────────────────────────────────────

function fireConfetti() {
  const duration = 3000
  const end = Date.now() + duration

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#FFD700", "#FFA500", "#FF6347", "#00CED1", "#7B68EE"],
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#FFD700", "#FFA500", "#FF6347", "#00CED1", "#7B68EE"],
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

// ─── Animated Leaderboard Race ───────────────────────────────────

type PlayerHistory = {
  playerName: string
  gameId: string
  userId: string
  status: string
  steps: Array<{
    step: number
    date: number
    score: number
    goalReached: boolean
    assetBreakdown: { gold: number; wood: number; potatoes: number; fish: number; total: number }
  }>
}

function LeaderboardRace({
  players,
  myGameId,
  onComplete,
}: {
  players: PlayerHistory[]
  myGameId: string
  onComplete: () => void
}) {
  // Find the max step any player has
  const maxStep = useMemo(() => {
    let max = 0
    for (const p of players) {
      for (const s of p.steps) {
        if (s.step > max) max = s.step
      }
    }
    return max
  }, [players])

  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isAnimating) return

    if (currentStep > maxStep) {
      setIsAnimating(false)
      onComplete()
      return
    }

    timerRef.current = setTimeout(() => {
      setCurrentStep((s) => s + 1)
    }, 400)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentStep, maxStep, isAnimating, onComplete])

  // Build the leaderboard at the current animated step
  const rankings = useMemo(() => {
    return players
      .map((p) => {
        // Use the latest step this player has completed up to currentStep
        const stepsUpTo = p.steps.filter((s) => s.step <= currentStep)
        const latest = stepsUpTo.length > 0 ? stepsUpTo[stepsUpTo.length - 1] : null
        return {
          playerName: p.playerName,
          gameId: p.gameId,
          score: latest?.score ?? 0,
          date: latest?.date ?? 0,
          assetBreakdown: latest?.assetBreakdown ?? {
            gold: 0,
            wood: 0,
            potatoes: 0,
            fish: 0,
            total: 0,
          },
          goalReached: latest?.goalReached ?? false,
          hasData: stepsUpTo.length > 0,
        }
      })
      .filter((e) => e.hasData)
      .sort((a, b) => b.score - a.score)
  }, [players, currentStep])

  const currentDate = rankings[0]?.date ?? 0

  const getMedal = (rank: number) => {
    if (rank === 1) return "🥇"
    if (rank === 2) return "🥈"
    if (rank === 3) return "🥉"
    return `#${rank}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Leaderboard Race</h2>
        <div className="flex items-center gap-2">
          {isAnimating ? (
            <Badge variant="secondary" className="animate-pulse">
              Year {currentDate}
            </Badge>
          ) : (
            <Badge variant="default">Final</Badge>
          )}
          {isAnimating && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCurrentStep(maxStep + 1)
                setIsAnimating(false)
                onComplete()
              }}
            >
              Skip →
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{
            width: `${maxStep > 0 ? (Math.min(currentStep, maxStep) / maxStep) * 100 : 0}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {rankings.map((entry, index) => {
            const rank = index + 1
            const isMe = entry.gameId === myGameId
            const maxScore = rankings[0]?.score || 1
            const barWidth = Math.max(5, (entry.score / maxScore) * 100)

            return (
              <motion.div
                key={entry.gameId}
                layout
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`relative overflow-hidden rounded-lg border ${
                  isMe ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                } ${rank === 1 ? "border-yellow-500/40 bg-yellow-500/5" : "border-border/70 bg-background/80"}`}
              >
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/60 text-sm font-bold">
                    {getMedal(rank)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`truncate text-sm font-semibold ${isMe ? "text-primary" : ""}`}
                      >
                        {entry.playerName}
                      </span>
                      {isMe && (
                        <Badge variant="default" className="shrink-0 text-[10px]">
                          YOU
                        </Badge>
                      )}
                      {entry.goalReached && (
                        <Badge
                          variant="secondary"
                          className="shrink-0 bg-green-500/10 text-[10px] text-green-600"
                        >
                          🎯
                        </Badge>
                      )}
                    </div>
                    <AssetDistributionBar
                      breakdown={entry.assetBreakdown}
                      scalePercent={barWidth}
                      showDetails={rank <= 3}
                      className="mt-1"
                    />
                  </div>
                  <p className="font-mono text-sm font-bold tabular-nums">
                    {formatTaler(entry.score)}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Portfolio Donut ─────────────────────────────────────────────

const donutConfig = {
  Taler: { label: "Taler (Cash)", color: COLORS.taler },
  Wood: { label: "Wood", color: COLORS.wood },
  Potatoes: { label: "Potatoes", color: COLORS.potatoes },
  Fish: { label: "Fish", color: COLORS.fish },
} satisfies ChartConfig

function PortfolioDonut({ state }: { state: StateVector }) {
  const inf = state.market.inflation
  const data = useMemo(
    () => [
      {
        name: "Taler",
        value: roundMoney(state.portfolio.gold),
        fill: COLORS.taler,
      },
      {
        name: "Wood",
        value: roundMoney(state.portfolio.wood * sellPrice(state.market.prices.wood, inf)),
        fill: COLORS.wood,
      },
      {
        name: "Potatoes",
        value: roundMoney(state.portfolio.potatoes * sellPrice(state.market.prices.potatoes, inf)),
        fill: COLORS.potatoes,
      },
      {
        name: "Fish",
        value: roundMoney(state.portfolio.fish * sellPrice(state.market.prices.fish, inf)),
        fill: COLORS.fish,
      },
    ],
    [state, inf],
  )

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4 text-primary" />
          Portfolio Composition
        </CardTitle>
        <CardDescription>Final asset distribution at game end</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={donutConfig} className="mx-auto aspect-square h-56">
          <PieChart>
            <ChartTooltip
              trigger="click"
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _name, item) => {
                    const point = item.payload as { name: string; fill?: string }
                    const distribution = total > 0 ? Math.round((Number(value) / total) * 100) : 0

                    return (
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-xs"
                          style={{ backgroundColor: point.fill ?? item.color }}
                        />
                        <span className="font-mono tabular-nums">
                          {point.name}: {formatTaler(Number(value))} taler ({distribution}%)
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              strokeWidth={2}
              stroke="hsl(var(--background))"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ─── Net Worth vs Goal vs Asset Prices ───────────────────────────

const worthChartConfig = {
  netWorth: { label: "Net Worth", color: COLORS.total },
  woodPrice: { label: "Wood Price", color: COLORS.wood },
  potatoesPrice: { label: "Potatoes Price", color: COLORS.potatoes },
  fishPrice: { label: "Fish Price", color: COLORS.fish },
} satisfies ChartConfig

function NetWorthChart({ history }: { history: StateVector[] }) {
  const chartData = useMemo(() => {
    if (!history.length) return []
    const step0 = history[0]
    // Normalize: divide all values by their respective start values so they start at 1.0 (100%)
    const startNW = portfolioValue(step0.portfolio, step0.market) || 1
    const startWood = nominalPrice(step0.market.prices.wood, step0.market.inflation) || 1
    const startPotatoes = nominalPrice(step0.market.prices.potatoes, step0.market.inflation) || 1
    const startFish = nominalPrice(step0.market.prices.fish, step0.market.inflation) || 1

    return history.map((s) => ({
      date: s.date,
      netWorth: roundMoney((portfolioValue(s.portfolio, s.market) / startNW) * 100),
      woodPrice: roundMoney(
        (nominalPrice(s.market.prices.wood, s.market.inflation) / startWood) * 100,
      ),
      potatoesPrice: roundMoney(
        (nominalPrice(s.market.prices.potatoes, s.market.inflation) / startPotatoes) * 100,
      ),
      fishPrice: roundMoney(
        (nominalPrice(s.market.prices.fish, s.market.inflation) / startFish) * 100,
      ),
    }))
  }, [history])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-primary" />
          Performance vs Market
        </CardTitle>
        <CardDescription>
          Indexed growth (100 = start). Net worth and asset prices over time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={worthChartConfig} className="h-64 w-full">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: -6, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => `Y${v}`}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={52}
              tickFormatter={(v) => `${v}%`}
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "5 5" }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const date = payload?.[0]?.payload?.date
                    return `Year ${typeof date === "number" ? date : "-"}`
                  }}
                  formatter={(value, name) => (
                    <span className="font-mono tabular-nums">
                      {name}: {Number(value).toFixed(1)}%
                    </span>
                  )}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="netWorth"
              name="Net Worth"
              stroke={COLORS.total}
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="woodPrice"
              name="Wood Price"
              stroke={COLORS.wood}
              strokeWidth={1.5}
              dot={false}
              strokeOpacity={0.6}
            />
            <Line
              type="monotone"
              dataKey="potatoesPrice"
              name="Potatoes Price"
              stroke={COLORS.potatoes}
              strokeWidth={1.5}
              dot={false}
              strokeOpacity={0.6}
            />
            <Line
              type="monotone"
              dataKey="fishPrice"
              name="Fish Price"
              stroke={COLORS.fish}
              strokeWidth={1.5}
              dot={false}
              strokeOpacity={0.6}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ─── Absolute Net Worth Chart ────────────────────────────────────

const absoluteChartConfig = {
  netWorth: { label: "Net Worth", color: COLORS.total },
  goal: { label: "Goal", color: COLORS.goal },
} satisfies ChartConfig

function AbsoluteNetWorthChart({ history }: { history: StateVector[] }) {
  const chartData = useMemo(() => {
    return history.map((s) => ({
      date: s.date,
      netWorth: roundMoney(portfolioValue(s.portfolio, s.market)),
      goal: roundMoney(s.goal),
    }))
  }, [history])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="size-4 text-primary" />
          Net Worth Journey
        </CardTitle>
        <CardDescription>Your absolute net worth vs. the inflation-adjusted goal</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={absoluteChartConfig} className="h-56 w-full">
          <AreaChart data={chartData} margin={{ top: 8, right: 16, left: -6, bottom: 0 }}>
            <defs>
              <linearGradient id="fill-networth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.total} stopOpacity={0.35} />
                <stop offset="95%" stopColor={COLORS.total} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => `Y${v}`}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={68}
              tickFormatter={(v) => Number(v).toLocaleString("de-CH")}
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "5 5" }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_, payload) => {
                    const date = payload?.[0]?.payload?.date
                    return `Year ${typeof date === "number" ? date : "-"}`
                  }}
                  formatter={(value, name) => (
                    <span className="font-mono tabular-nums">
                      {name}: {formatTaler(Number(value))} taler
                    </span>
                  )}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              name="Net Worth"
              stroke={COLORS.total}
              strokeWidth={2.5}
              fill="url(#fill-networth)"
            />
            <Area
              type="monotone"
              dataKey="goal"
              name="Goal"
              stroke={COLORS.goal}
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="none"
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ─── Monte Carlo Chart ───────────────────────────────────────────

const mcChartConfig = {
  p10_p90: { label: "P10–P90 range", color: "oklch(0.65 0.15 250)" },
  p25_p75: { label: "P25–P75 range", color: "oklch(0.7 0.18 200)" },
  p50: { label: "Median (P50)", color: "oklch(0.55 0.2 260)" },
  actual: { label: "Your Path", color: COLORS.total },
  goal: { label: "Goal", color: COLORS.goal },
} satisfies ChartConfig

const MC_NUM_SIMS = 10_000

function MonteCarloChart({
  history,
  scenario,
}: {
  history: StateVector[]
  scenario: Scenario | null
}) {
  const [mcData, setMcData] = useState<MonteCarloDataPoint[]>([])

  useEffect(() => {
    if (!scenario || history.length < 2) return
    runMonteCarloSimulations(history, scenario, MC_NUM_SIMS).then(setMcData)
  }, [history, scenario])

  if (mcData.length < 2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" />
            Monte Carlo Simulation
          </CardTitle>
          <CardDescription>Not enough data for the simulation.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Transform for stacked area bands (recharts needs deltas, not absolute values)
  const bandData = mcData.map((d) => ({
    year: d.year,
    base: d.p10,
    band_10_25: d.p25 - d.p10,
    band_25_75: d.p75 - d.p25,
    band_75_90: d.p90 - d.p75,
    p50: d.p50,
    actual: d.actual,
    goal: d.goal,
  }))

  const last = mcData[mcData.length - 1]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-primary" />
          Monte Carlo Simulation ({MC_NUM_SIMS.toLocaleString()} runs)
        </CardTitle>
        <CardDescription>
          What could have happened with your same strategy but different market outcomes. Shaded
          bands show P10–P90 and P25–P75 ranges.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={mcChartConfig} className="h-72 w-full">
          <ComposedChart data={bandData} margin={{ top: 5, right: 16, bottom: 5, left: -6 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `Y${v}`}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={68}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    if (
                      name === "base" ||
                      name === "band_10_25" ||
                      name === "band_25_75" ||
                      name === "band_75_90"
                    )
                      return null
                    return (
                      <span className="font-mono tabular-nums">
                        {typeof value === "number" ? formatTaler(value) : value} taler
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

            {/* Invisible base to position the bands */}
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
              fillOpacity={0.35}
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
              fillOpacity={0.5}
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
              fillOpacity={0.35}
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
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
              opacity={0.8}
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
        <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
          <div>
            <p className="text-xs text-muted-foreground">P10 (worst 10%)</p>
            <p className="font-mono text-sm font-semibold">{formatTaler(last.p10)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">P25</p>
            <p className="font-mono text-sm font-semibold">{formatTaler(last.p25)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Median (P50)</p>
            <p className="font-mono text-sm font-semibold">{formatTaler(last.p50)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">P75</p>
            <p className="font-mono text-sm font-semibold">{formatTaler(last.p75)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">P90 (best 10%)</p>
            <p className="font-mono text-sm font-semibold">{formatTaler(last.p90)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Results Page ───────────────────────────────────────────

function ResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gameId = searchParams.get("gameId") as Id<"games"> | null
  const sessionId = searchParams.get("sessionId") as Id<"sessions"> | null

  const guestId = getOrCreateGuestId()
  const convexGame = useQuery(api.game.getGame, gameId ? { gameId, guestId } : "skip")
  const convexHistory = useQuery(api.game.getGameTimeSeries, gameId ? { gameId, guestId } : "skip")
  const convexScenario = useQuery(
    api.game.getScenario,
    convexGame?.scenarioId ? { scenarioId: convexGame.scenarioId } : "skip",
  )
  const leaderboardHistory = useQuery(
    api.game.getSessionLeaderboardHistory,
    sessionId ? { sessionId } : "skip",
  )

  const history: StateVector[] = useMemo(() => {
    if (!convexHistory?.length) return []
    // biome-ignore lint/suspicious/noExplicitAny: Convex doc → StateVector shape match
    return convexHistory as any
  }, [convexHistory])

  const scenario: Scenario | null = useMemo(() => {
    if (!convexScenario) return null
    const { _id, _creationTime, ...rest } = convexScenario
    return { id: _id, ...rest } as unknown as Scenario
  }, [convexScenario])

  const current = history.length > 0 ? history[history.length - 1] : null

  const totalValue = current ? portfolioValue(current.portfolio, current.market) : 0
  const goalReached = current?.goalReached ?? false

  // Fire confetti on mount if goal was reached
  const confettiFired = useRef(false)
  useEffect(() => {
    if (goalReached && !confettiFired.current) {
      confettiFired.current = true
      setTimeout(fireConfetti, 400)
    }
  }, [goalReached])

  // Leaderboard race animation state
  const [_raceComplete, setRaceComplete] = useState(false)
  const handleRaceComplete = useCallback(() => setRaceComplete(true), [])

  if (!gameId || !current) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center px-4 py-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading results...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => router.push("/")}>
            <ArrowLeft className="mr-1 size-4" />
            Home
          </Button>

          <Card
            className={`border-2 ${goalReached ? "border-green-500/40 bg-green-500/5" : "border-primary/20"}`}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                  className="text-6xl"
                >
                  {goalReached ? (
                    <Image
                      src="/win.gif"
                      alt="Victory"
                      width={120}
                      height={120}
                      unoptimized
                      className="h-30 w-30 rounded-2xl border-4 border-green-500/40 object-cover"
                      style={{
                        boxShadow:
                          "4px 4px 0px rgba(0,0,0,0.4), 8px 8px 0px rgba(0,0,0,0.25), 12px 12px 0px rgba(0,0,0,0.1)",
                      }}
                    />
                  ) : (
                    <Image src="/lost.gif" alt="Game over" width={120} height={120} unoptimized />
                  )}
                </motion.div>
                <div>
                  <h1 className="text-2xl font-bold">
                    {goalReached ? "Farm Purchased!" : "Game Over"}
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    {goalReached
                      ? "You earned enough to buy your dream farm!"
                      : "You didn't reach the goal this time. Try again!"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{formatTaler(totalValue)}</p>
                    <p className="text-xs text-muted-foreground">Final Net Worth</p>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div className="text-center">
                    <p className="text-3xl font-bold">{formatTaler(current.goal)}</p>
                    <p className="text-xs text-muted-foreground">Goal</p>
                  </div>
                </div>
                {goalReached && (
                  <Badge className="bg-green-600 text-sm text-white">
                    <Trophy className="mr-1 size-3.5" />
                    Goal Reached!
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Leaderboard Race — only if in a session with multiple players */}
        {leaderboardHistory && leaderboardHistory.players.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardContent className="pt-6">
                <LeaderboardRace
                  players={leaderboardHistory.players}
                  myGameId={gameId}
                  onComplete={handleRaceComplete}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Charts — always visible (even during leaderboard animation) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Portfolio Donut */}
          <PortfolioDonut state={current} />

          {/* Absolute net worth vs goal */}
          <AbsoluteNetWorthChart history={history} />

          {/* Indexed performance vs market */}
          <NetWorthChart history={history} />

          {/* Monte Carlo */}
          <MonteCarloChart history={history} scenario={scenario} />
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3 pb-8"
        >
          {sessionId && (
            <Button
              className="h-12 w-full text-base"
              onClick={() => {
                router.push(`/game/lobby/${sessionId}`)
              }}
            >
              Back to Session Lobby
            </Button>
          )}
          <Button
            variant="outline"
            className="h-12 w-full text-base"
            onClick={() => {
              clearStoredGameSession()
              router.push("/")
            }}
          >
            Back to Home
          </Button>
        </motion.div>
      </div>
    </main>
  )
}

export default function GameResultsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        }
      >
        <ResultsContent />
      </Suspense>
    </div>
  )
}
