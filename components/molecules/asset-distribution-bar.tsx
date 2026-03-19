"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

export type AssetBreakdown = {
  gold: number
  wood: number
  potatoes: number
  fish: number
  total: number
}

type AssetKey = "gold" | "wood" | "potatoes" | "fish"

type AssetMeta = {
  key: AssetKey
  label: string
  colorClass: string
  colorHex: string
}

const ASSETS: AssetMeta[] = [
  { key: "gold", label: "Taler", colorClass: "bg-yellow-400", colorHex: "#facc15" },
  { key: "wood", label: "Wood", colorClass: "bg-amber-700", colorHex: "#b45309" },
  { key: "potatoes", label: "Potatoes", colorClass: "bg-orange-500", colorHex: "#f97316" },
  { key: "fish", label: "Fish", colorClass: "bg-sky-500", colorHex: "#0ea5e9" },
]

function formatValue(value: number): string {
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(Math.round(value))
}

export function AssetDistributionBar({
  breakdown,
  className,
  scalePercent = 100,
  showDetails = true,
}: {
  breakdown: AssetBreakdown
  className?: string
  scalePercent?: number
  showDetails?: boolean
}) {
  const segments = useMemo(() => {
    const total = Math.max(0, breakdown.total)
    const all = ASSETS.map((asset) => {
      const value = Math.max(0, breakdown[asset.key])
      return {
        ...asset,
        value,
        percent: total > 0 ? (value / total) * 100 : 0,
      }
    })

    const used = all.filter((segment) => segment.value > 0)
    const forGradient = used.length > 0 ? used : all
    let cursor = 0
    const gradientStops = forGradient.map((segment) => {
      const from = cursor
      const to = Math.min(100, from + segment.percent)
      cursor = to
      return `${segment.colorHex} ${from.toFixed(2)}% ${to.toFixed(2)}%`
    })

    return {
      all,
      gradient:
        gradientStops.length > 0
          ? `linear-gradient(90deg, ${gradientStops.join(", ")})`
          : "linear-gradient(90deg, #e5e7eb 0% 100%)",
    }
  }, [breakdown])

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="h-2.5 w-full overflow-hidden rounded-full border border-border/60 bg-muted/60">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(4, Math.min(100, scalePercent))}%`,
            backgroundImage: segments.gradient,
          }}
        />
      </div>
      {showDetails && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {segments.all
            .filter((segment) => segment.value > 0)
            .map((segment) => (
              <span key={segment.key} className="flex items-center gap-1 text-[10px]">
                <span className={cn("size-2 rounded-full", segment.colorClass)} aria-hidden />
                <span className="text-muted-foreground">{segment.label}</span>
                <span className="font-mono tabular-nums text-foreground">
                  {segment.percent.toFixed(1)}% · {formatValue(segment.value)}
                </span>
              </span>
            ))}
        </div>
      )}
    </div>
  )
}
