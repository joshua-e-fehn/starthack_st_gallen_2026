"use client"

import { motion } from "framer-motion"
import { ArrowDown, ArrowUp } from "lucide-react"
import Image from "next/image"
import { type AssetKey, formatTaler, lineConfig } from "@/lib/game/ui"

type GoodsMeta = {
  key: AssetKey
  name: string
  icon: string
  colorClass: string
}

export function GameAssetCard({
  meta,
  value,
  opacity,
  tradeDeltaRaw,
  holding,
  onClick,
  disabled,
  isGuideActiveOnCard,
  isDimmedByGuide,
  prefersReducedMotion,
}: {
  meta: GoodsMeta
  value: number
  opacity: number
  tradeDeltaRaw: number
  holding: number
  onClick: () => void
  disabled: boolean
  isGuideActiveOnCard: boolean
  isDimmedByGuide: boolean
  prefersReducedMotion: boolean
}) {
  const isTradeDeltaPositive = tradeDeltaRaw > 0
  const hasTradeDelta = tradeDeltaRaw !== 0
  const tradeDeltaLabel =
    meta.key === "taler"
      ? `${isTradeDeltaPositive ? "+" : ""}${formatTaler(tradeDeltaRaw)}`
      : `${isTradeDeltaPositive ? "+" : ""}${tradeDeltaRaw}`
  const tradeDeltaColor = lineConfig[meta.key].color

  return (
    <button
      type="button"
      key={meta.key}
      onClick={onClick}
      className={`flex h-full flex-col justify-end text-left ${isDimmedByGuide ? "opacity-70" : "opacity-100"}`}
      disabled={disabled}
    >
      <motion.div
        className={`relative flex h-55 flex-col justify-end overflow-hidden rounded-lg border border-white/70 ${isGuideActiveOnCard ? "ring-2 ring-offset-1" : ""}`}
        style={
          isGuideActiveOnCard
            ? {
                borderColor: lineConfig[meta.key].color,
              }
            : undefined
        }
        animate={
          isGuideActiveOnCard && !prefersReducedMotion
            ? {
                scale: [1, 1.04, 1],
                boxShadow: [
                  `0 0 0 0 ${lineConfig[meta.key].color}`,
                  `0 0 26px 0 ${lineConfig[meta.key].color}`,
                  `0 0 0 0 ${lineConfig[meta.key].color}`,
                ],
              }
            : undefined
        }
        transition={
          isGuideActiveOnCard && !prefersReducedMotion
            ? {
                duration: 1.4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }
            : undefined
        }
      >
        <div className={`absolute inset-0 ${meta.colorClass}`} style={{ opacity: 0.15 }} />
        {isGuideActiveOnCard ? (
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent 18%, ${lineConfig[meta.key].color} 50%, transparent 82%)`,
              opacity: 0.35,
              backgroundSize: "230% 100%",
            }}
            animate={
              prefersReducedMotion ? undefined : { backgroundPosition: ["-140% 0%", "140% 0%"] }
            }
            transition={
              prefersReducedMotion
                ? undefined
                : {
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }
            }
          />
        ) : null}
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
              {meta.key === "taler" ? formatTaler(holding) : holding}
            </p>
          </div>
        </div>
      </motion.div>
      <div className="mt-1">
        <p className="text-center text-sm font-medium">
          {formatTaler(value)}
          <br /> Talers
        </p>
      </div>
    </button>
  )
}
