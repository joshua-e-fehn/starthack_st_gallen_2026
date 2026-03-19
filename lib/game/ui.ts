import type { TradableAsset } from "@/lib/types/assets"

export type AssetKey = TradableAsset | "taler"
export type GuideStep = "farm" | TradableAsset | "submit"

export const GAME_GUIDE_COOKIE_NAME = "game_onboarding_seen"
export const GAME_GUIDE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
export const GUIDE_ASSET_SEQUENCE: TradableAsset[] = ["wood", "potatoes", "fish"]

export const goodsMeta: Array<{
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

export const lineConfig = {
  taler: { color: "oklch(0.84 0.18 93)", label: "Taler" },
  wood: { color: "oklch(0.42 0.07 43)", label: "Wood" },
  potatoes: { color: "oklch(0.56 0.21 33)", label: "Potatoes" },
  fish: { color: "oklch(0.78 0.08 236)", label: "Fish" },
  totalValue: { color: "oklch(0.72 0.18 150)", label: "Total Value" },
}

export const priceChartConfig = {
  talerBalance: { label: "Taler", color: lineConfig.taler.color },
  woodValue: { label: "Wood Value", color: lineConfig.wood.color },
  potatoesValue: { label: "Potatoes Value", color: lineConfig.potatoes.color },
  fishValue: { label: "Fish Value", color: lineConfig.fish.color },
  totalValue: { label: "Total Value", color: lineConfig.totalValue.color },
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}

export function formatTaler(n: number) {
  return `${new Intl.NumberFormat("de-CH").format(Math.round(n * 100) / 100)}`
}

export function getCookieValue(name: string) {
  if (typeof document === "undefined") return null
  const cookie = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
  if (!cookie) return null
  return decodeURIComponent(cookie.slice(name.length + 1))
}

export function setCookieValue(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return
  // biome-ignore lint/suspicious/noDocumentCookie: onboarding progress is intentionally stored in a client cookie.
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}`
}

export function mapYToTrade(y: number, height: number, maxBuy: number, maxSell: number) {
  const center = height / 2
  const cappedY = clamp(y, 0, height)
  if (cappedY <= center) {
    const ratio = (center - cappedY) / center
    return Math.round(ratio * maxBuy)
  }
  const ratio = (cappedY - center) / center
  return -Math.round(ratio * maxSell)
}

export function mapTradeToY(value: number, height: number, maxBuy: number, maxSell: number) {
  const center = height / 2
  if (value >= 0) {
    if (maxBuy === 0) return center
    return center - (value / maxBuy) * center
  }
  if (maxSell === 0) return center
  return center + (Math.abs(value) / maxSell) * center
}
