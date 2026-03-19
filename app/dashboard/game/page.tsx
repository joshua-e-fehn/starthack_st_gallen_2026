"use client"

import { ArrowDown, ArrowUp, Minus, Plus, RotateCcw } from "lucide-react"
import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
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

type TradableAsset = "wood" | "potatoes" | "fish"
type AssetKey = TradableAsset | "taler"

type Holdings = Record<TradableAsset, number>
type TradePlan = Record<TradableAsset, number>
type Prices = Record<TradableAsset, number>

type PriceSnapshot = {
  step: number
  taler: number
  wood: number
  potatoes: number
  fish: number
}

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
}

const priceChartConfig = {
  wood: { label: "Wood", color: lineConfig.wood.color },
  potatoes: { label: "Potatoes", color: lineConfig.potatoes.color },
  fish: { label: "Fish", color: lineConfig.fish.color },
} satisfies ChartConfig

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function priceForAsset(prices: Prices, key: TradableAsset) {
  return prices[key]
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100
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
    if (maxBuy === 0) {
      return center
    }
    const ratio = value / maxBuy
    return center - ratio * center
  }

  if (maxSell === 0) {
    return center
  }

  const ratio = Math.abs(value) / maxSell
  return center + ratio * center
}

function MiniPriceGraph({ data }: { data: PriceSnapshot[] }) {
  const keys: TradableAsset[] = ["wood", "potatoes", "fish"]
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, data.length - 1))

  useEffect(() => {
    setSelectedIndex(Math.max(0, data.length - 1))
  }, [data.length])

  const safeSelectedIndex = clamp(selectedIndex, 0, Math.max(0, data.length - 1))
  const selectedPoint = data[safeSelectedIndex]

  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <ChartContainer config={priceChartConfig} className="h-56 w-full">
        <AreaChart
          data={data}
          onClick={(state) => {
            const activeIndex = state?.activeTooltipIndex
            if (typeof activeIndex === "number") {
              setSelectedIndex(activeIndex)
            }
          }}
          margin={{ top: 12, right: 10, left: -10, bottom: 0 }}
        >
          <defs>
            {keys.map((key) => (
              <linearGradient key={`fill-${key}`} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineConfig[key].color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={lineConfig[key].color} stopOpacity={0.03} />
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
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={42} />
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
                      {Number(value).toLocaleString("de-CH")}
                    </span>
                  </div>
                )}
              />
            }
          />

          {selectedPoint ? (
            <ReferenceLine
              x={selectedPoint.step}
              stroke="currentColor"
              strokeOpacity={0.22}
              strokeDasharray="5 5"
            />
          ) : null}

          {keys.map((key) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={lineConfig[key].label}
              stroke={lineConfig[key].color}
              strokeWidth={2.5}
              fill={`url(#fill-${key})`}
              activeDot={{ r: 6 }}
              dot={{
                r: 2.5,
                strokeWidth: 1.2,
                fill: lineConfig[key].color,
              }}
            />
          ))}

          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

export default function Game() {
  const [taler, setTaler] = useState(120)
  const [holdings, setHoldings] = useState<Holdings>({
    wood: 4,
    potatoes: 3,
    fish: 2,
  })
  const [prices, setPrices] = useState<Prices>({
    wood: 12,
    potatoes: 9,
    fish: 15,
  })
  const [tradePlan, setTradePlan] = useState<TradePlan>({
    wood: 0,
    potatoes: 0,
    fish: 0,
  })
  const [priceHistory, setPriceHistory] = useState<PriceSnapshot[]>([
    { step: 1, taler: 1, wood: 12, potatoes: 9, fish: 15 },
    { step: 2, taler: 1, wood: 13, potatoes: 8.8, fish: 16 },
    { step: 3, taler: 1, wood: 11.5, potatoes: 9.4, fish: 14.6 },
    { step: 4, taler: 1, wood: 12.8, potatoes: 10.2, fish: 13.8 },
  ])
  const [eventLog, setEventLog] = useState<string[]>([])

  const [selectedAsset, setSelectedAsset] = useState<TradableAsset | null>(null)
  const [draftTradeValue, setDraftTradeValue] = useState(0)

  const [isDraggingTradeBar, setIsDraggingTradeBar] = useState(false)
  const tradeBarRef = useRef<HTMLDivElement | null>(null)

  const totalAssetValue = useMemo(() => {
    return {
      taler,
      wood: roundMoney(holdings.wood * prices.wood),
      potatoes: roundMoney(holdings.potatoes * prices.potatoes),
      fish: roundMoney(holdings.fish * prices.fish),
    }
  }, [holdings, prices, taler])

  const maxAssetValue = useMemo(() => {
    return Math.max(...Object.values(totalAssetValue), 1)
  }, [totalAssetValue])

  const selectedPrice = selectedAsset ? priceForAsset(prices, selectedAsset) : 0

  const tradeCostExcludingSelected = useMemo(() => {
    if (!selectedAsset) {
      return 0
    }

    return (Object.keys(tradePlan) as TradableAsset[])
      .filter((asset) => asset !== selectedAsset)
      .reduce((sum, asset) => {
        return sum + tradePlan[asset] * priceForAsset(prices, asset)
      }, 0)
  }, [prices, selectedAsset, tradePlan])

  const maxBuy = useMemo(() => {
    if (!selectedAsset || selectedPrice <= 0) {
      return 0
    }

    const freeCash = taler - tradeCostExcludingSelected
    return Math.max(0, Math.floor(freeCash / selectedPrice))
  }, [selectedAsset, selectedPrice, taler, tradeCostExcludingSelected])

  const maxSell = useMemo(() => {
    if (!selectedAsset) {
      return 0
    }
    return holdings[selectedAsset]
  }, [holdings, selectedAsset])

  const currentTradeClamp = useMemo(() => {
    return clamp(draftTradeValue, -maxSell, maxBuy)
  }, [draftTradeValue, maxBuy, maxSell])

  const projectedHolding = useMemo(() => {
    if (!selectedAsset) {
      return 0
    }
    return holdings[selectedAsset] + currentTradeClamp
  }, [holdings, selectedAsset, currentTradeClamp])

  const selectedMeta = useMemo(() => {
    if (!selectedAsset) {
      return null
    }
    return goodsMeta.find((meta) => meta.key === selectedAsset) ?? null
  }, [selectedAsset])

  const buyDelta = Math.max(0, currentTradeClamp)
  const sellDelta = Math.max(0, -currentTradeClamp)
  const projectedAssetValue = roundMoney(projectedHolding * selectedPrice)
  const projectedTalerBalance = useMemo(() => {
    const selectedTradeCost = currentTradeClamp * selectedPrice
    return roundMoney(taler - tradeCostExcludingSelected - selectedTradeCost)
  }, [currentTradeClamp, selectedPrice, taler, tradeCostExcludingSelected])
  const projectedTalerDelta = roundMoney(projectedTalerBalance - taler)
  const plannedTalerDelta = useMemo(() => {
    const plannedTradeCost = (Object.keys(tradePlan) as TradableAsset[]).reduce((sum, asset) => {
      return sum + tradePlan[asset] * priceForAsset(prices, asset)
    }, 0)

    return roundMoney(-plannedTradeCost)
  }, [prices, tradePlan])
  const selectedAssetColor = selectedAsset
    ? lineConfig[selectedAsset].color
    : "oklch(0.62 0.14 228)"
  const currentYear = priceHistory.length

  function openTradeModal(asset: TradableAsset) {
    setSelectedAsset(asset)
    setDraftTradeValue(tradePlan[asset])
  }

  function closeTradeModal() {
    setSelectedAsset(null)
    setIsDraggingTradeBar(false)
  }

  function onPointerUpdate(clientY: number) {
    if (!tradeBarRef.current) {
      return
    }

    const rect = tradeBarRef.current.getBoundingClientRect()
    const y = clamp(clientY - rect.top, 0, rect.height)
    setDraftTradeValue(mapYToTrade(y, rect.height, maxBuy, maxSell))
  }

  useEffect(() => {
    if (!selectedAsset) {
      return
    }

    setTradePlan((previous) => {
      if (previous[selectedAsset] === currentTradeClamp) {
        return previous
      }

      return {
        ...previous,
        [selectedAsset]: currentTradeClamp,
      }
    })
  }, [currentTradeClamp, selectedAsset])

  function rollNextTimeframe() {
    let nextTaler = taler
    const nextHoldings: Holdings = { ...holdings }

    ;(Object.keys(tradePlan) as TradableAsset[]).forEach((asset) => {
      const planned = tradePlan[asset]
      if (planned === 0) {
        return
      }

      const price = priceForAsset(prices, asset)

      if (planned > 0) {
        const affordable = Math.min(planned, Math.floor(nextTaler / price))
        nextHoldings[asset] += affordable
        nextTaler -= affordable * price
      } else {
        const sellQty = Math.min(Math.abs(planned), nextHoldings[asset])
        nextHoldings[asset] -= sellQty
        nextTaler += sellQty * price
      }
    })

    const rolledPrices: Prices = {
      wood: roundMoney(Math.max(1, prices.wood * (0.82 + Math.random() * 0.36))),
      potatoes: roundMoney(Math.max(1, prices.potatoes * (0.78 + Math.random() * 0.4))),
      fish: roundMoney(Math.max(1, prices.fish * (0.7 + Math.random() * 0.5))),
    }

    const events = [
      "Good harvest reduced potato volatility this turn.",
      "River tolls increased fish transport costs.",
      "Royal lumber demand pushed wood prices up.",
      "Traveling merchant brought rare fish supply.",
    ]

    const randomEvent = events[Math.floor(Math.random() * events.length)]

    setTaler(roundMoney(nextTaler))
    setHoldings(nextHoldings)
    setPrices(rolledPrices)
    setTradePlan({ wood: 0, potatoes: 0, fish: 0 })
    setEventLog((previous) => [`Year ${priceHistory.length + 1}: ${randomEvent}`, ...previous])
    setPriceHistory((previous) => [
      ...previous,
      {
        step: previous.length + 1,
        taler: 1,
        wood: rolledPrices.wood,
        potatoes: rolledPrices.potatoes,
        fish: rolledPrices.fish,
      },
    ])
  }

  const indicatorY = mapTradeToY(currentTradeClamp, 220, maxBuy, maxSell)

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {goodsMeta.map((meta) => {
            const value = totalAssetValue[meta.key]
            const opacity = value / maxAssetValue
            const tradeDelta = meta.key === "taler" ? plannedTalerDelta : tradePlan[meta.key]
            const hasTradeDelta = tradeDelta !== 0
            const isTradeDeltaPositive = tradeDelta > 0
            const tradeDeltaLabel =
              meta.key === "taler"
                ? `${isTradeDeltaPositive ? "+" : ""}${roundMoney(tradeDelta).toLocaleString("de-CH")}`
                : `${isTradeDeltaPositive ? "+" : ""}${tradeDelta}`
            const tradeDeltaColor = lineConfig[meta.key].color

            return (
              <button
                type="button"
                key={meta.key}
                onClick={() => {
                  if (meta.key !== "taler") {
                    openTradeModal(meta.key)
                  }
                }}
                className="flex h-full flex-col justify-end text-left"
              >
                <div className="flex h-55 flex-col justify-end relative rounded-lg border border-white/70 overflow-hidden">
                  {/* Background layer - full height with low opacity */}
                  <div
                    className={`absolute inset-0 ${meta.colorClass}`}
                    style={{ opacity: 0.15 }}
                  />

                  {/* Colored fill layer - rises proportionally */}
                  <div
                    className={`absolute bottom-0 w-full transition-all ${meta.colorClass}`}
                    style={{ height: `${Math.max(20, opacity * 100)}%` }}
                  />

                  {hasTradeDelta ? (
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-xs font-semibold shadow-sm">
                      {isTradeDeltaPositive ? (
                        <ArrowUp className="size-3.5" style={{ color: tradeDeltaColor }} />
                      ) : (
                        <ArrowDown className="size-3.5" style={{ color: tradeDeltaColor }} />
                      )}
                      <span style={{ color: tradeDeltaColor }}>{tradeDeltaLabel}</span>
                    </div>
                  ) : null}

                  {/* Content layer - icon and text on top */}
                  <div className="absolute inset-0 flex w-full items-end justify-center">
                    <div className="flex flex-col items-center w-full py-3 pb-3">
                      <Image
                        src={meta.icon}
                        alt={meta.name}
                        width={56}
                        height={56}
                        className="object-contain"
                      />
                      <p className="font-mono text-xl font-black leading-none text-white drop-shadow-sm">
                        {meta.key === "taler" ? taler : holdings[meta.key]}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-1">
                  <p className="text-sm text-center font-medium">
                    {value.toLocaleString("de-CH")}
                    <br /> Talers
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Year {currentYear}</CardTitle>
            <CardDescription>
              Combined price development of taler, wood, potatoes, and fish.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MiniPriceGraph data={priceHistory} />
          </CardContent>
        </Card>

        <Button type="button" className="h-12 w-full text-base" onClick={rollNextTimeframe}>
          Done trading &amp; roll events
        </Button>
      </div>

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
                onClick={() => {
                  setDraftTradeValue(0)
                }}
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
            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">Price</div>
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
                  <span>{selectedPrice.toLocaleString("de-CH")} taler</span>
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
                  <span>{projectedTalerBalance.toLocaleString("de-CH")} taler</span>
                  {projectedTalerDelta !== 0 ? (
                    <span
                      className={projectedTalerDelta > 0 ? "text-emerald-700" : "text-rose-700"}
                    >
                      ({projectedTalerDelta > 0 ? "+" : ""}
                      {projectedTalerDelta.toLocaleString("de-CH")})
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mb-4 space-y-3">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border bg-emerald-500/10 px-3 py-2 text-sm transition-colors hover:bg-emerald-500/15"
                onClick={() => {
                  setDraftTradeValue((v) => clamp(v + 1, -maxSell, maxBuy))
                }}
                aria-label="Increase acquired goods by one"
              >
                <div className="flex items-center gap-2 font-semibold text-emerald-700">
                  <Plus className="size-4" />
                  <span>Acquired</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">
                    {roundMoney(buyDelta * selectedPrice).toLocaleString("de-CH")} taler
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
                  if (!isDraggingTradeBar) {
                    return
                  }
                  onPointerUpdate(event.clientY)
                }}
                onPointerUp={() => {
                  setIsDraggingTradeBar(false)
                }}
                onPointerLeave={() => {
                  setIsDraggingTradeBar(false)
                }}
              >
                <div className="absolute inset-0 overflow-hidden rounded-xl">
                  <div className="h-1/2 w-full bg-linear-to-b from-emerald-500/20 via-emerald-500/10 to-background/60" />
                  <div className="h-1/2 w-full bg-linear-to-t from-rose-500/20 via-rose-500/10 to-background/60" />
                </div>

                <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-muted-foreground/30" />

                <div className="absolute top-2 bottom-2 left-1/2 z-10 w-32 -translate-x-1/2 overflow-hidden rounded-full border border-white/60 bg-background/60 shadow-inner backdrop-blur-sm">
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
                  {projectedAssetValue.toLocaleString("de-CH")} taler
                </div>
                <div className="pointer-events-none absolute left-3 bottom-3 rounded-md bg-background/85 px-2 py-1 text-xs font-medium shadow-sm">
                  Sell -{sellDelta}
                </div>
                <div className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-xs font-medium shadow-sm">
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
                onClick={() => {
                  setDraftTradeValue((v) => clamp(v - 1, -maxSell, maxBuy))
                }}
                aria-label="Increase sold goods by one"
              >
                <div className="flex items-center gap-2 font-semibold text-rose-700">
                  <Minus className="size-4" />
                  <span>Sold</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">
                    {roundMoney(sellDelta * selectedPrice).toLocaleString("de-CH")} taler
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
