"use client"

import Image from "next/image"
import { useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

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
  const width = 900
  const height = 280
  const pad = 24
  const keys: AssetKey[] = ["taler", "wood", "potatoes", "fish"]

  const allValues = data.flatMap((point) => keys.map((key) => point[key]))
  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const span = maxValue - minValue || 1

  const xForIndex = (index: number) => {
    if (data.length === 1) {
      return width / 2
    }
    return pad + (index / (data.length - 1)) * (width - pad * 2)
  }

  const yForValue = (value: number) => {
    const ratio = (value - minValue) / span
    return height - pad - ratio * (height - pad * 2)
  }

  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full">
        <line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke="currentColor"
          opacity="0.22"
        />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="currentColor" opacity="0.22" />

        {keys.map((key) => {
          const points = data
            .map((point, index) => `${xForIndex(index)},${yForValue(point[key])}`)
            .join(" ")

          return (
            <polyline
              key={key}
              fill="none"
              stroke={lineConfig[key].color}
              strokeWidth={3}
              strokeLinecap="round"
              points={points}
            />
          )
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {keys.map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: lineConfig[key].color }}
              aria-hidden
            />
            <span>{lineConfig[key].label}</span>
          </div>
        ))}
      </div>
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

  const projectedTaler = useMemo(() => {
    if (!selectedAsset) {
      return taler
    }

    const previous = tradePlan[selectedAsset]
    const deltaCost = (currentTradeClamp - previous) * selectedPrice
    return roundMoney(taler - deltaCost)
  }, [selectedAsset, taler, tradePlan, selectedPrice, currentTradeClamp])

  const projectedHolding = useMemo(() => {
    if (!selectedAsset) {
      return 0
    }
    return holdings[selectedAsset] + currentTradeClamp
  }, [holdings, selectedAsset, currentTradeClamp])

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

  function applyDraftTrade() {
    if (!selectedAsset) {
      return
    }

    setTradePlan((previous) => ({
      ...previous,
      [selectedAsset]: clamp(draftTradeValue, -maxSell, maxBuy),
    }))
    closeTradeModal()
  }

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
        <div className="text-lg font-semibold">&lt; Post Finance</div>

        <div className="grid grid-cols-4 gap-2">
          {goodsMeta.map((meta) => {
            const value = totalAssetValue[meta.key]
            const opacity = value / maxAssetValue
            const plannedTrade =
              meta.key === "taler"
                ? null
                : tradePlan[meta.key] === 0
                  ? null
                  : tradePlan[meta.key] > 0
                    ? `+${tradePlan[meta.key]}`
                    : String(tradePlan[meta.key])

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
                <div className="mt-1 space-y-0.5">
                  <p className="text-sm text-center font-medium">
                    {value.toLocaleString("de-CH")} Talers
                  </p>
                  {plannedTrade ? (
                    <p className="text-xs font-medium text-primary">
                      Planned trade: {plannedTrade}
                    </p>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Next Timeframe</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Log</CardTitle>
          </CardHeader>
          <CardContent>
            {eventLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events rolled yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {eventLog.slice(0, 5).map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={selectedAsset !== null} onOpenChange={(open) => !open && closeTradeModal()}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-2xl rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>
              {selectedAsset
                ? `Trade ${selectedAsset[0].toUpperCase()}${selectedAsset.slice(1)}`
                : "Trade"}
            </SheetTitle>
            <SheetDescription>
              Interactive trade bar: middle is no change, up buys, down sells.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-4">
            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">Price</div>
                <div className="font-medium">{selectedPrice.toLocaleString("de-CH")} taler</div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">Limits</div>
                <div className="font-medium">
                  Sell up to {maxSell}, buy up to {maxBuy}
                </div>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-4">
              <div className="text-xs text-muted-foreground">Buy</div>
              <div
                ref={tradeBarRef}
                className="relative h-55 flex-1 rounded-xl border bg-background"
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
                <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-muted-foreground/40" />

                {currentTradeClamp !== 0 ? (
                  <div
                    className="absolute inset-x-3 rounded-md bg-primary/25"
                    style={{
                      top: currentTradeClamp > 0 ? `${indicatorY}px` : "50%",
                      bottom: currentTradeClamp > 0 ? "50%" : `${220 - indicatorY}px`,
                    }}
                  />
                ) : null}

                <div
                  className="absolute left-2 right-2 h-2 -translate-y-1/2 rounded-full bg-primary"
                  style={{ top: `${indicatorY}px` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">Sell</div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">Trade Delta</div>
                <div className="font-medium">
                  {currentTradeClamp > 0 ? `+${currentTradeClamp}` : currentTradeClamp}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">Projected State</div>
                <div className="font-medium">
                  {projectedTaler.toLocaleString("de-CH")} taler, {projectedHolding} units
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDraftTradeValue((v) => clamp(v - 1, -maxSell, maxBuy))
                }}
              >
                Sell 1
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDraftTradeValue(0)
                }}
              >
                No Change
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDraftTradeValue((v) => clamp(v + 1, -maxSell, maxBuy))
                }}
              >
                Buy 1
              </Button>
            </div>
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline" onClick={closeTradeModal}>
                Cancel
              </Button>
            </SheetClose>
            <Button type="button" onClick={applyDraftTrade}>
              Apply Trade
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </main>
  )
}
