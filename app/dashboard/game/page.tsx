"use client"

import { useMutation, useQuery } from "convex/react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import { GameChatbot } from "@/components/molecules/game-chatbot"
import { StoryPlayer } from "@/components/organisms/story-player"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { portfolioValue } from "@/lib/game/engine"
import { getOrCreateGuestId } from "@/lib/guest"
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

function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}

function formatTaler(n: number) {
  return `${new Intl.NumberFormat("de-CH").format(Math.round(n * 100) / 100)}`
}

// ─── Chart ───────────────────────────────────────────────────────

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
          {data.length > 0 && (
            <ReferenceLine
              x={data[data.length - 1].step}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeDasharray="3 3"
            />
          )}
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
  const guestId = getOrCreateGuestId()
  const startGameMutation = useMutation(api.game.startGame)
  const submitStepMutation = useMutation(api.game.submitStep)

  const [gameId, setGameId] = useState<Id<"games"> | null>(gameIdParam)
  const [isStarting, setIsStarting] = useState(false)

  const sessionData = useQuery(
    api.game.getSessionWithLeaderboard,
    sessionIdParam ? { sessionId: sessionIdParam } : "skip",
  )

  const convexGame = useQuery(api.game.getGame, gameId ? { gameId, guestId } : "skip")
  const convexScenario = useQuery(
    api.game.getScenario,
    convexGame?.scenarioId ? { scenarioId: convexGame.scenarioId } : "skip",
  )
  const convexHistory = useQuery(api.game.getGameTimeSeries, gameId ? { gameId, guestId } : "skip")

  const myGameInSession = useQuery(
    api.game.getMyGameInSession,
    sessionIdParam ? { sessionId: sessionIdParam, guestId } : "skip",
  )

  const sessionId = sessionIdParam ?? convexGame?.sessionId ?? null

  // ─── Auto-start game ────────────────────────────────────────
  useEffect(() => {
    if (gameId || isStarting || showOnboarding || !onboardingChecked) return
    if (!sessionIdParam || !sessionData) return

    const playerName = localStorage.getItem("debug_playerName") ?? "Player"

    if (myGameInSession) {
      setGameId(myGameInSession._id)
      return
    }

    setIsStarting(true)
    startGameMutation({
      scenarioId: sessionData.session.scenarioId,
      sessionId: sessionIdParam,
      playerName,
      guestId,
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
    myGameInSession,
    startGameMutation,
    guestId,
    router,
  ])

  // ─── Build local state from Convex ──────────────────────────
  const history: StateVector[] = useMemo(() => {
    if (!convexHistory?.length) return []
    // biome-ignore lint/suspicious/noExplicitAny: shape match
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedAsset, setExpandedAsset] = useState<TradableAsset | null>(null)

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

  const projectedPortfolio = useMemo(() => {
    return {
      gold: portfolio.gold + plannedTalerDelta,
      wood: portfolio.wood + tradePlan.wood,
      potatoes: portfolio.potatoes + tradePlan.potatoes,
      fish: portfolio.fish + tradePlan.fish,
    }
  }, [portfolio, plannedTalerDelta, tradePlan])

  const totalAssetValue = useMemo(() => {
    return {
      taler: projectedPortfolio.gold,
      wood: roundMoney(projectedPortfolio.wood * getSellPriceFor("wood")),
      potatoes: roundMoney(projectedPortfolio.potatoes * getSellPriceFor("potatoes")),
      fish: roundMoney(projectedPortfolio.fish * getSellPriceFor("fish")),
    }
  }, [projectedPortfolio, getSellPriceFor])

  const totalValue = current ? portfolioValue(projectedPortfolio, current.market) : 0

  const handleSubmitTrades = useCallback(async () => {
    if (!gameId || isSubmitting || gameOver) return

    const actions: PlayerAction[] = []
    for (const asset of TRADABLE_ASSET_KEYS) {
      const qty = tradePlan[asset]
      if (qty > 0) actions.push({ type: "buy", asset, quantity: qty })
      if (qty < 0) actions.push({ type: "sell", asset, quantity: Math.abs(qty) })
    }

    setIsSubmitting(true)

    if (sessionId && current) {
      const nextStep = current.step + 1
      const name = localStorage.getItem("debug_playerName") ?? ""
      router.push(
        `/dashboard/sessions/${sessionId}/leaderboard?step=${nextStep}&gameId=${gameId}&sessionId=${sessionId}&name=${encodeURIComponent(name)}`,
      )
    }

    try {
      await submitStepMutation({ gameId, actions, guestId })
      setTradePlan({ wood: 0, potatoes: 0, fish: 0 })
    } catch (e) {
      console.error("Submit step failed:", e)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    gameId,
    isSubmitting,
    gameOver,
    tradePlan,
    submitStepMutation,
    sessionId,
    current,
    router,
    guestId,
  ])

  // Track goal-reached transitions for animations
  const prevGoalReached = useRef<boolean | null>(null)
  const [goalAnimation, setGoalAnimation] = useState<"reached" | "lost" | null>(null)
  useEffect(() => {
    if (!current) return
    const wasReached = prevGoalReached.current
    const isReached = current.goalReached
    if (wasReached === false && isReached) {
      setGoalAnimation("reached")
      const t = setTimeout(() => setGoalAnimation(null), 2000)
      return () => clearTimeout(t)
    }
    if (wasReached === true && !isReached) {
      setGoalAnimation("lost")
      const t = setTimeout(() => setGoalAnimation(null), 2000)
      return () => clearTimeout(t)
    }
    prevGoalReached.current = isReached
  }, [current, current?.goalReached])
  useEffect(() => {
    if (current) prevGoalReached.current = current.goalReached
  })

  // ─── Render ─────────────────────────────────────────────────
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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="space-y-6">
        {/* Year & status header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black tracking-tight">Year {current.date}</h1>
            <Badge
              variant={current.market.regime === "bull" ? "default" : "destructive"}
              className="px-3 py-1 text-sm font-bold uppercase"
            >
              {current.market.regime === "bull" ? "🐂 Bull Market" : "🐻 Bear Market"}
            </Badge>
          </div>

          {/* Compact Asset Summary (Bigger) */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-primary/10 bg-muted/30 p-3 sm:gap-6">
            {goodsMeta.map((meta) => (
              <div key={meta.key} className="flex items-center gap-2">
                <Image
                  src={meta.icon}
                  alt={meta.name}
                  width={24}
                  height={24}
                  className="object-contain"
                />
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">
                    {meta.name}
                  </span>
                  <span className="font-mono text-lg font-black">
                    {meta.key === "taler"
                      ? Math.round(projectedPortfolio.gold)
                      : projectedPortfolio[meta.key as TradableAsset]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wealth Progress Section */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Total Net Worth
              </span>
              <span className="text-2xl font-black">{formatTaler(totalValue)} taler</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Goal</span>
              <span className="text-xl font-bold text-primary">{formatTaler(current.goal)}</span>
            </div>
          </div>

          <div className="relative group">
            <div className="h-12 w-full overflow-hidden rounded-xl border border-primary/20 bg-muted/30 shadow-inner backdrop-blur-sm">
              <div className="flex h-full w-full">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(totalAssetValue.taler / current.goal) * 100}%` }}
                  className="h-full transition-all duration-500 ease-out"
                  style={{ backgroundColor: lineConfig.taler.color }}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(totalAssetValue.wood / current.goal) * 100}%` }}
                  className="h-full transition-all duration-500 ease-out border-l border-white/10"
                  style={{ backgroundColor: lineConfig.wood.color }}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(totalAssetValue.potatoes / current.goal) * 100}%` }}
                  className="h-full transition-all duration-500 ease-out border-l border-white/10"
                  style={{ backgroundColor: lineConfig.potatoes.color }}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(totalAssetValue.fish / current.goal) * 100}%` }}
                  className="h-full transition-all duration-500 ease-out border-l border-white/10"
                  style={{ backgroundColor: lineConfig.fish.color }}
                />
              </div>

              {totalValue >= current.goal && (
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute inset-0 z-10 w-1/2 bg-linear-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                />
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-sm font-black uppercase tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {((totalValue / current.goal) * 100).toFixed(0)}% to Freedom
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <AnimatePresence mode="wait">
              {current.goalReached || goalAnimation === "reached" ? (
                <motion.div
                  key="goal-reached"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                >
                  <Badge variant="default" className="bg-green-600 text-[10px] uppercase font-bold">
                    🎯 Goal Reached
                  </Badge>
                </motion.div>
              ) : goalAnimation === "lost" ? (
                <motion.div
                  key="goal-lost"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                >
                  <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                    📉 Goal Lost
                  </Badge>
                </motion.div>
              ) : null}
            </AnimatePresence>
            {gameOver && (
              <Badge variant="outline" className="text-[10px] uppercase font-bold">
                ⌛ End of Times
              </Badge>
            )}
          </div>
        </div>

        {/* Asset List (Vertical Stack) */}
        <div className="flex flex-col gap-3">
          {goodsMeta
            .filter((m) => m.key !== "taler")
            .map((meta) => {
              const assetKey = meta.key as TradableAsset
              const currentPrice = current.market.prices[assetKey]
              const inf = current.market.inflation
              const bPrice = buyPrice(currentPrice, inf)
              const sPrice = sellPrice(currentPrice, inf)

              const prevMarket = history.length > 1 ? history[history.length - 2].market : null
              const prevPrice = prevMarket ? prevMarket.prices[assetKey] : null
              const isUp = prevPrice ? currentPrice.basePrice >= prevPrice.basePrice : true
              const trendColor = isUp ? "text-green-500" : "text-rose-500"

              const isExpanded = expandedAsset === assetKey
              const tradeQty = tradePlan[assetKey]

              const maxBuyLocal = Math.max(0, Math.floor(projectedTalerBalance / bPrice))
              const maxSellLocal = portfolio[assetKey] + tradeQty

              return (
                <div
                  key={meta.key}
                  className="overflow-hidden rounded-xl border bg-card shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className={`rounded-lg p-2 ${meta.colorClass}`}>
                        <Image
                          src={meta.icon}
                          alt={meta.name}
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-black">{meta.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold">
                            {formatTaler(sPrice)} taler
                          </span>
                          {isUp ? (
                            <TrendingUp className={`size-4 ${trendColor}`} />
                          ) : (
                            <TrendingDown className={`size-4 ${trendColor}`} />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="hidden flex-col items-end sm:flex">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                          Holdings
                        </span>
                        <span className="text-lg font-black">
                          {projectedPortfolio[assetKey]} units
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-8 rounded-full"
                          disabled={gameOver || maxSellLocal <= 0}
                          onClick={() =>
                            setTradePlan((p) => ({ ...p, [assetKey]: p[assetKey] - 1 }))
                          }
                        >
                          <Minus className="size-4" />
                        </Button>
                        <div className="flex min-w-[3rem] flex-col items-center">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">
                            Draft
                          </span>
                          <span
                            className={`font-mono font-black ${tradeQty > 0 ? "text-green-500" : tradeQty < 0 ? "text-rose-500" : ""}`}
                          >
                            {tradeQty > 0 ? "+" : ""}
                            {tradeQty}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-8 rounded-full"
                          disabled={gameOver || maxBuyLocal <= 0}
                          onClick={() =>
                            setTradePlan((p) => ({ ...p, [assetKey]: p[assetKey] + 1 }))
                          }
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => setExpandedAsset(isExpanded ? null : assetKey)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="size-5" />
                        ) : (
                          <ChevronDown className="size-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="border-t bg-muted/20 p-4 pt-2">
                          <DrawerAssetHistoryGraph history={history} asset={assetKey} />
                          <div className="mt-4 flex flex-col gap-2 rounded-lg bg-background/50 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex gap-4">
                              <span>
                                <strong className="uppercase opacity-70">Buy:</strong>{" "}
                                {formatTaler(bPrice)}
                              </span>
                              <span>
                                <strong className="uppercase opacity-70">Sell:</strong>{" "}
                                {formatTaler(sPrice)}
                              </span>
                            </div>
                            <div className="font-mono">
                              <span className="uppercase opacity-70">Position Value:</span>{" "}
                              <strong className="text-sm">
                                {formatTaler(projectedPortfolio[assetKey] * sPrice)} taler
                              </strong>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
        </div>

        {/* Submit Action */}
        <div className="sticky bottom-6 z-40 px-4 sm:px-0">
          {gameOver ? (
            <Button
              type="button"
              className="h-16 w-full rounded-2xl bg-green-600 text-xl font-black shadow-2xl hover:bg-green-700"
              onClick={() =>
                router.push(
                  `/dashboard/game/results?gameId=${gameId}${sessionId ? `&sessionId=${sessionId}` : ""}`,
                )
              }
            >
              <Trophy className="mr-3 size-6" />
              VIEW RESULTS
            </Button>
          ) : (
            <Button
              type="button"
              className="h-16 w-full rounded-2xl text-xl font-black shadow-2xl"
              onClick={handleSubmitTrades}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-3 size-6 animate-spin" />
                  PROCESSING...
                </>
              ) : (
                <>DONE TRADING & ROLL YEAR</>
              )}
            </Button>
          )}
        </div>
      </div>

      <GameChatbot />
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
