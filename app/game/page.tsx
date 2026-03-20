"use client"

import { useMutation, useQuery } from "convex/react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Coins,
  History,
  Loader2,
  Minus,
  Plus,
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
import { EventPopup } from "@/components/organisms/event-popup"
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
import { TooltipProvider } from "@/components/ui/tooltip"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useIsMobile } from "@/hooks/use-mobile"
import { DEBUG_SCENARIO } from "@/lib/game/debug-scenario"
import { gameStep, initializeGame, portfolioValue } from "@/lib/game/engine"
import { getOrCreateGuestId } from "@/lib/guest"
import type { PlayerAction } from "@/lib/types/actions"
import type { TradableAsset } from "@/lib/types/assets"
import { TRADABLE_ASSET_KEYS } from "@/lib/types/assets"
import type { GameEvent } from "@/lib/types/events"
import { buyPrice, nominalPrice, sellPrice } from "@/lib/types/market"
import type { StorySlide } from "@/lib/types/onboarding"
import type { StateVector } from "@/lib/types/state_vector"
import { clamp, cn } from "@/lib/utils"

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
const MARKETPLACE_ONBOARDING_KEY = "game_marketplace_onboarding_seen"
const MARKETPLACE_ONBOARDING_ORDER: TradableAsset[] = ["wood", "potatoes", "fish"]

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
 */
function mapXToTrade(x: number, width: number, maxBuy: number, maxSell: number): number {
  const mid = width / 2
  if (x <= mid) {
    const progress = x / mid
    return Math.round((progress - 1) * maxSell)
  }
  const progress = (x - mid) / mid
  return Math.round(progress * maxBuy)
}

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
    <div className="rounded-lg border bg-muted/10 p-2" data-prevent-card-toggle="true">
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
  expandedAsset,
  setExpandedAsset,
  setTradeQuantity,
  maxBuyForAsset,
  isMobile,
  gameOver,
  isOnboardingTarget,
  onboardingStep,
  onCardClick,
}: {
  meta: (typeof goodsMeta)[number]
  current: StateVector
  portfolio: StateVector["portfolio"]
  tradePlan: Record<TradableAsset, number>
  history: StateVector[]
  projectedPortfolio: StateVector["portfolio"]
  expandedAsset: TradableAsset | null
  setExpandedAsset: (a: TradableAsset | null) => void
  setTradeQuantity: (asset: TradableAsset, quantity: number) => void
  maxBuyForAsset: (asset: TradableAsset) => number
  isMobile: boolean
  gameOver: boolean
  isOnboardingTarget: boolean
  onboardingStep: number | null
  onCardClick?: (asset: TradableAsset) => void
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

  const maxBuy = maxBuyForAsset(assetKey)
  const maxSell = portfolio[assetKey]
  const baseMaxBuyForScale = bPrice > 0 ? Math.floor(portfolio.gold / bPrice) : 0
  const visualMaxBuy = Math.max(baseMaxBuyForScale, Math.max(0, tradeQty), 1)

  const assetColor = lineConfig[assetKey].color
  const tradeBarRef = useRef<HTMLDivElement | null>(null)
  const toggleAreaRef = useRef<HTMLDivElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const cardBaseClass = cn(
    "relative overflow-hidden border-2 transition-all",
    isExpanded ? "ring-2 ring-primary/20 border-primary/20" : "border-border/50",
  )

  const cardOverlay =
    isOnboardingTarget && !gameOver ? (
      <>
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] border-2"
          style={{ borderColor: assetColor }}
          animate={{ opacity: [0.45, 0.95, 0.45] }}
          transition={{ duration: 1.3, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
        />
        <motion.div
          className="pointer-events-none absolute inset-y-0 -left-1/2 z-20 w-1/2"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${assetColor}66 45%, transparent 100%)`,
            filter: "blur(6px)",
          }}
          animate={{ x: ["-120%", "260%"] }}
          transition={{ duration: 1.8, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
        />
        <div className="pointer-events-none absolute left-3 top-3 z-30 rounded-full bg-background/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm border border-border/70">
          Step {(onboardingStep ?? 0) + 1}: Click {meta.name}
        </div>
      </>
    ) : null

  const handleCardClick = (event: React.MouseEvent) => {
    const target = event.target
    if (!(target instanceof Node)) return
    if (!toggleAreaRef.current?.contains(target)) return
    if (tradeBarRef.current?.contains(target)) return
    if ((target as Element).closest?.('[data-prevent-card-toggle="true"]')) return
    setExpandedAsset(isExpanded ? null : assetKey)
    onCardClick?.(assetKey)
  }

  const onPointerUpdate = (clientX: number) => {
    if (!tradeBarRef.current) return
    const rect = tradeBarRef.current.getBoundingClientRect()
    const x = clamp(clientX - rect.left, 0, rect.width)
    const val = mapXToTrade(x, rect.width, visualMaxBuy, maxSell)
    setTradeQuantity(assetKey, val)
  }

  if (isMobile) {
    const mobileCard = (
      <Card
        className={cardBaseClass}
        style={{ backgroundColor: `${assetColor}15` }}
        onClick={handleCardClick}
      >
        {cardOverlay}
        <CardContent className="p-3">
          <div className="flex items-center gap-3" ref={toggleAreaRef}>
            {/* Left: Icon */}
            <div className="rounded-xl p-2 bg-white shadow-sm shrink-0">
              <Image src={meta.icon} alt="" width={32} height={32} className="object-contain" />
            </div>

            {/* Middle: Info & Slider */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase truncate">{meta.name}</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground">
                    <span className="uppercase opacity-50">Price:</span>
                    <div className="flex items-center gap-0.5">
                      <Image src="/asset-classes/taler.webp" alt="" width={8} height={8} />
                      <span>{formatTaler(sPrice)}</span>
                    </div>
                    <div style={{ color: isUp ? "#16a34a" : "#dc2626" }}>
                      {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    </div>
                    <span className="mx-0.5 opacity-30">|</span>
                    <span className="uppercase opacity-50">Units:</span>
                    <span>{projectedPortfolio[assetKey]}</span>
                  </div>
                </div>
              </div>

              {!gameOver && (
                <div className="flex flex-col gap-1">
                  <div
                    ref={tradeBarRef}
                    className="relative h-8 rounded-full border-2 border-white/60 bg-white/40 shadow-inner overflow-hidden touch-none"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setIsDragging(true)
                      onPointerUpdate(e.clientX)
                    }}
                    onPointerMove={(e) => {
                      e.stopPropagation()
                      if (isDragging) onPointerUpdate(e.clientX)
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation()
                      setIsDragging(false)
                    }}
                    onPointerLeave={(e) => {
                      e.stopPropagation()
                      setIsDragging(false)
                    }}
                  >
                    <div className="absolute inset-0 flex">
                      <div className="w-1/2 h-full bg-linear-to-r from-rose-500/10 to-transparent" />
                      <div className="w-1/2 h-full bg-linear-to-l from-emerald-500/10 to-transparent" />
                    </div>
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-black/10" />

                    {/* Handle */}
                    <motion.div
                      className="absolute top-1/2 z-20 h-10 w-10 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-white shadow-md flex items-center justify-center"
                      style={{ left: `${mapTradeToX(tradeQty, 100, visualMaxBuy, maxSell)}%` }}
                      animate={{ scale: isDragging ? 1.15 : 1 }}
                    >
                      <div
                        className="absolute inset-1 rounded-full"
                        style={{ backgroundColor: assetColor }}
                      />
                    </motion.div>

                    {/* Text Overlay */}
                    {tradeQty !== 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span
                          className={cn(
                            "text-[9px] font-black",
                            tradeQty > 0 ? "text-emerald-700" : "text-rose-700",
                          )}
                        >
                          {tradeQty > 0 ? "+" : ""}
                          {tradeQty}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center px-1.5">
                    <span className="text-[7px] font-black uppercase tracking-widest text-rose-600/60">
                      Sell
                    </span>
                    <span className="text-[7px] font-black uppercase tracking-widest text-emerald-600/60">
                      Buy
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Expand Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                setExpandedAsset(isExpanded ? null : assetKey)
              }}
            >
              {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 space-y-3 pt-3 border-t border-black/5"
              >
                <AssetHistoryGraph history={history} asset={assetKey} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/60 rounded-xl p-2 flex flex-col gap-1 border border-white/80">
                    <span className="text-[8px] font-black uppercase text-muted-foreground">
                      Buy Price
                    </span>
                    <div className="flex items-center gap-1">
                      <Image src="/asset-classes/taler.webp" alt="" width={10} height={10} />
                      <span className="text-xs font-black">{formatTaler(bPrice)}</span>
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-xl p-2 flex flex-col gap-1 border border-white/80">
                    <span className="text-[8px] font-black uppercase text-muted-foreground">
                      Sell Price
                    </span>
                    <div className="flex items-center gap-1">
                      <Image src="/asset-classes/taler.webp" alt="" width={10} height={10} />
                      <span className="text-xs font-black">{formatTaler(sPrice)}</span>
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-xl p-2 flex flex-col gap-1 border border-white/80">
                    <span className="text-[8px] font-black uppercase text-muted-foreground">
                      Position Value
                    </span>
                    <div className="flex items-center gap-1">
                      <Image src="/asset-classes/taler.webp" alt="" width={10} height={10} />
                      <span className="text-xs font-black text-primary">
                        {formatTaler(projectedPortfolio[assetKey] * sPrice)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-xl p-2 flex flex-col gap-1 border border-white/80">
                    <span className="text-[8px] font-black uppercase text-muted-foreground">
                      Total Units
                    </span>
                    <div className="flex items-center gap-1">
                      <div
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: assetColor }}
                      />
                      <span className="text-xs font-black">
                        {projectedPortfolio[assetKey]} Units
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    )

    if (isOnboardingTarget && !gameOver) {
      return (
        <motion.div
          className="relative"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 1.2, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
        >
          {mobileCard}
        </motion.div>
      )
    }

    return mobileCard
  }

  const desktopCard = (
    <Card
      className={cn(cardBaseClass, "duration-300 hover:shadow-md")}
      style={{ backgroundColor: `${assetColor}20` }}
      onClick={handleCardClick}
    >
      {cardOverlay}
      <CardContent className="p-0">
        <div className="flex flex-col p-4 sm:p-5 gap-4">
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            ref={toggleAreaRef}
          >
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
                  <span className="text-[10px] font-black uppercase opacity-40">Price:</span>
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
                      setTradeQuantity(assetKey, tradeQty - 1)
                    }}
                  >
                    <Minus className="size-5" />
                  </Button>
                  <div className="flex flex-col items-center min-w-16">
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
                      setTradeQuantity(assetKey, tradeQty + 1)
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
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedAsset(isExpanded ? null : assetKey)
                }}
              >
                {isExpanded ? <ChevronUp className="size-6" /> : <ChevronDown className="size-6" />}
              </Button>
            </div>
          </div>
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

  if (isOnboardingTarget && !gameOver) {
    return (
      <motion.div
        className="relative"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 1.2, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
      >
        {desktopCard}
      </motion.div>
    )
  }

  return desktopCard
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
  const [marketplaceOnboardingStep, setMarketplaceOnboardingStep] = useState<number | null>(null)

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY)
    if (!seen) setShowOnboarding(true)
    setOnboardingChecked(true)
  }, [])

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true")
    setShowOnboarding(false)
  }, [])

  useEffect(() => {
    if (!onboardingChecked || showOnboarding) return

    const seen = localStorage.getItem(MARKETPLACE_ONBOARDING_KEY)
    if (!seen) {
      setMarketplaceOnboardingStep(0)
    }
  }, [onboardingChecked, showOnboarding])

  const handleMarketplaceCardClick = useCallback((asset: TradableAsset) => {
    setMarketplaceOnboardingStep((prev) => {
      if (prev === null) return prev

      const expected = MARKETPLACE_ONBOARDING_ORDER[prev]
      if (asset !== expected) return prev

      const next = prev + 1
      if (next >= MARKETPLACE_ONBOARDING_ORDER.length) {
        localStorage.setItem(MARKETPLACE_ONBOARDING_KEY, "true")
        return null
      }

      return next
    })
  }, [])

  const guestId = getOrCreateGuestId()
  const startGameMutation = useMutation(api.game.startGame)
  const submitStepMutation = useMutation(api.game.submitStep)

  const isTraining = searchParams.get("mode") === "training"
  const [localHistory, setLocalHistory] = useState<StateVector[]>([])

  useEffect(() => {
    if (isTraining && localHistory.length === 0) {
      const initial = initializeGame(DEBUG_SCENARIO)
      setLocalHistory([initial])
    }
  }, [isTraining, localHistory])

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
        router.replace(`/game?sessionId=${sessionIdParam}&gameId=${id}`)
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
    if (isTraining) return localHistory
    if (!convexHistory?.length) return []
    // biome-ignore lint/suspicious/noExplicitAny: shape match
    return convexHistory as any
  }, [convexHistory, isTraining, localHistory])

  const current = history.length > 0 ? history[history.length - 1] : null

  const scenario = useMemo(() => {
    if (isTraining) return DEBUG_SCENARIO
    if (!convexScenario) return null
    const { _id, _creationTime, ...rest } = convexScenario
    // biome-ignore lint/suspicious/noExplicitAny: shape match
    return { id: _id, ...rest } as any
  }, [convexScenario, isTraining])

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
  const isSubmittingRef = useRef(false)
  const [expandedAsset, setExpandedAsset] = useState<TradableAsset | null>(null)
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null)
  const [isEventPopupOpen, setIsEventPopupOpen] = useState(false)
  const lastSeenStepRef = useRef<number | null>(null)
  const eventSeenStorageKey = useMemo(
    () => (gameId ? `trade-tales:event-seen-step:${gameId}` : null),
    [gameId],
  )

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

  const computeMaxBuyForAsset = useCallback(
    (asset: TradableAsset, plan: Record<TradableAsset, number>) => {
      const price = getBuyPriceFor(asset)
      if (price <= 0) return 0

      let availableGold = portfolio.gold

      for (const otherAsset of TRADABLE_ASSET_KEYS) {
        if (otherAsset === asset) continue

        const qty = plan[otherAsset]
        if (qty > 0) {
          availableGold -= qty * getBuyPriceFor(otherAsset)
        } else if (qty < 0) {
          availableGold += Math.abs(qty) * getSellPriceFor(otherAsset)
        }
      }

      return Math.max(0, Math.floor(availableGold / price))
    },
    [portfolio.gold, getBuyPriceFor, getSellPriceFor],
  )

  const setTradeQuantity = useCallback(
    (asset: TradableAsset, quantity: number) => {
      setTradePlan((prev) => {
        const maxBuy = computeMaxBuyForAsset(asset, prev)
        const maxSell = portfolio[asset]
        const clampedQty = clamp(quantity, -maxSell, maxBuy)

        if (clampedQty === prev[asset]) return prev
        return { ...prev, [asset]: clampedQty }
      })
    },
    [computeMaxBuyForAsset, portfolio],
  )

  const maxBuyForAsset = useCallback(
    (asset: TradableAsset) => computeMaxBuyForAsset(asset, tradePlan),
    [computeMaxBuyForAsset, tradePlan],
  )

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
  const goalProgressPercent = useMemo(() => {
    if (!current?.goal || current.goal <= 0) return 0
    const ratio = (totalValue / current.goal) * 100
    if (!Number.isFinite(ratio)) return 0
    return clamp(ratio, 0, 100)
  }, [current?.goal, totalValue])

  const allocationData = useMemo(() => {
    return [
      { name: "Taler", value: totalAssetValue.taler, color: lineConfig.taler.color },
      { name: "Wood", value: totalAssetValue.wood, color: lineConfig.wood.color },
      { name: "Potatoes", value: totalAssetValue.potatoes, color: lineConfig.potatoes.color },
      { name: "Fish", value: totalAssetValue.fish, color: lineConfig.fish.color },
    ].filter((d) => d.value > 0)
  }, [totalAssetValue])

  const latestEvent = current?.events?.[0] ?? null
  const marketplaceTargetAsset =
    marketplaceOnboardingStep === null
      ? null
      : (MARKETPLACE_ONBOARDING_ORDER[marketplaceOnboardingStep] ?? null)
  const marketplaceTargetName =
    goodsMeta.find((meta) => meta.key === marketplaceTargetAsset)?.name ?? null
  const latestEventImpacts = useMemo(() => {
    if (!latestEvent?.effects) return []

    const chips: string[] = []
    if (latestEvent.effects.quantityMultiplier !== undefined) {
      const qty = Math.round((latestEvent.effects.quantityMultiplier - 1) * 100)
      chips.push(`Quantity ${qty > 0 ? "+" : ""}${qty}%`)
    }
    if (latestEvent.effects.goldDelta !== undefined) {
      chips.push(
        `Gold ${latestEvent.effects.goldDelta > 0 ? "+" : ""}${latestEvent.effects.goldDelta}`,
      )
    }
    if (latestEvent.effects.priceMultiplier !== undefined) {
      const price = Math.round((latestEvent.effects.priceMultiplier - 1) * 100)
      chips.push(`Price ${price > 0 ? "+" : ""}${price}%`)
    }

    return chips
  }, [latestEvent])

  const markEventStepSeen = useCallback(
    (step: number) => {
      lastSeenStepRef.current = step
      if (!eventSeenStorageKey) return
      try {
        sessionStorage.setItem(eventSeenStorageKey, String(step))
      } catch {
        // Ignore storage errors (private mode / blocked storage)
      }
    },
    [eventSeenStorageKey],
  )

  useEffect(() => {
    if (!current) return

    if (lastSeenStepRef.current === null) {
      let initialSeenStep = current.step

      if (eventSeenStorageKey) {
        try {
          const stored = sessionStorage.getItem(eventSeenStorageKey)
          const parsed = stored ? Number.parseInt(stored, 10) : Number.NaN
          if (Number.isFinite(parsed)) {
            initialSeenStep = parsed
          } else {
            sessionStorage.setItem(eventSeenStorageKey, String(initialSeenStep))
          }
        } catch {
          // Ignore storage errors and fall back to in-memory behavior
        }
      }

      lastSeenStepRef.current = initialSeenStep
      return
    }

    if (current.step > lastSeenStepRef.current && current.events.length > 0) {
      setActiveEvent(current.events[0])
      setIsEventPopupOpen(true)
      markEventStepSeen(current.step)
      return
    }

    if (current.step > lastSeenStepRef.current) {
      markEventStepSeen(current.step)
    }
  }, [current, eventSeenStorageKey, markEventStepSeen])

  const handleSubmitTrades = useCallback(async () => {
    if ((!isTraining && !gameId) || isSubmittingRef.current || gameOver) return
    isSubmittingRef.current = true
    setIsSubmitting(true)

    const actions: PlayerAction[] = []
    for (const asset of TRADABLE_ASSET_KEYS) {
      const qty = tradePlan[asset]
      if (qty > 0) actions.push({ type: "buy", asset, quantity: qty })
      if (qty < 0) actions.push({ type: "sell", asset, quantity: Math.abs(qty) })
    }

    if (isTraining && current) {
      try {
        const nextState = await gameStep(DEBUG_SCENARIO, current, actions)
        setLocalHistory((prev) => [...prev, nextState])
        setTradePlan({ wood: 0, potatoes: 0, fish: 0 })
      } catch (e) {
        console.error("Local step failed:", e)
      } finally {
        isSubmittingRef.current = false
        setIsSubmitting(false)
      }
      return
    }

    if (!gameId) return

    try {
      if (!gameId) return
      const result = await submitStepMutation({ gameId, actions, guestId })
      setTradePlan({ wood: 0, potatoes: 0, fish: 0 })

      // Navigate to leaderboard on 5-year checkpoints (session games only)
      if (sessionId && current) {
        const nextStep = current.step + 1
        const isFiveYearCheckpoint = nextStep % 5 === 0
        const name = localStorage.getItem("debug_playerName") ?? ""
        if (isFiveYearCheckpoint || result.gameOver) {
          router.push(
            `/game/leaderboard?step=${nextStep}&gameId=${gameId}&sessionId=${sessionId}&name=${encodeURIComponent(name)}`,
          )
          return
        }
      }
    } catch (e) {
      console.error("Submit step failed:", e)
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }, [
    gameId,
    gameOver,
    tradePlan,
    submitStepMutation,
    sessionId,
    current,
    router,
    guestId,
    isTraining,
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

  if ((!isTraining && !gameId) || !current || !market) {
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
    <main className={cn("mx-auto w-full max-w-5xl px-4 py-4 sm:px-6", isMobile && "space-y-4")}>
      <TooltipProvider>
        <div className="space-y-6 lg:space-y-8">
          {/* 1. Combined Header & Overview Section */}
          <div
            className={cn(
              "relative overflow-hidden",
              isMobile
                ? "bg-transparent p-0 border-none shadow-none"
                : "rounded-[2.5rem] border-4 border-muted bg-[#F9F8F3] p-8 shadow-xl",
            )}
          >
            <div className="relative z-10 flex flex-col gap-6 lg:gap-10">
              {/* Top Row: Timeline, Assets Grid, Donut Chart */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-10">
                {/* Timeline & Market */}
                <div
                  className={cn(
                    "flex flex-row lg:flex-col items-baseline lg:items-start justify-between lg:justify-start gap-4",
                    isMobile && "w-full",
                  )}
                >
                  <div className="space-y-0 lg:space-y-1">
                    {!isMobile && (
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                        Timeline
                      </span>
                    )}
                    <h1 className="text-4xl lg:text-4xl font-black tabular-nums tracking-tighter text-[#1A1A1A]">
                      Year {current.date}
                    </h1>
                  </div>
                  <div className="flex flex-col lg:space-y-3">
                    {!isMobile && (
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                        Market Condition
                      </span>
                    )}
                    <Badge
                      variant={current.market.regime === "peace" ? "default" : "destructive"}
                      className={cn(
                        "px-4 lg:px-6 py-1 lg:py-2 text-xs lg:text-lg font-black uppercase tracking-widest shadow-sm lg:shadow-md rounded-full",
                      )}
                    >
                      {current.market.regime === "peace" ? "🕊️ Peace" : "⚔️ War"}
                    </Badge>
                  </div>
                </div>

                {/* Assets + Pie Chart Container (Row on Mobile) */}
                <div
                  className={cn(
                    "flex wood-board items-center",
                    isMobile
                      ? "w-full justify-between gap-4 p-4 rounded-2xl"
                      : "flex-col lg:flex-row gap-4 lg:gap-10 p-6 rounded-[3rem] shadow-2xl",
                  )}
                >
                  {/* 2x2 Asset Grid */}
                  <div
                    className={cn(
                      "grid grid-cols-2 gap-px bg-muted/10 rounded-xl lg:rounded-3xl overflow-hidden border border-muted shadow-xs lg:shadow-md",
                      isMobile ? "shrink-0" : "flex-1",
                    )}
                  >
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
                            className={cn(
                              "bg-white/70 flex items-center gap-2 lg:gap-4",
                              isMobile ? "p-2 min-w-0" : "p-4 min-w-35",
                            )}
                          >
                            <div
                              className={cn(
                                "rounded-lg lg:rounded-2xl shadow-xs",
                                isMobile ? "p-1 shrink-0" : "p-2",
                              )}
                              style={{ backgroundColor: lineConfig[meta.key].color }}
                            >
                              <Image
                                src={meta.icon}
                                alt={meta.name}
                                width={isMobile ? 16 : 32}
                                height={isMobile ? 16 : 32}
                                className="object-contain"
                              />
                            </div>
                            <span
                              className={cn(
                                "font-mono font-black tabular-nums",
                                isMobile ? "text-sm" : "text-2xl",
                              )}
                            >
                              {meta.key === "taler"
                                ? Math.round(projectedPortfolio.gold)
                                : projectedPortfolio[meta.key as TradableAsset]}
                            </span>
                          </div>
                        ),
                    )}
                  </div>

                  {/* Pie Chart */}
                  <div
                    className={cn(
                      "flex flex-col items-center bg-white/70 rounded-[1.5rem] lg:rounded-[2rem] shadow-xs lg:shadow-sm border border-muted/50",
                      isMobile ? "p-2" : "p-4",
                    )}
                  >
                    <div className={isMobile ? "h-20 w-20 relative" : "h-40 w-40 relative"}>
                      <PieChart width={isMobile ? 80 : 160} height={isMobile ? 80 : 160}>
                        <Pie
                          data={allocationData}
                          cx="50%"
                          cy="50%"
                          innerRadius={0}
                          outerRadius={isMobile ? 40 : 80}
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
              </div>

              {/* Streamlined Goal Progress */}
              <div className={cn("space-y-2", !isMobile && "border-t border-muted/20 pt-4")}>
                <div className="flex items-center justify-between px-1">
                  <span className="text-base lg:text-lg font-medium text-foreground/70">
                    Goal Progress
                  </span>
                  <span className="font-mono text-base lg:text-xl text-foreground/70">
                    {formatTaler(totalValue)} / {formatTaler(current.goal)} taler
                  </span>
                </div>

                <div className="relative h-7 lg:h-8 overflow-hidden rounded-full bg-emerald-500/20">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${goalProgressPercent}%` }}
                    className="h-full rounded-full bg-emerald-500"
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
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
                        className="bg-green-600 px-6 lg:px-8 py-2 lg:py-3 text-[10px] lg:text-sm font-black uppercase tracking-widest shadow-xl ring-4 lg:ring-8 ring-green-500/10 rounded-full"
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
                        className="px-6 lg:px-8 py-2 lg:py-3 text-[10px] lg:text-sm font-black uppercase tracking-widest shadow-xl ring-4 lg:ring-8 ring-destructive/10 rounded-full"
                      >
                        📉 FORTUNE DIMINISHED
                      </Badge>
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {gameOver && (
                        <Badge
                          variant="outline"
                          className="px-3 lg:px-4 py-1.5 lg:py-2 text-[9px] lg:text-xs font-black uppercase tracking-widest bg-white shadow-sm border-primary/20 rounded-full"
                        >
                          ⌛ FINAL YEAR
                        </Badge>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {!isMobile && (
              <div className="absolute -right-20 -bottom-20 opacity-[0.03] pointer-events-none rotate-12">
                <Coins size={400} />
              </div>
            )}
          </div>

          {/* Event of the Year */}
          {latestEvent && (
            <Card className="overflow-hidden border border-amber-200/70 bg-linear-to-br from-amber-50/90 via-white to-sky-50/60 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="relative size-12 sm:size-14 shrink-0 rounded-xl border border-amber-200/80 bg-white p-1.5 shadow-xs">
                    <Image
                      src={`/events/${latestEvent.type}.webp`}
                      alt={latestEvent.name}
                      fill
                      className="object-contain p-1"
                      unoptimized
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200 text-[10px] uppercase tracking-wider font-black">
                        Year Event
                      </Badge>
                      {latestEvent.targetAsset && (
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wide font-black"
                        >
                          {latestEvent.targetAsset}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-black leading-tight">
                      {latestEvent.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {latestEvent.description}
                    </p>

                    {latestEventImpacts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {latestEventImpacts.map((impact) => (
                          <span
                            key={impact}
                            className="rounded-full border border-border/70 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
                          >
                            {impact}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-full px-3 text-xs font-black uppercase tracking-wide"
                        onClick={() => {
                          setActiveEvent(latestEvent)
                          setIsEventPopupOpen(true)
                        }}
                      >
                        Open Event Details
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Marketplace Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Store className="size-4 text-primary" />
                <h2 className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                  The Marketplace
                </h2>
              </div>
            </div>

            <AnimatePresence>
              {marketplaceTargetAsset && marketplaceTargetName && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2"
                >
                  <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-primary">
                    Tutorial Step {(marketplaceOnboardingStep ?? 0) + 1} of 3: Click{" "}
                    {marketplaceTargetName}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-3 sm:gap-4">
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
                    expandedAsset={expandedAsset}
                    setExpandedAsset={setExpandedAsset}
                    setTradeQuantity={setTradeQuantity}
                    maxBuyForAsset={maxBuyForAsset}
                    isMobile={isMobile}
                    gameOver={gameOver}
                    isOnboardingTarget={marketplaceTargetAsset === meta.key}
                    onboardingStep={marketplaceOnboardingStep}
                    onCardClick={handleMarketplaceCardClick}
                  />
                ))}
            </div>
          </div>

          {/* Footer Action */}
          <div className="sticky bottom-4 z-40 px-4 sm:px-0">
            <div className="flex items-stretch gap-2 sm:gap-3">
              <GameChatbot
                inlineTrigger
                triggerClassName="relative z-10 h-14 w-14 sm:h-20 sm:w-20 shrink-0 rounded-2xl border border-border/50 bg-white/95"
                floatingClassName="bottom-24 right-4 sm:bottom-28 sm:right-6"
              />

              <div className="group relative flex-1">
                <div className="absolute -inset-1 rounded-2xl bg-linear-to-r from-primary to-amber-500 opacity-25 blur-lg transition duration-1000 group-hover:opacity-50 group-hover:duration-200" />

                {gameOver ? (
                  <Button
                    type="button"
                    className="relative h-16 sm:h-20 w-full rounded-2xl bg-green-600 text-xl sm:text-2xl font-black tracking-widest shadow-2xl transition-all hover:bg-green-700 hover:scale-[1.02]"
                    onClick={() => {
                      if (isTraining) {
                        router.push("/learn")
                      } else {
                        router.push(
                          `/game/results?gameId=${gameId}${sessionId ? `&sessionId=${sessionId}` : ""}`,
                        )
                      }
                    }}
                  >
                    <Trophy className="mr-4 size-6 sm:size-8" />
                    {isTraining ? "BACK TO TRAINING" : "RESULTS"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="relative h-14 sm:h-20 w-full rounded-2xl text-base sm:text-2xl font-black tracking-widest shadow-2xl transition-all hover:scale-[1.02] disabled:opacity-80"
                    onClick={handleSubmitTrades}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-6 sm:size-8 animate-spin" />
                    ) : (
                      <div className="flex items-center justify-between w-full px-4 sm:px-8">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <Store className="size-5 sm:size-8" />
                          <span className="text-sm sm:text-xl">DONE</span>
                        </div>
                        <div className="h-8 sm:h-10 w-px bg-white/20" />
                        <div className="flex items-center gap-2 sm:gap-4 leading-none text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] sm:text-[10px] opacity-70 mb-0.5">
                              NEXT
                            </span>
                            <span className="text-xs sm:text-xl">YEAR {current.date + 1}</span>
                          </div>
                          <ArrowRight className="size-5 sm:size-8 animate-pulse" />
                        </div>
                      </div>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>

      <EventPopup
        event={activeEvent}
        open={isEventPopupOpen}
        onClose={() => {
          setIsEventPopupOpen(false)
          if (current) markEventStepSeen(current.step)
        }}
      />
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
