"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Coins,
  History,
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
import { useRouter } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"

import { GameChatbot } from "@/components/molecules/game-chatbot"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"
import { DEBUG_SCENARIO } from "@/lib/game/debug-scenario"
import { gameStep, initializeGame, portfolioValue } from "@/lib/game/engine"
import type { PlayerAction } from "@/lib/types/actions"
import type { TradableAsset } from "@/lib/types/assets"
import { TRADABLE_ASSET_KEYS } from "@/lib/types/assets"
import { buyPrice, nominalPrice, sellPrice } from "@/lib/types/market"
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

// ─── Helpers ─────────────────────────────────────────────────────

function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}

function formatTaler(n: number) {
  return `${new Intl.NumberFormat("de-CH").format(Math.round(n * 100) / 100)}`
}

// ─── Trade Mapping Helpers ──────────────────────────

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

  if (isMobile) {
    return (
      <Card
        className={cn(
          "overflow-hidden border-2 transition-all",
          isExpanded ? "ring-2 ring-primary/20 border-primary/20" : "border-border/50",
        )}
        style={{ backgroundColor: `${assetColor}15` }}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2 bg-white shadow-sm flex-shrink-0">
              <Image src={meta.icon} alt="" width={32} height={32} className="object-contain" />
            </div>

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
                      className="absolute top-1/2 z-20 h-10 w-10 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-white shadow-md flex items-center justify-center"
                      style={{ left: `${mapTradeToX(tradeQty, 100, maxBuy, maxSell)}%` }}
                      animate={{ scale: isDragging ? 1.15 : 1 }}
                    >
                      <div
                        className="absolute inset-1 rounded-full"
                        style={{ backgroundColor: assetColor }}
                      />
                    </motion.div>

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

            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full flex-shrink-0"
              onClick={() => setExpandedAsset(isExpanded ? null : assetKey)}
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

// ─── Dojo Trainingscamp Component ────────────────────────────────

export default function DojoPage() {
  const router = useRouter()
  const isMobile = useIsMobile()

  // ─── Local Game State ───────────────────────────────────────
  const [history, setHistory] = useState<StateVector[]>(() => [initializeGame(DEBUG_SCENARIO)])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tradePlan, setTradePlan] = useState<Record<TradableAsset, number>>({
    wood: 0,
    potatoes: 0,
    fish: 0,
  })
  const [expandedAsset, setExpandedAsset] = useState<TradableAsset | null>(null)

  const current = history[history.length - 1]
  const portfolio = current.portfolio
  const market = current.market
  const inflation = market.inflation

  const getBuyPriceFor = useCallback(
    (asset: TradableAsset) => buyPrice(market.prices[asset], inflation),
    [market, inflation],
  )

  const getSellPriceFor = useCallback(
    (asset: TradableAsset) => sellPrice(market.prices[asset], inflation),
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

  const totalValue = portfolioValue(projectedPortfolio, market)

  const allocationData = useMemo(() => {
    return [
      { name: "Taler", value: totalAssetValue.taler, color: lineConfig.taler.color },
      { name: "Wood", value: totalAssetValue.wood, color: lineConfig.wood.color },
      { name: "Potatoes", value: totalAssetValue.potatoes, color: lineConfig.potatoes.color },
      { name: "Fish", value: totalAssetValue.fish, color: lineConfig.fish.color },
    ].filter((d) => d.value > 0)
  }, [totalAssetValue])

  const gameOver = current.date >= DEBUG_SCENARIO.endYear

  const handleNextYear = async () => {
    if (gameOver || isSubmitting) return
    setIsSubmitting(true)

    // Wait a tiny bit for effect
    await new Promise((r) => setTimeout(r, 600))

    const actions: PlayerAction[] = []
    for (const asset of TRADABLE_ASSET_KEYS) {
      const qty = tradePlan[asset]
      if (qty > 0) actions.push({ type: "buy", asset, quantity: qty })
      if (qty < 0) actions.push({ type: "sell", asset, quantity: Math.abs(qty) })
    }

    const nextState = await gameStep(DEBUG_SCENARIO, current, actions)
    setHistory((prev) => [...prev, nextState])
    setTradePlan({ wood: 0, potatoes: 0, fish: 0 })
    setIsSubmitting(false)
  }

  const [goalAnimation, setGoalAnimation] = useState<"reached" | "lost" | null>(null)
  useEffect(() => {
    const isReached = current.goalReached
    // Simple state tracking without ref for local mode
    if (history.length > 1) {
      const prev = history[history.length - 2]
      if (!prev.goalReached && isReached) {
        setGoalAnimation("reached")
        setTimeout(() => setGoalAnimation(null), 3000)
      } else if (prev.goalReached && !isReached) {
        setGoalAnimation("lost")
        setTimeout(() => setGoalAnimation(null), 3000)
      }
    }
  }, [current.goalReached, history])

  return (
    <main className={cn("mx-auto w-full max-w-5xl px-4 py-4 sm:px-6", isMobile && "space-y-4")}>
      <TooltipProvider>
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => router.push("/learn")}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-primary leading-none">
              Dojo
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Training Camp
            </p>
          </div>
        </div>

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
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-10">
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
                    <h1 className="text-4xl lg:text-5xl font-black tabular-nums tracking-tighter text-[#1A1A1A]">
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

                <div
                  className={cn(
                    "flex wood-board items-center",
                    isMobile
                      ? "w-full justify-between gap-4 p-4 rounded-2xl"
                      : "flex-col lg:flex-row gap-4 lg:gap-10 p-6 rounded-[3rem] shadow-2xl",
                  )}
                >
                  <div
                    className={cn(
                      "grid grid-cols-2 gap-px bg-muted/10 rounded-xl lg:rounded-3xl overflow-hidden border border-muted shadow-xs lg:shadow-md",
                      isMobile ? "flex-shrink-0" : "flex-1",
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
                              isMobile ? "p-2 min-w-0" : "p-4 min-w-[140px]",
                            )}
                          >
                            <div
                              className={cn(
                                "rounded-lg lg:rounded-2xl shadow-xs",
                                isMobile ? "p-1 flex-shrink-0" : "p-2",
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

              <div
                className={cn(
                  "flex items-end justify-between px-2 pt-2 lg:pt-4",
                  !isMobile && "border-t border-muted/20",
                )}
              >
                <div className="flex flex-col gap-0 lg:gap-1">
                  <div className="flex items-center gap-2">
                    <Wallet className="size-3 lg:size-4 text-muted-foreground/60" />
                    <span className="text-[9px] lg:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                      Portfolio Value
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 lg:gap-2">
                    <span className="text-2xl lg:text-3xl font-black tabular-nums text-[#1A1A1A]">
                      {formatTaler(totalValue)}
                    </span>
                    {!isMobile && (
                      <span className="text-xs font-black uppercase text-[#1A1A1A]/60">taler</span>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-0 lg:space-y-1">
                  <div className="flex items-center justify-end gap-2 text-[#FFD700]">
                    <Trophy className="size-3 lg:size-4" />
                    <span className="text-[9px] lg:text-xs font-black uppercase tracking-[0.2em]">
                      Target
                    </span>
                  </div>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-lg lg:text-2xl font-black text-[#FFD700] drop-shadow-sm">
                      {formatTaler(current.goal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative group lg:-mx-2">
                <div
                  className={cn(
                    "w-full overflow-hidden rounded-full border-white bg-white shadow-md lg:shadow-lg",
                    isMobile ? "h-2 border" : "h-4 border-2",
                  )}
                >
                  <div className="h-full w-full rounded-full overflow-hidden bg-muted/10 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (totalValue / current.goal) * 100)}%` }}
                      className="h-full transition-all duration-1000 ease-out bg-[#FFD700]"
                    />

                    {totalValue >= current.goal && (
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: "200%" }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                        className="absolute inset-0 z-10 w-1/2 bg-linear-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg]"
                      />
                    )}
                  </div>
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
                        className="px-4 py-1.5 text-xs font-black uppercase tracking-widest shadow-lg shadow-destructive/20 ring-4 ring-destructive/10"
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

          {/* Footer Action */}
          <div className="sticky bottom-4 z-40 px-4 sm:px-0">
            <div className="group relative">
              <div className="absolute -inset-1 rounded-2xl bg-linear-to-r from-primary to-amber-500 opacity-25 blur-lg transition duration-1000 group-hover:opacity-50 group-hover:duration-200" />

              {gameOver ? (
                <Button
                  type="button"
                  className="relative h-16 sm:h-20 w-full rounded-2xl bg-green-600 text-xl sm:text-2xl font-black tracking-widest shadow-2xl transition-all hover:bg-green-700 hover:scale-[1.02]"
                  onClick={() => router.push("/learn")}
                >
                  <Trophy className="mr-4 size-6 sm:size-8" />
                  FINISH TRAINING
                </Button>
              ) : (
                <Button
                  type="button"
                  className="relative h-14 sm:h-20 w-full rounded-2xl text-base sm:text-2xl font-black tracking-widest shadow-2xl transition-all hover:scale-[1.02] disabled:opacity-80"
                  onClick={handleNextYear}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="size-6 sm:size-8 animate-spin" />
                  ) : (
                    <div className="flex items-center justify-between w-full px-4 sm:px-8">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <Store className="size-5 sm:size-8" />
                        <span className="text-sm sm:text-xl font-black">DONE</span>
                      </div>
                      <div className="h-8 sm:h-10 w-px bg-white/20" />
                      <div className="flex items-center gap-2 sm:gap-4 leading-none text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] sm:text-[10px] opacity-70 mb-0.5">NEXT</span>
                          <div className="flex items-center gap-1 sm:gap-1.5 font-black">
                            <Calendar className="size-3 sm:size-4 opacity-70" />
                            <span className="text-base sm:text-xl uppercase">YEAR</span>
                          </div>
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
      </TooltipProvider>

      <GameChatbot />
    </main>
  )
}
