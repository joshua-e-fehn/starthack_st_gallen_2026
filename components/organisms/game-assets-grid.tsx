"use client"

import { GameAssetCard } from "@/components/molecules/game-asset-card"
import { type AssetKey, goodsMeta } from "@/lib/game/ui"
import type { TradableAsset } from "@/lib/types/assets"

export function GameAssetsGrid({
  totalAssetValue,
  maxAssetValue,
  tradePlan,
  plannedTalerDelta,
  portfolio,
  currentGuideAsset,
  gameOver,
  prefersReducedMotion,
  onAssetClick,
}: {
  totalAssetValue: Record<AssetKey, number>
  maxAssetValue: number
  tradePlan: Record<TradableAsset, number>
  plannedTalerDelta: number
  portfolio: { gold: number; wood: number; potatoes: number; fish: number }
  currentGuideAsset: TradableAsset | null
  gameOver: boolean
  prefersReducedMotion: boolean
  onAssetClick: (asset: TradableAsset) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {goodsMeta.map((meta) => {
        const value = totalAssetValue[meta.key]
        const opacity = value / maxAssetValue
        const tradeDeltaRaw =
          meta.key === "taler" ? plannedTalerDelta : tradePlan[meta.key as TradableAsset]

        return (
          <GameAssetCard
            key={meta.key}
            meta={meta}
            value={value}
            opacity={opacity}
            tradeDeltaRaw={tradeDeltaRaw}
            holding={meta.key === "taler" ? portfolio.gold : portfolio[meta.key as TradableAsset]}
            onClick={() => {
              if (meta.key !== "taler") onAssetClick(meta.key as TradableAsset)
            }}
            disabled={
              gameOver ||
              (meta.key !== "taler" && currentGuideAsset !== null && currentGuideAsset !== meta.key)
            }
            isGuideActiveOnCard={currentGuideAsset === meta.key}
            isDimmedByGuide={
              meta.key !== "taler" && currentGuideAsset !== null && currentGuideAsset !== meta.key
            }
            prefersReducedMotion={prefersReducedMotion}
          />
        )
      })}
    </div>
  )
}
