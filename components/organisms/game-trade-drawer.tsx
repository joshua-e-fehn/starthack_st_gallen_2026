"use client"

import { Minus, Plus, RotateCcw } from "lucide-react"
import Image from "next/image"
import { useMemo } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
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
import { formatTaler, lineConfig, roundMoney } from "@/lib/game/ui"
import type { TradableAsset } from "@/lib/types/assets"
import { nominalPrice } from "@/lib/types/market"
import type { StateVector } from "@/lib/types/state_vector"

type SelectedMeta = {
  key: TradableAsset
  name: string
  icon: string
  colorClass: string
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

export function GameTradeDrawer({
  selectedAsset,
  closeTradeModal,
  setDraftTradeValue,
  selectedMeta,
  selectedBuyPrice,
  projectedTalerBalance,
  history,
  buyDelta,
  maxSell,
  maxBuy,
  tradeBarRef,
  isDraggingTradeBar,
  setIsDraggingTradeBar,
  onPointerUpdate,
  currentTradeClamp,
  indicatorY,
  selectedAssetColor,
  projectedAssetValue,
  sellDelta,
  selectedSellPriceVal,
  projectedHolding,
  onCancel,
}: {
  selectedAsset: TradableAsset | null
  closeTradeModal: () => void
  setDraftTradeValue: React.Dispatch<React.SetStateAction<number>>
  selectedMeta: SelectedMeta | null
  selectedBuyPrice: number
  projectedTalerBalance: number
  history: StateVector[]
  buyDelta: number
  maxSell: number
  maxBuy: number
  tradeBarRef: React.RefObject<HTMLDivElement | null>
  isDraggingTradeBar: boolean
  setIsDraggingTradeBar: React.Dispatch<React.SetStateAction<boolean>>
  onPointerUpdate: (clientY: number) => void
  currentTradeClamp: number
  indicatorY: number
  selectedAssetColor: string
  projectedAssetValue: number
  sellDelta: number
  selectedSellPriceVal: number
  projectedHolding: number
  onCancel: () => void
}) {
  return (
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

        <div className="max-h-[70vh] overflow-y-auto px-4" data-vaul-no-drag>
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

          {selectedAsset && history.length > 1 ? (
            <div className="mb-4">
              <DrawerAssetHistoryGraph history={history} asset={selectedAsset} />
            </div>
          ) : null}

          <div className="space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border bg-emerald-500/10 px-3 py-2 text-sm transition-colors hover:bg-emerald-500/15"
              onClick={() => setDraftTradeValue((v) => Math.min(maxBuy, Math.max(-maxSell, v + 1)))}
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
              onClick={() => setDraftTradeValue((v) => Math.min(maxBuy, Math.max(-maxSell, v - 1)))}
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

        <div className="flex gap-2 border-t px-4 py-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onCancel()
              closeTradeModal()
            }}
            aria-label="Cancel trade"
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={() => closeTradeModal()}
            aria-label="Save trade"
          >
            Save
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
