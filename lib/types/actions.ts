import type { TradableAsset } from "./assets"

/** A single player action: buy or sell a quantity of a tradable asset */
export type PlayerAction = {
  type: "buy" | "sell"
  asset: TradableAsset
  quantity: number
}
