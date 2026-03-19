"use client"

import { useEffect, useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { portfolioValue } from "@/lib/game/engine"
import { lineConfig, priceChartConfig, roundMoney } from "@/lib/game/ui"
import { sellPrice } from "@/lib/types/market"
import type { StateVector } from "@/lib/types/state_vector"

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function GameMiniPriceGraph({ history }: { history: StateVector[] }) {
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
      <ChartContainer config={priceChartConfig satisfies ChartConfig} className="h-56 w-full">
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
