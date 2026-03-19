"use client"

import { motion } from "framer-motion"
import { ArrowLeft, Info, Loader2, PenLine, TrendingUp } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// ─── Asset config ────────────────────────────────────────────────

type AssetProfile = {
  key: string
  name: string
  icon: string
  realWorldAnalogy: string
  riskTier: string
  mu: number
  sigma: number
  startPrice: number
  color: string
  description: string
}

const ASSETS: AssetProfile[] = [
  {
    key: "wood",
    name: "Wood",
    icon: "/asset-classes/wood.webp",
    realWorldAnalogy: "ETFs / Bond Funds",
    riskTier: "Low Risk",
    mu: 0.025,
    sigma: 0.08,
    startPrice: 10,
    color: "#6B4226",
    description:
      "Stable and predictable, like investing in index funds or bonds. Wood prices grow slowly but steadily with minimal surprises. The safe choice.",
  },
  {
    key: "potatoes",
    name: "Potatoes",
    icon: "/asset-classes/potatoes.webp",
    realWorldAnalogy: "Stocks / Equities",
    riskTier: "Medium Risk",
    mu: 0.07,
    sigma: 0.2,
    startPrice: 10,
    color: "#B8860B",
    description:
      "Moderate growth with noticeable ups and downs, similar to a diversified stock portfolio. A balanced choice between growth and stability.",
  },
  {
    key: "fish",
    name: "Fish",
    icon: "/asset-classes/fish.webp",
    realWorldAnalogy: "Crypto / Speculative Assets",
    riskTier: "High Risk",
    mu: 0.15,
    sigma: 0.4,
    startPrice: 10,
    color: "#1E90FF",
    description:
      "High potential returns but wild swings, like cryptocurrency. Fish prices can soar or crash dramatically. Fortunes are made — and lost.",
  },
]

// ─── Simulation ──────────────────────────────────────────────────

const NUM_PATHS = 30
const NUM_YEARS = 30
const NUM_MC_SIMS = 10_000

// ─── Illustration data (hand-crafted for maximum clarity) ────────
// These are NOT simulation results — they are deliberately designed
// to clearly show the characteristic behavior of each risk profile.

const ILLUSTRATION_DATA: Record<string, number[]> = {
  // Wood: gentle steady climb, tiny wiggles → ~80% over 30y
  wood: [
    0, 2, 4, 3, 5, 8, 10, 9, 12, 15, 17, 16, 19, 22, 25, 24, 27, 30, 34, 37, 40, 44, 47, 51, 55, 58,
    62, 66, 70, 75, 80,
  ],
  // Potatoes: clear uptrend with big corrections (30-40% drawdowns) → ~340% over 30y
  potatoes: [
    0, 15, -5, 30, 8, 55, 20, 75, 35, 60, 95, 50, 110, 70, 130, 80, 150, 100, 170, 120, 200, 145,
    225, 165, 250, 185, 280, 210, 310, 250, 340,
  ],
  // Fish: extreme swings, deep crashes, explosive rallies → ~850% but stomach-churning
  fish: [
    0, 100, -60, 170, -50, 260, -10, 350, 40, 140, 420, 70, 380, 110, 520, 140, 310, 620, 200, 590,
    170, 680, 270, 500, 740, 300, 660, 380, 760, 480, 850,
  ],  // Baseline: no investment at all → 0% forever
  baseline: Array.from({ length: 31 }, () => 0),
  // Inflation: purchasing power loss at ~2%/year → approx -45% over 30y
  inflation: [
    0, -2, -4, -6, -8, -10, -12, -13, -15, -17, -18, -20, -21, -23, -24, -26, -27, -28, -30, -31,
    -33, -34, -35, -37, -38, -39, -40, -41, -42, -44, -45,
  ],}

// Shared Y-axis domain across all illustration charts so return differences are visible
const ILLUSTRATION_Y_DOMAIN: [number, number] = (() => {
  const allValues = Object.values(ILLUSTRATION_DATA).flat()
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  // Add 10% padding
  const padding = (max - min) * 0.1
  return [Math.floor(min - padding), Math.ceil(max + padding)]
})()

/** Box-Muller: standard normal */
function randn(): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

type PathData = { year: number; median: number; [key: string]: number }[]

function generatePaths(mu: number, sigma: number, startPrice: number): PathData {
  const drift = mu - (sigma * sigma) / 2
  const paths: number[][] = []

  for (let p = 0; p < NUM_PATHS; p++) {
    const path = [startPrice]
    for (let t = 1; t <= NUM_YEARS; t++) {
      path.push(Math.max(0.01, path[t - 1] * Math.exp(drift + sigma * randn())))
    }
    paths.push(path)
  }

  // Analytical median (p50 of lognormal)
  const lnP0 = Math.log(startPrice)

  // Convert everything to % return from start
  const result: PathData = []
  for (let t = 0; t <= NUM_YEARS; t++) {
    const row: { year: number; median: number; [key: string]: number } = {
      year: t,
      median: (Math.exp(lnP0 + drift * t) / startPrice - 1) * 100,
    }
    for (let p = 0; p < NUM_PATHS; p++) {
      row[`p${p}`] = (paths[p][t] / startPrice - 1) * 100
    }
    result.push(row)
  }
  return result
}

/** Analytical percentiles for the summary stats */
/** Returns percentiles as % return from startPrice */
function getPercentiles(mu: number, sigma: number, startPrice: number, t: number) {
  const drift = mu - (sigma * sigma) / 2
  const lnP0 = Math.log(startPrice)
  const meanLn = lnP0 + drift * t
  const stdLn = sigma * Math.sqrt(t)

  const toPercent = (price: number) => (price / startPrice - 1) * 100

  return {
    p5: toPercent(Math.exp(meanLn + -1.6449 * stdLn)),
    p25: toPercent(Math.exp(meanLn + -0.6745 * stdLn)),
    p50: toPercent(Math.exp(meanLn)),
    p75: toPercent(Math.exp(meanLn + 0.6745 * stdLn)),
    p95: toPercent(Math.exp(meanLn + 1.6449 * stdLn)),
  }
}

// ─── Formatting ──────────────────────────────────────────────────

function formatPct(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 1000).toFixed(0)}k%`
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k%`
  if (Math.abs(v) >= 100) return `${Math.round(v)}%`
  if (Math.abs(v) >= 10) return `${v.toFixed(1)}%`
  return `${v.toFixed(1)}%`
}

/** Run NUM_MC_SIMS simulations and return the empirical median final return */
function computeEmpirical(
  mu: number,
  sigma: number,
  startPrice: number,
): { medianCumulative: number; medianYearly: number } {
  const drift = mu - (sigma * sigma) / 2
  const finals: number[] = []
  for (let s = 0; s < NUM_MC_SIMS; s++) {
    let price = startPrice
    for (let t = 0; t < NUM_YEARS; t++) {
      price = Math.max(0.01, price * Math.exp(drift + sigma * randn()))
    }
    finals.push(price)
  }
  finals.sort((a, b) => a - b)
  const medianPrice = finals[Math.floor(finals.length / 2)]
  const medianCumulative = (medianPrice / startPrice - 1) * 100
  const medianYearly = ((medianPrice / startPrice) ** (1 / NUM_YEARS) - 1) * 100
  return { medianCumulative, medianYearly }
}

// ─── Single asset chart ──────────────────────────────────────────

function AssetChart({ asset }: { asset: AssetProfile }) {
  const [data, setData] = useState<PathData | null>(null)

  useEffect(() => {
    setData(generatePaths(asset.mu, asset.sigma, asset.startPrice))
  }, [asset])

  const stats = useMemo(
    () => getPercentiles(asset.mu, asset.sigma, asset.startPrice, NUM_YEARS),
    [asset],
  )

  const empirical = useMemo(
    () => computeEmpirical(asset.mu, asset.sigma, asset.startPrice),
    [asset],
  )

  const chartConfig = {
    median: { label: "Median", color: asset.color },
    sample: { label: "Simulated paths", color: asset.color },
  } satisfies ChartConfig

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div
              className="flex size-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${asset.color}20` }}
            >
              <Image src={asset.icon} alt={asset.name} width={32} height={32} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{asset.name}</CardTitle>
                <Badge variant="outline" style={{ borderColor: asset.color, color: asset.color }}>
                  {asset.riskTier}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  ≈ {asset.realWorldAnalogy}
                </Badge>
              </div>
              <CardDescription className="mt-1">{asset.description}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Expected Return</p>
              <p className="font-mono text-lg font-bold" style={{ color: asset.color }}>
                {(asset.mu * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground">per year</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Volatility (σ)</p>
              <p className="font-mono text-lg font-bold" style={{ color: asset.color }}>
                {(asset.sigma * 100).toFixed(0)}%
              </p>
              <p className="text-[10px] text-muted-foreground">per year</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Median Yearly Return</p>
              <p className="font-mono text-lg font-bold" style={{ color: asset.color }}>
                {empirical.medianYearly.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground">
                from {NUM_MC_SIMS.toLocaleString()} sims
              </p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Median after {NUM_YEARS}y</p>
              <p className="font-mono text-lg font-bold" style={{ color: asset.color }}>
                {formatPct(empirical.medianCumulative)}
              </p>
              <p className="text-[10px] text-muted-foreground">cumulative return</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">P5 → P95 range</p>
              <p className="font-mono text-sm font-bold" style={{ color: asset.color }}>
                {formatPct(stats.p5)} – {formatPct(stats.p95)}
              </p>
              <p className="text-[10px] text-muted-foreground">after {NUM_YEARS} years</p>
            </div>
          </div>

          {/* Chart */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingUp className="size-3.5" />
              {NUM_PATHS} simulated price paths over {NUM_YEARS} years
            </p>
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
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
                  width={52}
                  tickFormatter={(v: number) => formatPct(v)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        if (name === "median")
                          return (
                            <span className="font-mono text-xs font-bold tabular-nums">
                              Median: {formatPct(Number(value))}
                            </span>
                          )
                        return null
                      }}
                    />
                  }
                />

                {/* Sample paths — faded */}
                {Array.from({ length: NUM_PATHS }, (_, i) => (
                  <Line
                    // biome-ignore lint/suspicious/noArrayIndexKey: static constant-size list
                    key={`p${i}`}
                    type="monotone"
                    dataKey={`p${i}`}
                    stroke={asset.color}
                    strokeWidth={1}
                    strokeOpacity={0.15}
                    dot={false}
                    activeDot={false}
                    legendType="none"
                  />
                ))}

                {/* Median line — bold */}
                <Line
                  type="monotone"
                  dataKey="median"
                  stroke={asset.color}
                  strokeWidth={3}
                  dot={false}
                  strokeDasharray="6 3"
                />
              </LineChart>
            </ChartContainer>
          </div>

          {/* Percentile summary */}
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { label: "P5 (worst 5%)", val: stats.p5 },
              { label: "P25", val: stats.p25 },
              { label: "Median (P50)", val: stats.p50, highlight: true },
              { label: "P75", val: stats.p75 },
              { label: "P95 (best 5%)", val: stats.p95 },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded border p-2"
                style={item.highlight ? { borderColor: asset.color } : undefined}
              >
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p
                  className="font-mono text-sm font-semibold"
                  style={item.highlight ? { color: asset.color, fontWeight: 700 } : undefined}
                >
                  {formatPct(item.val)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Illustration asset chart ────────────────────────────────────

function IllustrationAssetChart({ asset }: { asset: AssetProfile }) {
  const pathData = ILLUSTRATION_DATA[asset.key]
  const data = pathData.map((v, i) => ({
    year: i,
    value: v,
    baseline: ILLUSTRATION_DATA.baseline[i],
    inflation: ILLUSTRATION_DATA.inflation[i],
  }))

  const chartConfig = {
    value: { label: asset.name, color: asset.color },
    baseline: { label: "No investment", color: "#888888" },
    inflation: { label: "Cash (2% inflation)", color: "#ef4444" },
  } satisfies ChartConfig

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${asset.color}20` }}
          >
            <Image src={asset.icon} alt={asset.name} width={28} height={28} />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {asset.name}
              <Badge
                variant="outline"
                className="text-xs"
                style={{ borderColor: asset.color, color: asset.color }}
              >
                {asset.riskTier}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">≈ {asset.realWorldAnalogy}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <ReferenceLine
              y={0}
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={0.3}
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (v % 10 === 0 ? `Y${v}` : "")}
              interval={0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={52}
              domain={ILLUSTRATION_Y_DOMAIN}
              tickFormatter={(v: number) => formatPct(v)}
            />
            <Line
              type="natural"
              dataKey="inflation"
              stroke="#ef4444"
              strokeWidth={2.5}
              strokeDasharray="6 3"
              strokeOpacity={0.8}
              dot={false}
            />
            <Line
              type="natural"
              dataKey="baseline"
              stroke="#888888"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.4}
              dot={false}
            />
            <Line
              type="natural"
              dataKey="value"
              stroke={asset.color}
              strokeWidth={3.5}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ─── Illustration comparison chart ───────────────────────────────

function IllustrationComparisonChart() {
  const data = Array.from({ length: 31 }, (_, i) => ({
    year: i,
    wood: ILLUSTRATION_DATA.wood[i],
    potatoes: ILLUSTRATION_DATA.potatoes[i],
    fish: ILLUSTRATION_DATA.fish[i],
    baseline: ILLUSTRATION_DATA.baseline[i],
    inflation: ILLUSTRATION_DATA.inflation[i],
  }))

  const chartConfig = {
    wood: { label: "Wood", color: ASSETS[0].color },
    potatoes: { label: "Potatoes", color: ASSETS[1].color },
    fish: { label: "Fish", color: ASSETS[2].color },
    baseline: { label: "No investment", color: "#888888" },
    inflation: { label: "Cash (2% inflation)", color: "#ef4444" },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PenLine className="size-4 text-primary" />
          All Three Assets — Illustrated
        </CardTitle>
        <CardDescription className="text-xs">
          Same starting investment, three very different journeys. Notice how the spread increases
          with risk.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <ReferenceLine
              y={0}
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={0.3}
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (v % 10 === 0 ? `Y${v}` : "")}
              interval={0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={52}
              tickFormatter={(v: number) => formatPct(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <span className="font-mono text-xs tabular-nums">
                      {typeof name === "string"
                        ? name.charAt(0).toUpperCase() + name.slice(1)
                        : name}
                      : {formatPct(Number(value))}
                    </span>
                  )}
                />
              }
            />
            <Line
              type="natural"
              dataKey="inflation"
              stroke="#ef4444"
              strokeWidth={2.5}
              strokeDasharray="6 3"
              strokeOpacity={0.8}
              dot={false}
            />
            <Line
              type="natural"
              dataKey="baseline"
              stroke="#888888"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.4}
              dot={false}
            />
            <Line
              type="natural"
              dataKey="wood"
              stroke={ASSETS[0].color}
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="natural"
              dataKey="potatoes"
              stroke={ASSETS[1].color}
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="natural"
              dataKey="fish"
              stroke={ASSETS[2].color}
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ─── Comparison chart ────────────────────────────────────────────

function ComparisonChart() {
  const [data, setData] = useState<
    { year: number; wood: number; potatoes: number; fish: number }[]
  >([])

  useEffect(() => {
    // Generate one sample path per asset to show the volatility difference visually
    const genPath = (mu: number, sigma: number, sp: number) => {
      const drift = mu - (sigma * sigma) / 2
      const path = [sp]
      for (let t = 1; t <= NUM_YEARS; t++) {
        path.push(Math.max(0.01, path[t - 1] * Math.exp(drift + sigma * randn())))
      }
      return path
    }

    const woodPath = genPath(ASSETS[0].mu, ASSETS[0].sigma, ASSETS[0].startPrice)
    const potatoPath = genPath(ASSETS[1].mu, ASSETS[1].sigma, ASSETS[1].startPrice)
    const fishPath = genPath(ASSETS[2].mu, ASSETS[2].sigma, ASSETS[2].startPrice)

    const toPct = (path: number[], i: number) => (path[i] / path[0] - 1) * 100
    setData(
      woodPath.map((_, i) => ({
        year: i,
        wood: toPct(woodPath, i),
        potatoes: toPct(potatoPath, i),
        fish: toPct(fishPath, i),
      })),
    )
  }, [])

  const comparisonConfig = {
    wood: { label: "Wood (Low Risk)", color: ASSETS[0].color },
    potatoes: { label: "Potatoes (Med Risk)", color: ASSETS[1].color },
    fish: { label: "Fish (High Risk)", color: ASSETS[2].color },
  } satisfies ChartConfig

  if (data.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="size-5 text-primary" />
            Side-by-Side: One Sample Path per Asset
          </CardTitle>
          <CardDescription>
            All three assets starting at the same price — watch how differently they behave. Wood
            barely wiggles, Potatoes show moderate swings, Fish is a rollercoaster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={comparisonConfig} className="h-72 w-full">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
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
                width={52}
                tickFormatter={(v: number) => formatPct(v)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span className="font-mono text-xs tabular-nums">
                        {typeof name === "string"
                          ? name.charAt(0).toUpperCase() + name.slice(1)
                          : name}
                        : {formatPct(Number(value))}
                      </span>
                    )}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="wood"
                stroke={ASSETS[0].color}
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="potatoes"
                stroke={ASSETS[1].color}
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="fish"
                stroke={ASSETS[2].color}
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main page ───────────────────────────────────────────────────

export default function RiskTutorialPage() {
  const router = useRouter()

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Button variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Button>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Understanding Risk &amp; Return</h1>
            <p className="max-w-2xl text-muted-foreground">
              Every investment carries risk. In our medieval market, three goods represent three
              fundamentally different risk profiles — just like real-world asset classes. The charts
              below show {NUM_PATHS} simulated price trajectories for each good over {NUM_YEARS}{" "}
              years.
            </p>
          </div>

          <Card className="mt-4 border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-3 pt-5">
              <Info className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">How to read these charts</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>
                    <strong>Faint lines</strong> = {NUM_PATHS} random simulated price paths — each
                    one is a possible future
                  </li>
                  <li>
                    <strong>Dashed bold line</strong> = the theoretical median (50th percentile)
                  </li>
                  <li>
                    <strong>Wider spread</strong> = more volatility = more risk
                  </li>
                </ul>
                <p className="pt-1 text-muted-foreground">
                  <strong>Key insight:</strong> Higher expected returns always come with a wider fan
                  of outcomes. That's the fundamental risk–return tradeoff.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Illustration Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="mb-4 space-y-2">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <PenLine className="size-5 text-primary" />
              At a Glance — Illustrated
            </h2>
            <p className="text-sm text-muted-foreground">
              Simplified charts that show the characteristic behavior of each asset class at a
              glance. These are not real simulations — just a clear picture of what each risk
              profile looks and feels like.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {ASSETS.map((asset) => (
              <IllustrationAssetChart key={asset.key} asset={asset} />
            ))}
          </div>

          <div className="mt-4">
            <IllustrationComparisonChart />
          </div>
        </motion.div>

        {/* ── Detailed Simulation Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <div className="mb-4 space-y-2">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <TrendingUp className="size-5 text-primary" />
              Detailed Monte Carlo Simulations
            </h2>
            <p className="text-sm text-muted-foreground">
              Real simulation data — {NUM_PATHS} randomly generated price paths per asset, with
              statistical summaries from {NUM_MC_SIMS.toLocaleString()} runs.
            </p>
          </div>
        </motion.div>

        {/* Individual asset charts */}
        {ASSETS.map((asset, i) => (
          <motion.div
            key={asset.key}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 * (i + 1) }}
          >
            <AssetChart asset={asset} />
          </motion.div>
        ))}

        {/* Comparison chart */}
        <ComparisonChart />

        {/* Takeaways */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Key Takeaways</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  1
                </span>
                <p>
                  <strong className="text-foreground">Risk and return are inseparable.</strong> Fish
                  (crypto) has the highest expected return at 15%/year, but look at how wildly the
                  paths diverge — some go to 1,000×, others crash to near zero.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  2
                </span>
                <p>
                  <strong className="text-foreground">Volatility drag is real.</strong> With 50%
                  volatility, Fish's median after {NUM_YEARS} years is lower than you'd expect from
                  a simple "15% per year" — because large losses hurt more than equal-sized gains
                  help.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  3
                </span>
                <p>
                  <strong className="text-foreground">Diversification reduces risk.</strong>{" "}
                  Spreading your gold across all three goods gives you a smoother ride — capture
                  some of Fish's upside while Wood stabilizes your portfolio.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  4
                </span>
                <p>
                  <strong className="text-foreground">
                    Time is your ally — if you can handle the dips.
                  </strong>{" "}
                  Over longer horizons, even volatile assets tend to grow. But you need to survive
                  the bad years without panic-selling.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  )
}
