"use client"

import { useMutation, useQuery } from "convex/react"
import { ArrowDown, ArrowUp, Loader2, Minus, Plus, RotateCcw } from "lucide-react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import { StoryPlayer } from "@/components/organisms/story-player"
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { portfolioValue } from "@/lib/game/engine"
import type { PlayerAction } from "@/lib/types/actions"
import type { TradableAsset } from "@/lib/types/assets"
import { TRADABLE_ASSET_KEYS } from "@/lib/types/assets"
import { buyPrice, nominalPrice, sellPrice } from "@/lib/types/market"
import type { StorySlide } from "@/lib/types/onboarding"
import type { StateVector } from "@/lib/types/state_vector"

// ─── Constants ───────────────────────────────────────────────────

type AssetKey = TradableAsset | "taler"

const goodsMeta: Array<{
  key: AssetKey
  name: string
  icon: string
  colorClass: string
}> = [
  {
    key: "taler",
    name: "Taler",
    icon: "/asset-classes/taler.webp",
    colorClass: "bg-[oklch(0.84_0.18_93)]",
  },
  {
    key: "wood",
    name: "Wood",
    icon: "/asset-classes/wood.webp",
    colorClass: "bg-[oklch(0.42_0.07_43)]",
  },
  {
    key: "potatoes",
    name: "Potatoes",
    icon: "/asset-classes/potatoes.webp",
    colorClass: "bg-[oklch(0.56_0.21_33)]",
  },
  {
    key: "fish",
    name: "Fish",
    icon: "/asset-classes/fish.webp",
    colorClass: "bg-[oklch(0.78_0.08_236)]",
  },
]

const lineConfig = {
  taler: { color: "oklch(0.84 0.18 93)", label: "Taler" },
  wood: { color: "oklch(0.42 0.07 43)", label: "Wood" },
  potatoes: { color: "oklch(0.56 0.21 33)", label: "Potatoes" },
  fish: { color: "oklch(0.78 0.08 236)", label: "Fish" },
  totalValue: { color: "oklch(0.72 0.18 150)", label: "Total Value" },
}

const priceChartConfig = {
  talerBalance: { label: "Taler", color: lineConfig.taler.color },
  woodValue: { label: "Wood Value", color: lineConfig.wood.color },
  potatoesValue: { label: "Potatoes Value", color: lineConfig.potatoes.color },
  fishValue: { label: "Fish Value", color: lineConfig.fish.color },
  totalValue: { label: "Total Value", color: lineConfig.totalValue.color },
} satisfies ChartConfig

const ONBOARDING_KEY = "game_onboarding_seen"

const onboardingSlides: StorySlide[] = [
  {
    id: "farmer",
    shortName: "Farmer",
    title: "You are a farmer and work on a farm",
    body: "You rise with the sun, tending your fields and animals at the king's court. Life is simple, but every harvest reminds you: hard work alone won't build the future you dream of.",
    imageSrc: "/onboarding/story1.webp",
  },
  {
    id: "merchant",
    shortName: "Merchant",
    title: "You want to diversify and become a merchant",
    body: "You begin to wonder, what if your taler could work as hard as you do? As whispers of trade and distant markets reach your ears, you decide to become more than a farmer: a merchant in the making.",
    imageSrc: "/onboarding/story2.webp",
  },
  {
    id: "first-taler",
    shortName: "First Taler",
    title: "The village elder gives you your first bag of taler",
    body: "Seeing your ambition, the village elder entrusts you with a small bag of taler. Use it wisely, he says. Fortunes are not only grown in fields, but in choices.",
    imageSrc: "/onboarding/story3.webp",
  },
  {
    id: "yearly-income",
    shortName: "Yearly Income",
    title: "You receive income every year",
    body: "Each year, your farm provides steady income. It's your foundation, reliable but limited. How you use it will decide whether you stay a farmer, or rise beyond.",
    imageSrc: "/onboarding/story4.webp",
  },
  {
    id: "build-future",
    shortName: "Build Future",
    title: "Trade, grow, and build your future",
    body: "Buy, sell, and adapt as seasons change and fortunes rise and fall. Some choices will reward you, others will test you. Stay patient, think long-term, and one day you may own your dream farm worked not by your hands alone, but by those you employ.",
    imageSrc: "/onboarding/story5.webp",
  },
]

// ─── Helpers ─────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}

function formatTaler(n: number) {
  return `${new Intl.NumberFormat("de-CH").format(Math.round(n * 100) / 100)}`
}

function mapYToTrade(y: number, height: number, maxBuy: number, maxSell: number) {
  const center = height / 2
  const cappedY = clamp(y, 0, height)
  if (cappedY <= center) {
    const ratio = (center - cappedY) / center
    return Math.round(ratio * maxBuy)
  }
  const ratio = (cappedY - center) / center
  return -Math.round(ratio * maxSell)
}

function mapTradeToY(value: number, height: number, maxBuy: number, maxSell: number) {
  const center = height / 2
  if (value >= 0) {
    if (maxBuy === 0) return center
    return center - (value / maxBuy) * center
  }
  if (maxSell === 0) return center
  return center + (Math.abs(value) / maxSell) * center
}

// ─── Chart ───────────────────────────────────────────────────────

function MiniPriceGraph({ history }: { history: StateVector[] }) {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, history.length - 1))

  useEffect(() => {
    setSelectedIndex(Math.max(0, history.length - 1))
  }, [history.length])

  const chartData = useMemo(() => {
    return history.map((state) => {
      const inf = state.market.inflation
      return {
        step: state.date,
        talerBalance: roundMoney(state.portfolio.gold),
        woodValue: roundMoney(state.portfolio.wood * sellPrice(state.market.prices.wood, inf)),
        potatoesValue: roundMoney(
          state.portfolio.potatoes * sellPrice(state.market.prices.potatoes, inf),
        ),
        fishValue: roundMoney(state.portfolio.fish * sellPrice(state.market.prices.fish, inf)),
        totalValue: roundMoney(portfolioValue(state.portfolio, state.market)),
      }
    })
  }, [history])

  const safeSelectedIndex = clamp(selectedIndex, 0, Math.max(0, chartData.length - 1))
  const selectedPoint = chartData[safeSelectedIndex]

  const keys = ["talerBalance", "woodValue", "potatoesValue", "fishValue", "totalValue"] as const
  const seriesColors: Record<(typeof keys)[number], string> = {
    talerBalance: lineConfig.taler.color,
    woodValue: lineConfig.wood.color,
    potatoesValue: lineConfig.potatoes.color,
    fishValue: lineConfig.fish.color,
    totalValue: lineConfig.totalValue.color,
  }

  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <ChartContainer config={priceChartConfig} className="h-56 w-full">
        <AreaChart
          data={chartData}
          onClick={(state) => {
            const activeIndex = state?.activeTooltipIndex
            if (typeof activeIndex === "number") setSelectedIndex(activeIndex)
          }}
          margin={{ top: 12, right: 16, left: -6, bottom: 0 }}
        >
          <defs>
            {keys.map((key) => (
              <linearGradient key={`fill-${key}`} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={seriesColors[key]} stopOpacity={0.4} />
                <stop offset="95%" stopColor={seriesColors[key]} stopOpacity={0.03} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="step"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(value) => `Y${value}`}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={68}
            tickFormatter={(value) => Number(value).toLocaleString("de-CH")}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: "5 5" }}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(_, payload) => {
                  const step = payload?.[0]?.payload?.step
                  return `Year ${typeof step === "number" ? step : "-"}`
                }}
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-mono tabular-nums">
                      {Number(value).toLocaleString("de-CH")} taler
                    </span>
                  </div>
                )}
              />
            }
          />
          {selectedPoint ? (
            <ReferenceLine
              x={selectedPoint.step}
              xAxisId={0}
              stroke="currentColor"
              strokeOpacity={0.22}
              strokeDasharray="5 5"
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="talerBalance"
            name="Taler"
            stroke={lineConfig.taler.color}
            strokeWidth={2.5}
            fill="url(#fill-talerBalance)"
            activeDot={{ r: 6 }}
            dot={{ r: 2.5, strokeWidth: 1.2, fill: lineConfig.taler.color }}
          />
          <Area
            type="monotone"
            dataKey="woodValue"
            name="Wood Value"
            stroke={lineConfig.wood.color}
            strokeWidth={2.5}
            fill="url(#fill-woodValue)"
            activeDot={{ r: 6 }}
            dot={{ r: 2.5, strokeWidth: 1.2, fill: lineConfig.wood.color }}
          />
          <Area
            type="monotone"
            dataKey="potatoesValue"
            name="Potatoes Value"
            stroke={lineConfig.potatoes.color}
            strokeWidth={2.5}
            fill="url(#fill-potatoesValue)"
            activeDot={{ r: 6 }}
            dot={{ r: 2.5, strokeWidth: 1.2, fill: lineConfig.potatoes.color }}
          />
          <Area
            type="monotone"
            dataKey="fishValue"
            name="Fish Value"
            stroke={lineConfig.fish.color}
            strokeWidth={2.5}
            fill="url(#fill-fishValue)"
            activeDot={{ r: 6 }}
            dot={{ r: 2.5, strokeWidth: 1.2, fill: lineConfig.fish.color }}
          />
          <Area
            type="monotone"
            dataKey="totalValue"
            name="Total Value"
            stroke={lineConfig.totalValue.color}
            strokeWidth={3}
            fill="url(#fill-totalValue)"
            activeDot={{ r: 7 }}
            dot={{ r: 3, strokeWidth: 1.2, fill: lineConfig.totalValue.color }}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

function DrawerAssetHistoryGraph({
  history,
  asset,
}: {
  history: StateVector[]
  asset: TradableAsset
}) {
  const assetChartConfig = {
    [asset]: {
      label: lineConfig[asset].label,
      color: lineConfig[asset].color,
    },
  } satisfies ChartConfig

  const data = useMemo(
    () =>
      history.map((s) => ({
        step: s.date,
        [asset]: roundMoney(nominalPrice(s.market.prices[asset], s.market.inflation)),
      })),
    [history, asset],
  )

  return (
    <div className="rounded-lg border bg-muted/30 p-2">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Price History</p>
      <ChartContainer config={assetChartConfig} className="h-36 w-full">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={`drawer-fill-${asset}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineConfig[asset].color} stopOpacity={0.42} />
              <stop offset="95%" stopColor={lineConfig[asset].color} stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="step"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={18}
            tickFormatter={(value) => `Y${value}`}
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={42} />
          <ChartTooltip
            cursor={{ strokeDasharray: "4 4" }}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(_, payload) => {
                  const step = payload?.[0]?.payload?.step
                  return `Year ${typeof step === "number" ? step : "-"}`
                }}
                formatter={(value) => (
                  <span className="font-mono tabular-nums">
                    {Number(value).toLocaleString("de-CH")} taler
                  </span>
                )}
              />
            }
          />
          <Area
            type="monotone"
            dataKey={asset}
            name={lineConfig[asset].label}
            stroke={lineConfig[asset].color}
            strokeWidth={2.5}
            fill={`url(#drawer-fill-${asset})`}
            activeDot={{ r: 5 }}
            dot={{ r: 2.5, strokeWidth: 1, fill: lineConfig[asset].color }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

// ─── Main Game Page ──────────────────────────────────────────────

function GameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionIdParam = searchParams.get("sessionId") as Id<"sessions"> | null
  const gameIdParam = searchParams.get("gameId") as Id<"games"> | null

  // ─── Onboarding ─────────────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY)
    if (!seen) setShowOnboarding(true)
    setOnboardingChecked(true)
  }, [])

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true")
    setShowOnboarding(false)
  }, [])

  // ─── Convex data ────────────────────────────────────────────
  const startGameMutation = useMutation(api.game.startGame)
  const submitStepMutation = useMutation(api.game.submitStep)

  const [gameId, setGameId] = useState<Id<"games"> | null>(gameIdParam)
  const [isStarting, setIsStarting] = useState(false)

  const sessionData = useQuery(
    api.game.getSessionWithLeaderboard,
    sessionIdParam ? { sessionId: sessionIdParam } : "skip",
  )

  const convexGame = useQuery(api.game.getGame, gameId ? { gameId } : "skip")
  const convexScenario = useQuery(
    api.game.getScenario,
    convexGame?.scenarioId ? { scenarioId: convexGame.scenarioId } : "skip",
  )
  const convexHistory = useQuery(api.game.getGameTimeSeries, gameId ? { gameId } : "skip")

  const sessionId = sessionIdParam ?? convexGame?.sessionId ?? null

  // ─── Auto-start game when session is loaded & onboarding done ──
  useEffect(() => {
    if (gameId || isStarting || showOnboarding || !onboardingChecked) return
    if (!sessionIdParam || !sessionData) return

    const playerName = localStorage.getItem("debug_playerName") ?? "Player"

    // Check if user already has a game in this session (re-join)
    const existingActive = sessionData.leaderboard.find((e) => e.status === "active")
    if (existingActive) {
      setGameId(existingActive.gameId)
      return
    }

    setIsStarting(true)
    startGameMutation({
      scenarioId: sessionData.session.scenarioId,
      sessionId: sessionIdParam,
      playerName,
    })
      .then((id) => {
        setGameId(id)
        router.replace(`/dashboard/game?sessionId=${sessionIdParam}&gameId=${id}`)
      })
      .catch((e) => {
        console.error("Failed to start game:", e)
        alert((e as Error).message || "Failed to start game")
        router.push("/")
      })
      .finally(() => setIsStarting(false))
  }, [
    gameId,
    isStarting,
    showOnboarding,
    onboardingChecked,
    sessionIdParam,
    sessionData,
    startGameMutation,
    router,
  ])

  // ─── Build local state from Convex ──────────────────────────
  const history: StateVector[] = useMemo(() => {
    if (!convexHistory?.length) return []
    // biome-ignore lint/suspicious/noExplicitAny: Convex doc → StateVector shape match
    return convexHistory as any
  }, [convexHistory])

  const current = history.length > 0 ? history[history.length - 1] : null

  const scenario = useMemo(() => {
    if (!convexScenario) return null
    const { _id, _creationTime, ...rest } = convexScenario
    // biome-ignore lint/suspicious/noExplicitAny: shape match
    return { id: _id, ...rest } as any
  }, [convexScenario])

  const gameOver = useMemo(() => {
    if (!scenario || !current) return false
    return current.date >= scenario.endYear
  }, [current, scenario])

  // ─── Trade state ────────────────────────────────────────────
  const [tradePlan, setTradePlan] = useState<Record<TradableAsset, number>>({
    wood: 0,
    potatoes: 0,
    fish: 0,
  })
  const [selectedAsset, setSelectedAsset] = useState<TradableAsset | null>(null)
  const [draftTradeValue, setDraftTradeValue] = useState(0)
  const [isDraggingTradeBar, setIsDraggingTradeBar] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const tradeBarRef = useRef<HTMLDivElement | null>(null)

  // ─── Derived values ─────────────────────────────────────────
  const portfolio = current?.portfolio ?? { gold: 0, wood: 0, potatoes: 0, fish: 0 }
  const market = current?.market
  const inflation = market?.inflation ?? 1

  const getBuyPriceFor = useCallback(
    (asset: TradableAsset) => (market ? buyPrice(market.prices[asset], inflation) : 0),
    [market, inflation],
  )

  const getSellPriceFor = useCallback(
    (asset: TradableAsset) => (market ? sellPrice(market.prices[asset], inflation) : 0),
    [market, inflation],
  )

  const totalAssetValue = useMemo(() => {
    return {
      taler: portfolio.gold,
      wood: roundMoney(portfolio.wood * getSellPriceFor("wood")),
      potatoes: roundMoney(portfolio.potatoes * getSellPriceFor("potatoes")),
      fish: roundMoney(portfolio.fish * getSellPriceFor("fish")),
    }
  }, [portfolio, getSellPriceFor])

  const maxAssetValue = useMemo(
    () => Math.max(...Object.values(totalAssetValue), 1),
    [totalAssetValue],
  )

  const totalValue = current ? portfolioValue(current.portfolio, current.market) : 0

  const selectedBuyPrice = selectedAsset ? getBuyPriceFor(selectedAsset) : 0
  const selectedSellPriceVal = selectedAsset ? getSellPriceFor(selectedAsset) : 0

  const tradeCostExcludingSelected = useMemo(() => {
    if (!selectedAsset) return 0
    return (Object.keys(tradePlan) as TradableAsset[])
      .filter((asset) => asset !== selectedAsset)
      .reduce((sum, asset) => {
        if (tradePlan[asset] > 0) return sum + tradePlan[asset] * getBuyPriceFor(asset)
        if (tradePlan[asset] < 0) return sum - Math.abs(tradePlan[asset]) * getSellPriceFor(asset)
        return sum
      }, 0)
  }, [selectedAsset, tradePlan, getBuyPriceFor, getSellPriceFor])

  const maxBuy = useMemo(() => {
    if (!selectedAsset || selectedBuyPrice <= 0) return 0
    const freeCash = portfolio.gold - tradeCostExcludingSelected
    return Math.max(0, Math.floor(freeCash / selectedBuyPrice))
  }, [selectedAsset, selectedBuyPrice, portfolio.gold, tradeCostExcludingSelected])

  const maxSell = useMemo(() => {
    if (!selectedAsset) return 0
    return portfolio[selectedAsset]
  }, [portfolio, selectedAsset])

  const currentTradeClamp = useMemo(
    () => clamp(draftTradeValue, -maxSell, maxBuy),
    [draftTradeValue, maxBuy, maxSell],
  )

  const projectedHolding = useMemo(() => {
    if (!selectedAsset) return 0
    return portfolio[selectedAsset] + currentTradeClamp
  }, [portfolio, selectedAsset, currentTradeClamp])

  const selectedMeta = useMemo(
    () => (selectedAsset ? (goodsMeta.find((m) => m.key === selectedAsset) ?? null) : null),
    [selectedAsset],
  )

  const buyDelta = Math.max(0, currentTradeClamp)
  const sellDelta = Math.max(0, -currentTradeClamp)
  const projectedAssetValue = roundMoney(
    projectedHolding * (currentTradeClamp >= 0 ? selectedBuyPrice : selectedSellPriceVal),
  )

  const plannedTalerDelta = useMemo(() => {
    return -roundMoney(
      (Object.keys(tradePlan) as TradableAsset[]).reduce((sum, asset) => {
        const qty = tradePlan[asset]
        if (qty > 0) return sum + qty * getBuyPriceFor(asset)
        if (qty < 0) return sum + qty * getSellPriceFor(asset)
        return sum
      }, 0),
    )
  }, [tradePlan, getBuyPriceFor, getSellPriceFor])

  const projectedTalerBalance = roundMoney(portfolio.gold + plannedTalerDelta)

  const selectedAssetColor = selectedAsset
    ? lineConfig[selectedAsset].color
    : "oklch(0.62 0.14 228)"

  // Sync trade plan draft when selected asset changes
  useEffect(() => {
    if (!selectedAsset) return
    setTradePlan((prev) => {
      if (prev[selectedAsset] === currentTradeClamp) return prev
      return { ...prev, [selectedAsset]: currentTradeClamp }
    })
  }, [currentTradeClamp, selectedAsset])

  // ─── Handlers ───────────────────────────────────────────────
  function openTradeModal(asset: TradableAsset) {
    setSelectedAsset(asset)
    setDraftTradeValue(tradePlan[asset])
  }

  function closeTradeModal() {
    setSelectedAsset(null)
    setIsDraggingTradeBar(false)
  }

  function onPointerUpdate(clientY: number) {
    if (!tradeBarRef.current) return
    const rect = tradeBarRef.current.getBoundingClientRect()
    const y = clamp(clientY - rect.top, 0, rect.height)
    setDraftTradeValue(mapYToTrade(y, rect.height, maxBuy, maxSell))
  }

  const handleSubmitTrades = useCallback(async () => {
    if (!gameId || isSubmitting || gameOver) return

    const actions: PlayerAction[] = []
    for (const asset of TRADABLE_ASSET_KEYS) {
      const qty = tradePlan[asset]
      if (qty > 0) actions.push({ type: "buy", asset, quantity: qty })
      if (qty < 0) actions.push({ type: "sell", asset, quantity: Math.abs(qty) })
    }

    setIsSubmitting(true)
    try {
      await submitStepMutation({ gameId, actions })
      setTradePlan({ wood: 0, potatoes: 0, fish: 0 })

      // Navigate to leaderboard if in a session
      if (sessionId && current) {
        const nextStep = current.step + 1
        const name = localStorage.getItem("debug_playerName") ?? ""
        router.push(
          `/dashboard/sessions/${sessionId}/leaderboard?step=${nextStep}&gameId=${gameId}&sessionId=${sessionId}&name=${encodeURIComponent(name)}`,
        )
      }
    } catch (e) {
      console.error("Submit step failed:", e)
    } finally {
      setIsSubmitting(false)
    }
  }, [gameId, isSubmitting, gameOver, tradePlan, submitStepMutation, sessionId, current, router])

  const indicatorY = mapTradeToY(currentTradeClamp, 220, maxBuy, maxSell)

  // ─── Loading / onboarding states ────────────────────────────
  if (!onboardingChecked) return null

  if (showOnboarding) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <StoryPlayer
          slides={onboardingSlides}
          autoAdvanceMs={7000}
          previousAtStartLabel="Back"
          completeLabel="Start Playing"
          onPreviousAtStart={() => router.push("/")}
          onComplete={handleOnboardingComplete}
        />
      </main>
    )
  }

  if (!gameId || !current || !market) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center px-4 py-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {isStarting ? "Starting your game..." : "Loading game..."}
          </p>
        </div>
      </main>
    )
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="space-y-4">
        {/* Year & status header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Year {current.date}</h1>
            <Badge
              variant={current.market.regime === "bull" ? "default" : "destructive"}
              className="text-[10px]"
            >
              {current.market.regime === "bull" ? "🐂 Bull" : "🐻 Bear"}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {formatTaler(totalValue)} / {formatTaler(current.goal)} taler
            </p>
            {current.goalReached && (
              <Badge variant="default" className="bg-green-600 text-[10px]">
                🎯 Goal Reached
              </Badge>
            )}
            {gameOver && (
              <Badge variant="outline" className="ml-1 text-[10px]">
                Game Over
              </Badge>
            )}
          </div>
        </div>

        {/* Goal progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${totalValue >= current.goal ? "bg-green-500" : "bg-primary"}`}
            style={{ width: `${Math.min(100, (totalValue / current.goal) * 100)}%` }}
          />
        </div>

        {/* Asset cards */}
        <div className="grid grid-cols-4 gap-2">
          {goodsMeta.map((meta) => {
            const value = totalAssetValue[meta.key]
            const opacity = value / maxAssetValue
            const tradeDeltaRaw =
              meta.key === "taler" ? plannedTalerDelta : tradePlan[meta.key as TradableAsset]
            const hasTradeDelta = tradeDeltaRaw !== 0
            const isTradeDeltaPositive = tradeDeltaRaw > 0
            const tradeDeltaLabel =
              meta.key === "taler"
                ? `${isTradeDeltaPositive ? "+" : ""}${formatTaler(tradeDeltaRaw)}`
                : `${isTradeDeltaPositive ? "+" : ""}${tradeDeltaRaw}`
            const tradeDeltaColor = lineConfig[meta.key].color

            return (
              <button
                type="button"
                key={meta.key}
                onClick={() => {
                  if (meta.key !== "taler" && !gameOver) openTradeModal(meta.key as TradableAsset)
                }}
                className="flex h-full flex-col justify-end text-left"
                disabled={gameOver}
              >
                <div className="relative flex h-55 flex-col justify-end overflow-hidden rounded-lg border border-white/70">
                  <div
                    className={`absolute inset-0 ${meta.colorClass}`}
                    style={{ opacity: 0.15 }}
                  />
                  <div
                    className={`absolute bottom-0 w-full transition-all ${meta.colorClass}`}
                    style={{ height: `${Math.max(20, opacity * 100)}%` }}
                  />
                  {hasTradeDelta ? (
                    <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-xs font-semibold shadow-sm">
                      {isTradeDeltaPositive ? (
                        <ArrowUp className="size-3.5" style={{ color: tradeDeltaColor }} />
                      ) : (
                        <ArrowDown className="size-3.5" style={{ color: tradeDeltaColor }} />
                      )}
                      <span style={{ color: tradeDeltaColor }}>{tradeDeltaLabel}</span>
                    </div>
                  ) : null}
                  <div className="absolute inset-0 flex w-full items-end justify-center">
                    <div className="flex w-full flex-col items-center py-3 pb-3">
                      <Image
                        src={meta.icon}
                        alt={meta.name}
                        width={56}
                        height={56}
                        className="object-contain"
                      />
                      <p className="font-mono text-xl font-black leading-none text-white drop-shadow-sm">
                        {meta.key === "taler"
                          ? formatTaler(portfolio.gold)
                          : portfolio[meta.key as TradableAsset]}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-1">
                  <p className="text-center text-sm font-medium">
                    {formatTaler(value)}
                    <br /> Talers
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Chart */}
        {history.length > 1 && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle>Year {current.date}</CardTitle>
              <CardDescription>
                Asset values over time in talers (cash, each asset class, and total value).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MiniPriceGraph history={history} />
            </CardContent>
          </Card>
        )}

        {/* Submit button */}
        <Button
          type="button"
          className="h-12 w-full text-base"
          onClick={handleSubmitTrades}
          disabled={gameOver || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Processing...
            </>
          ) : gameOver ? (
            "Game Over"
          ) : (
            "Done trading & roll events"
          )}
        </Button>
      </div>

      {/* Trade drawer */}
      <Drawer open={selectedAsset !== null} onOpenChange={(open) => !open && closeTradeModal()}>
        <DrawerContent className="mx-auto w-full max-w-2xl rounded-t-2xl">
          <DrawerHeader>
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle>
                {selectedAsset
                  ? `Trade ${selectedAsset[0].toUpperCase()}${selectedAsset.slice(1)}`
                  : "Trade"}
              </DrawerTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setDraftTradeValue(0)}
                aria-label="Reset trade to no change"
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>
            <DrawerDescription>
              Interactive trade bar: middle is no change, up buys, down sells.
            </DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[70vh] overflow-y-auto px-4 pb-4" data-vaul-no-drag>
            {/* Price & balance info */}
            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">Buy Price</div>
                <div className="flex items-center gap-1.5 font-medium">
                  {selectedMeta ? (
                    <Image
                      src={selectedMeta.icon}
                      alt={selectedMeta.name}
                      width={16}
                      height={16}
                      className="object-contain"
                    />
                  ) : null}
                  <span>{formatTaler(selectedBuyPrice)} taler</span>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">Taler Balance</div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Image
                    src="/asset-classes/taler.webp"
                    alt="Taler"
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                  <span>{formatTaler(projectedTalerBalance)} taler</span>
                </div>
              </div>
            </div>

            {/* Drawer price history chart */}
            {selectedAsset && history.length > 1 ? (
              <div className="mb-4">
                <DrawerAssetHistoryGraph history={history} asset={selectedAsset} />
              </div>
            ) : null}

            {/* Trade slider */}
            <div className="mb-4 space-y-3">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border bg-emerald-500/10 px-3 py-2 text-sm transition-colors hover:bg-emerald-500/15"
                onClick={() => setDraftTradeValue((v) => clamp(v + 1, -maxSell, maxBuy))}
                aria-label="Increase acquired goods by one"
              >
                <div className="flex items-center gap-2 font-semibold text-emerald-700">
                  <Plus className="size-4" />
                  <span>Acquired</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">
                    {formatTaler(buyDelta * selectedBuyPrice)} taler
                  </span>
                  <span className="flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 font-medium">
                    {selectedMeta ? (
                      <Image
                        src={selectedMeta.icon}
                        alt={selectedMeta.name}
                        width={16}
                        height={16}
                        className="object-contain"
                      />
                    ) : null}
                    +{buyDelta}
                  </span>
                </div>
              </button>

              <div
                ref={tradeBarRef}
                className="relative h-55 rounded-xl border bg-background"
                data-vaul-no-drag
                onPointerDown={(event) => {
                  setIsDraggingTradeBar(true)
                  onPointerUpdate(event.clientY)
                }}
                onPointerMove={(event) => {
                  if (!isDraggingTradeBar) return
                  onPointerUpdate(event.clientY)
                }}
                onPointerUp={() => setIsDraggingTradeBar(false)}
                onPointerLeave={() => setIsDraggingTradeBar(false)}
              >
                <div className="absolute inset-0 overflow-hidden rounded-xl">
                  <div className="h-1/2 w-full bg-linear-to-b from-emerald-500/20 via-emerald-500/10 to-background/60" />
                  <div className="h-1/2 w-full bg-linear-to-t from-rose-500/20 via-rose-500/10 to-background/60" />
                </div>
                <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-muted-foreground/30" />
                <div className="absolute bottom-2 top-2 left-1/2 z-10 w-32 -translate-x-1/2 overflow-hidden rounded-full border border-white/60 bg-background/60 shadow-inner backdrop-blur-sm">
                  <div className="absolute inset-0 bg-linear-to-b from-white/35 via-white/20 to-black/10" />
                  {currentTradeClamp !== 0 ? (
                    <div
                      className="absolute inset-x-0"
                      style={{
                        top: currentTradeClamp > 0 ? `${indicatorY}px` : "50%",
                        bottom: currentTradeClamp > 0 ? "50%" : `${220 - indicatorY}px`,
                        backgroundColor: selectedAssetColor,
                        opacity: 0.4,
                      }}
                    />
                  ) : null}
                </div>
                <div
                  className="absolute left-1/2 z-20 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white/85 shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                  style={{ top: `${indicatorY}px` }}
                >
                  <div
                    className="absolute inset-1 rounded-full"
                    style={{ backgroundColor: selectedAssetColor, opacity: 0.9 }}
                  />
                </div>
                <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-background/85 px-2 py-1 text-xs font-medium shadow-sm">
                  Buy +{buyDelta}
                </div>
                <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-background/85 px-2 py-1 text-xs font-medium shadow-sm">
                  {formatTaler(projectedAssetValue)} taler
                </div>
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-background/85 px-2 py-1 text-xs font-medium shadow-sm">
                  Sell -{sellDelta}
                </div>
                <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-xs font-medium shadow-sm">
                  {selectedMeta ? (
                    <Image
                      src={selectedMeta.icon}
                      alt={selectedMeta.name}
                      width={14}
                      height={14}
                      className="object-contain"
                    />
                  ) : null}
                  {projectedHolding} units
                </div>
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border bg-rose-500/10 px-3 py-2 text-sm transition-colors hover:bg-rose-500/15"
                onClick={() => setDraftTradeValue((v) => clamp(v - 1, -maxSell, maxBuy))}
                aria-label="Increase sold goods by one"
              >
                <div className="flex items-center gap-2 font-semibold text-rose-700">
                  <Minus className="size-4" />
                  <span>Sold</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">
                    {formatTaler(sellDelta * selectedSellPriceVal)} taler
                  </span>
                  <span className="flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 font-medium">
                    {selectedMeta ? (
                      <Image
                        src={selectedMeta.icon}
                        alt={selectedMeta.name}
                        width={16}
                        height={16}
                        className="object-contain"
                      />
                    ) : null}
                    -{sellDelta}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </main>
  )
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <GameContent />
    </Suspense>
  )
}
