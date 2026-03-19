"use client"

import { useMutation, useQuery } from "convex/react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Coins,
  History,
  Info,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Store,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"

import { GameChatbot } from "@/components/molecules/game-chatbot"
import { StoryPlayer } from "@/components/organisms/story-player"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useIsMobile } from "@/hooks/use-mobile"
import { portfolioValue } from "@/lib/game/engine"
import { getOrCreateGuestId } from "@/lib/guest"
import type { PlayerAction } from "@/lib/types/actions"
import type { TradableAsset } from "@/lib/types/assets"
import { TRADABLE_ASSET_KEYS } from "@/lib/types/assets"
import { buyPrice, nominalPrice, sellPrice } from "@/lib/types/market"
import type { StorySlide } from "@/lib/types/onboarding"
import type { StateVector } from "@/lib/types/state_vector"
import { clamp } from "@/lib/utils"

// ─── Constants ───────────────────────────────────────────────────

type AssetKey = TradableAsset | "taler"

const goodsMeta: Array<{
  key: AssetKey
  name: string
  icon: string
  colorClass: string
  description: string
}> = [
  {
    key: "taler",
    name: "Taler",
    icon: "/asset-classes/taler.webp",
    colorClass: "bg-amber-100",
    description: "Your liquid cash. Safe but loses value to inflation.",
  },
  {
    key: "wood",
    name: "Wood",
    icon: "/asset-classes/wood.webp",
    colorClass: "bg-orange-100",
    description: "Stable and reliable growth. Low risk.",
  },
  {
    key: "potatoes",
    name: "Potatoes",
    icon: "/asset-classes/potatoes.webp",
    colorClass: "bg-yellow-100",
    description: "Moderate growth with seasonal swings. Medium risk.",
  },
  {
    key: "fish",
    name: "Fish",
    icon: "/asset-classes/fish.webp",
    colorClass: "bg-blue-100",
    description: "High potential returns but very volatile. High risk.",
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

// ─── Trade Mapping Helpers ──────────────────────────

/**
 * Maps a pixel coordinate (X) within the trade bar width to a trade quantity.
 * Middle (width/2) is 0. Left (0) is -maxSell. Right (width) is maxBuy.
 */
function mapXToTrade(x: number, width: number, maxBuy: number, maxSell: number): number {
  const mid = width / 2
  if (x <= mid) {
    // 0 to mid maps to [-maxSell, 0]
    const progress = x / mid
    return Math.round((progress - 1) * maxSell)
  }
  // mid to width maps to [0, maxBuy]
  const progress = (x - mid) / mid
  return Math.round(progress * maxBuy)
}

/**
 * Maps a trade quantity back to a pixel coordinate (X).
 */
function mapTradeToX(trade: number, width: number, maxBuy: number, maxSell: number): number {
  const mid = width / 2
  if (trade >= 0) {
    if (maxBuy === 0) return mid
    const progress = trade / maxBuy
    return mid + mid * progress
  }
  if (maxSell === 0) return mid
  const progress = Math.abs(trade) / maxSell
  return mid * (1 - progress)
}

// ─── Chart ───────────────────────────────────────────────────────

function AssetHistoryGraph({ history, asset }: { history: StateVector[]; asset: TradableAsset }) {
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
    <div className="rounded-lg border bg-muted/10 p-2">
      <div className="flex items-center gap-2 mb-2">
        <History className="size-3 text-muted-foreground" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Price History
        </p>
      </div>
      <ChartContainer config={assetChartConfig} className="h-40 w-full">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={`chart-fill-${asset}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineConfig[asset].color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={lineConfig[asset].color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
          <XAxis
            dataKey="step"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => `Y${value}`}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={40}
            tick={{ fontSize: 10 }}
          />
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
                  <span className="font-mono font-bold">
                    {Number(value).toLocaleString("de-CH")}
                  </span>
                )}
              />
            }
          />
          <Area
            type="monotone"
            dataKey={asset}
            stroke={lineConfig[asset].color}
            strokeWidth={2.5}
            fill={`url(#chart-fill-${asset})`}
            activeDot={{ r: 5, strokeWidth: 0 }}
            animationDuration={1000}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

// ─── Marketplace Asset Card ──────────────────────────────────────

function AssetCard({
  meta,
  current,
  portfolio,
  tradePlan,
  history,
  projectedPortfolio,
  projectedTalerBalance,
  expandedAsset,
  setExpandedAsset,
  setTradePlan,
  isMobile,
  gameOver,
}: {
  meta: (typeof goodsMeta)[number]
  current: StateVector
  portfolio: StateVector["portfolio"]
  tradePlan: Record<TradableAsset, number>
  history: StateVector[]
  projectedPortfolio: StateVector["portfolio"]
  projectedTalerBalance: number
  expandedAsset: TradableAsset | null
  setExpandedAsset: (a: TradableAsset | null) => void
  setTradePlan: React.Dispatch<React.SetStateAction<Record<TradableAsset, number>>>
  isMobile: boolean
  gameOver: boolean
}) {
  const assetKey = meta.key as TradableAsset
  const currentPrice = current.market.prices[assetKey]
  const inf = current.market.inflation
  const bPrice = buyPrice(currentPrice, inf)
  const sPrice = sellPrice(currentPrice, inf)

  const prevMarket = history.length > 1 ? history[history.length - 2].market : null
  const prevPrice = prevMarket ? prevMarket.prices[assetKey] : null
  const isUp = prevPrice ? currentPrice.basePrice >= prevPrice.basePrice : true

  const isExpanded = expandedAsset === assetKey
  const tradeQty = tradePlan[assetKey]

  const cashExcludingThis =
    projectedTalerBalance +
    (tradeQty > 0 ? tradeQty * bPrice : tradeQty < 0 ? tradeQty * sPrice : 0)
  const maxBuy = Math.max(0, Math.floor(cashExcludingThis / bPrice))
  const maxSell = portfolio[assetKey]

  const assetColor = lineConfig[assetKey].color
  const tradeBarRef = useRef<HTMLDivElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const onPointerUpdate = (clientX: number) => {
    if (!tradeBarRef.current) return
    const rect = tradeBarRef.current.getBoundingClientRect()
    const x = clamp(clientX - rect.left, 0, rect.width)
    const val = mapXToTrade(x, rect.width, maxBuy, maxSell)
    setTradePlan((prev) => ({ ...prev, [assetKey]: val }))
  }

  return (
    <Card
      className={`overflow-hidden border-2 transition-all duration-300 hover:shadow-md ${isExpanded ? "ring-2 ring-primary/20 border-primary/20" : "border-border/50"}`}
      style={{ backgroundColor: `${assetColor}20` }}
    >
      <CardContent className="p-0">
        <div className="flex flex-col p-4 sm:p-5 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="rounded-2xl p-3 shadow-md bg-white">
                <Image
                  src={meta.icon}
                  alt={meta.name}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black leading-tight tracking-tight">{meta.name}</h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Image
                      src="/asset-classes/taler.webp"
                      alt="Taler"
                      width={14}
                      height={14}
                      className="object-contain"
                    />
                    <span className="font-mono text-sm font-black text-muted-foreground">
                      {formatTaler(sPrice)}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/50 text-[10px] font-bold"
                    style={{ color: isUp ? "#16a34a" : "#dc2626" }}
                  >
                    {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {isUp ? "UP" : "DOWN"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-8 border-t pt-4 sm:border-t-0 sm:pt-0">
              <div className="flex flex-col items-start sm:items-end">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                  Your Units
                </span>
                <span className="text-2xl font-black tabular-nums">
                  {projectedPortfolio[assetKey]}
                </span>
              </div>

              {!isMobile && (
                <div className="flex items-center gap-2 bg-white/40 p-1 rounded-2xl border border-white/60 shadow-xs">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-10 rounded-xl hover:bg-white/20"
                    disabled={gameOver || portfolio[assetKey] + tradeQty <= 0}
                    onClick={(e) => {
                      e.stopPropagation()
                      setTradePlan((p) => ({ ...p, [assetKey]: p[assetKey] - 1 }))
                    }}
                  >
                    <Minus className="size-5" />
                  </Button>
                  <div className="flex flex-col items-center min-w-[4rem]">
                    <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50">
                      Draft
                    </span>
                    <span
                      className={`font-mono text-lg font-black tabular-nums ${tradeQty > 0 ? "text-green-600" : tradeQty < 0 ? "text-rose-600" : ""}`}
                    >
                      {tradeQty > 0 ? "+" : ""}
                      {tradeQty}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-10 rounded-xl hover:bg-white/20"
                    disabled={gameOver || maxBuy <= tradeQty}
                    onClick={(e) => {
                      e.stopPropagation()
                      setTradePlan((p) => ({ ...p, [assetKey]: p[assetKey] + 1 }))
                    }}
                  >
                    <Plus className="size-5" />
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full size-10 transition-colors ${isExpanded ? "bg-white/40 text-primary" : "hover:bg-white/20"}`}
                onClick={() => setExpandedAsset(isExpanded ? null : assetKey)}
              >
                {isExpanded ? <ChevronUp className="size-6" /> : <ChevronDown className="size-6" />}
              </Button>
            </div>
          </div>

          {isMobile && !gameOver && (
            <div className="space-y-3 pt-2 border-t border-black/5">
              <div className="flex justify-between items-end px-1">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase opacity-50">Sell Mode</span>
                  <span className="text-xs font-bold text-rose-600">-{maxSell} Max</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Trade Plan
                  </span>
                  <span
                    className={`text-xl font-black tabular-nums ${tradeQty > 0 ? "text-green-600" : tradeQty < 0 ? "text-rose-600" : ""}`}
                  >
                    {tradeQty > 0 ? "+" : ""}
                    {tradeQty}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase opacity-50">Buy Mode</span>
                  <span className="text-xs font-bold text-green-600">+{maxBuy} Max</span>
                </div>
              </div>

              <div
                ref={tradeBarRef}
                className="relative h-12 rounded-2xl border-2 border-white/60 bg-white/40 shadow-inner overflow-hidden touch-none"
                onPointerDown={(e) => {
                  setIsDragging(true)
                  onPointerUpdate(e.clientX)
                }}
                onPointerMove={(e) => {
                  if (isDragging) onPointerUpdate(e.clientX)
                }}
                onPointerUp={() => setIsDragging(false)}
                onPointerLeave={() => setIsDragging(false)}
              >
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 h-full bg-linear-to-r from-rose-500/10 to-transparent" />
                  <div className="w-1/2 h-full bg-linear-to-l from-emerald-500/10 to-transparent" />
                </div>
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-black/10" />
                <motion.div
                  className="absolute top-1/2 z-20 h-10 w-10 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-white shadow-lg flex items-center justify-center"
                  style={{ left: `${mapTradeToX(tradeQty, 100, maxBuy, maxSell)}%` }}
                  animate={{ scale: isDragging ? 1.1 : 1 }}
                >
                  <div
                    className="absolute inset-1 rounded-full shadow-inner"
                    style={{ backgroundColor: assetColor }}
                  />
                </motion.div>
              </div>

              <div className="flex justify-between items-center px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] font-black"
                  onClick={() => setTradePlan((p) => ({ ...p, [assetKey]: 0 }))}
                >
                  <RotateCcw className="size-3 mr-1" /> RESET
                </Button>
                <span className="text-[10px] font-bold opacity-60">
                  {tradeQty !== 0
                    ? tradeQty > 0
                      ? `Cost: ${formatTaler(tradeQty * bPrice)}`
                      : `Gain: ${formatTaler(Math.abs(tradeQty) * sPrice)}`
                    : "No change"}
                </span>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: "circOut" }}
            >
              <div className="border-t border-white/20 bg-white/10 p-4 sm:p-6 space-y-6">
                <AssetHistoryGraph history={history} asset={assetKey} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white/60 backdrop-blur-sm border border-white/80 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Store className="size-3 text-muted-foreground" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Local Market Prices
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          You Buy At
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Image
                            src="/asset-classes/taler.webp"
                            alt="Taler"
                            width={16}
                            height={16}
                            className="object-contain"
                          />
                          <span className="text-lg font-black font-mono">
                            {formatTaler(bPrice)}
                          </span>
                        </div>
                      </div>
                      <div className="h-8 w-px bg-white mx-4" />
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          You Sell At
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Image
                            src="/asset-classes/taler.webp"
                            alt="Taler"
                            width={16}
                            height={16}
                            className="object-contain"
                          />
                          <span className="text-lg font-black font-mono">
                            {formatTaler(sPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm border border-white/80 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Wallet className="size-3 text-muted-foreground" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Portfolio Breakdown
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Quantity
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Image
                            src={meta.icon}
                            alt={meta.name}
                            width={16}
                            height={16}
                            className="object-contain"
                          />
                          <span className="text-lg font-black font-mono">
                            {projectedPortfolio[assetKey]} Units
                          </span>
                        </div>
                      </div>
                      <div className="h-8 w-px bg-white mx-4" />
                      <div className="flex flex-col items-end text-right">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          Total Position Value
                        </span>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Image
                            src="/asset-classes/taler.webp"
                            alt="Taler"
                            width={16}
                            height={16}
                            className="object-contain"
                          />
                          <span className="text-lg font-black font-mono text-primary">
                            {formatTaler(projectedPortfolio[assetKey] * sPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

// ─── Main Game Page ──────────────────────────────────────────────

function GameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionIdParam = searchParams.get("sessionId") as Id<"sessions"> | null
  const gameIdParam = searchParams.get("gameId") as Id<"games"> | null
  const isMobile = useIsMobile()

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

  const history: StateVector[] = useMemo(() => {
    if (!convexHistory?.length) return []
    // biome-ignore lint/suspicious/noExplicitAny: shape match
    return convexHistory as any
  }, [convexHistory])

  const current = history.length > 0 ? history[history.length - 1] : null

  const scenario = useMemo(() => {
    if (!convexScenario) return null
    const { _id, _creationTime, ...rest } = convexScenario
    return { id: _id, ...rest } as any
  }, [convexScenario])

  const gameOver = useMemo(() => {
    if (!scenario || !current) return false
    return current.date >= scenario.endYear
  }, [current, scenario])

  const [tradePlan, setTradePlan] = useState<Record<TradableAsset, number>>({
    wood: 0,
    potatoes: 0,
    fish: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedAsset, setExpandedAsset] = useState<TradableAsset | null>(null)

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

  const allocationData = useMemo(() => {
    return [
      { name: "Taler", value: totalAssetValue.taler, color: lineConfig.taler.color },
      { name: "Wood", value: totalAssetValue.wood, color: lineConfig.wood.color },
      { name: "Potatoes", value: totalAssetValue.potatoes, color: lineConfig.potatoes.color },
      { name: "Fish", value: totalAssetValue.fish, color: lineConfig.fish.color },
    ].filter((d) => d.value > 0)
  }, [totalAssetValue])

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

  const prevGoalReached = useRef<boolean | null>(null)
  const [goalAnimation, setGoalAnimation] = useState<"reached" | "lost" | null>(null)
  useEffect(() => {
    if (!current) return
    const wasReached = prevGoalReached.current
    const isReached = current.goalReached
    if (wasReached === false && isReached) {
      setGoalAnimation("reached")
      const t = setTimeout(() => setGoalAnimation(null), 3000)
      return () => clearTimeout(t)
    }
    if (wasReached === true && !isReached) {
      setGoalAnimation("lost")
      const t = setTimeout(() => setGoalAnimation(null), 3000)
      return () => clearTimeout(t)
    }
    prevGoalReached.current = isReached
  }, [current, current?.goalReached])
  useEffect(() => {
    if (current) prevGoalReached.current = current.goalReached
  })

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
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="font-medium animate-pulse">Summoning the market...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <TooltipProvider>
        <div className="space-y-8">
          {/* 1. Combined Header & Overview Section */}
          <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-muted bg-[#F9F8F3] p-8 shadow-xl">
            <div className="relative z-10 flex flex-col gap-10">
              {/* Top Row: Timeline, Assets Grid, Donut Chart */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                {/* Timeline & Market */}
                <div className="space-y-6">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                      Timeline
                    </span>
                    <h1 className="text-7xl font-black tabular-nums tracking-tighter text-[#1A1A1A]">
                      Year {current.date}
                    </h1>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                      Market Condition
                    </span>
                    <Badge
                      variant={current.market.regime === "bull" ? "default" : "destructive"}
                      className="px-6 py-2 text-sm font-black uppercase tracking-widest shadow-md rounded-full bg-[#FFD700] text-black border-none hover:bg-[#FFD700]/90"
                    >
                      {current.market.regime === "bull" ? "🐂 Bull Market" : "🐻 Bear Market"}
                    </Badge>
                  </div>
                </div>

                {/* 2x2 Asset Grid */}
                <div className="grid grid-cols-2 gap-px bg-muted/10 rounded-3xl overflow-hidden border border-muted shadow-sm">
                  {[
                    goodsMeta.find((m) => m.key === "potatoes"),
                    goodsMeta.find((m) => m.key === "fish"),
                    goodsMeta.find((m) => m.key === "taler"),
                    goodsMeta.find((m) => m.key === "wood"),
                  ].map(
                    (meta) =>
                      meta && (
                        <div
                          key={meta.key}
                          className="bg-white p-4 flex items-center gap-4 min-w-[140px]"
                        >
                          <div
                            className={`p-2 rounded-2xl shadow-sm`}
                            style={{ backgroundColor: lineConfig[meta.key].color }}
                          >
                            <Image
                              src={meta.icon}
                              alt={meta.name}
                              width={32}
                              height={32}
                              className="object-contain"
                            />
                          </div>
                          <span className="font-mono text-2xl font-black tabular-nums">
                            {meta.key === "taler"
                              ? Math.round(projectedPortfolio.gold)
                              : projectedPortfolio[meta.key as TradableAsset]}
                          </span>
                        </div>
                      ),
                  )}
                </div>

                {/* Larger Donut Chart */}
                <div className="flex flex-col items-center bg-white p-4 rounded-[2rem] shadow-sm border border-muted/50">
                  <div className="h-40 w-40 relative">
                    <PieChart width={160} height={160}>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                        animationDuration={1000}
                      >
                        {allocationData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </div>
                </div>
              </div>

              {/* Bottom Labels: Portfolio Value & Target */}
              <div className="flex items-end justify-between px-2 pt-4 border-t border-muted/20">
                <div className="flex items-center gap-3">
                  <Wallet className="size-5 text-muted-foreground/60" />
                  <span className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                    Portfolio Value
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-2 text-[#FFD700]">
                    <Trophy className="size-5" />
                    <span className="text-sm font-black uppercase tracking-[0.2em]">Target</span>
                  </div>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-4xl font-black text-[#FFD700] drop-shadow-sm">
                      {formatTaler(current.goal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Massive Full-width Progress Bar */}
              <div className="relative group -mx-2">
                <div className="h-12 w-full overflow-hidden rounded-full border-4 border-white bg-white shadow-2xl">
                  <div className="h-full w-full rounded-full overflow-hidden bg-muted/10 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (totalValue / current.goal) * 100)}%` }}
                      className="h-full transition-all duration-1000 ease-out bg-[#FFD700]"
                    />

                    {/* Value text INSIDE the bar */}
                    <div className="absolute inset-0 flex items-center justify-start px-6 pointer-events-none">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tabular-nums text-[#1A1A1A]">
                          {formatTaler(totalValue)}
                        </span>
                        <span className="text-sm font-black uppercase text-[#1A1A1A]/60">
                          taler
                        </span>
                      </div>
                    </div>

                    {totalValue >= current.goal && (
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: "200%" }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                        className="absolute inset-0 z-10 w-1/2 bg-linear-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg]"
                      />
                    )}
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">
                    Independence Progress
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {current.goalReached || goalAnimation === "reached" ? (
                    <motion.div
                      key="goal-reached"
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    >
                      <Badge
                        variant="default"
                        className="bg-green-600 px-8 py-3 text-sm font-black uppercase tracking-widest shadow-xl ring-8 ring-green-500/10 rounded-full"
                      >
                        🎯 MISSION ACCOMPLISHED
                      </Badge>
                    </motion.div>
                  ) : goalAnimation === "lost" ? (
                    <motion.div
                      key="goal-lost"
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    >
                      <Badge
                        variant="destructive"
                        className="px-8 py-3 text-sm font-black uppercase tracking-widest shadow-xl ring-8 ring-destructive/10 rounded-full"
                      >
                        📉 FORTUNE DIMINISHED
                      </Badge>
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {gameOver && (
                        <Badge
                          variant="outline"
                          className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-white shadow-sm border-primary/20 rounded-full"
                        >
                          ⌛ THE FINAL YEAR
                        </Badge>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 opacity-[0.03] pointer-events-none rotate-12">
              <Coins size={400} />
            </div>
          </div>

          {/* 3. Marketplace: Asset Trading */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Store className="size-4 text-primary" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                  The Marketplace
                </h2>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-6 rounded-full">
                    <Info className="size-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px] max-w-[200px]">
                  Adjust your holdings for the next season. Remember: Buy low, sell high.
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex flex-col gap-4">
              {goodsMeta
                .filter((m) => m.key !== "taler")
                .map((meta) => (
                  <AssetCard
                    key={meta.key}
                    meta={meta}
                    current={current}
                    portfolio={portfolio}
                    tradePlan={tradePlan}
                    history={history}
                    projectedPortfolio={projectedPortfolio}
                    projectedTalerBalance={projectedTalerBalance}
                    expandedAsset={expandedAsset}
                    setExpandedAsset={setExpandedAsset}
                    setTradePlan={setTradePlan}
                    isMobile={isMobile}
                    gameOver={gameOver}
                  />
                ))}
            </div>
          </div>

          {/* 4. Footer Action */}
          <div className="sticky bottom-6 z-40 px-4 sm:px-0">
            <div className="group relative">
              <div className="absolute -inset-1 rounded-2xl bg-linear-to-r from-primary to-amber-500 opacity-25 blur-lg transition duration-1000 group-hover:opacity-50 group-hover:duration-200" />

              {gameOver ? (
                <Button
                  type="button"
                  className="relative h-16 sm:h-20 w-full rounded-2xl bg-green-600 text-xl sm:text-2xl font-black tracking-widest shadow-2xl transition-all hover:bg-green-700 hover:scale-[1.02] active:scale-95"
                  onClick={() =>
                    router.push(
                      `/dashboard/game/results?gameId=${gameId}${sessionId ? `&sessionId=${sessionId}` : ""}`,
                    )
                  }
                >
                  <Trophy className="mr-4 size-6 sm:size-8" />
                  VIEW RESULTS
                </Button>
              ) : (
                <Button
                  type="button"
                  className="relative h-16 sm:h-20 w-full rounded-2xl text-lg sm:text-2xl font-black tracking-widest shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-80"
                  onClick={handleSubmitTrades}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-4">
                      <Loader2 className="size-6 sm:size-8 animate-spin" />
                      PROCESSING...
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full px-4 sm:px-8">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <Store className="size-6 sm:size-8" />
                        <span className="text-[15px] sm:text-xl leading-none">FINISH TRADING</span>
                      </div>
                      <div className="h-10 w-px bg-white/20" />
                      <div className="flex items-center gap-2 sm:gap-4 leading-none text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] sm:text-[10px] font-black opacity-70 mb-0.5 sm:mb-1 uppercase">
                            PROCEED TO
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3 sm:size-4 opacity-70" />
                            <span className="text-base sm:text-xl">NEXT YEAR</span>
                          </div>
                        </div>
                        <ArrowRight className="size-6 sm:size-8 animate-pulse" />
                      </div>
                    </div>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>

      <GameChatbot />
    </main>
  )
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-10 animate-spin text-primary" />
        </div>
      }
    >
      <GameContent />
    </Suspense>
  )
}
