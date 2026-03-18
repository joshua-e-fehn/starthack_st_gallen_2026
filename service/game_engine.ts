import { Assets } from "../lib/types/assets"
import { Market } from "../lib/types/market"

export class GameEngine {
  assets: Assets | null = null
  market: Market | null = null

  constructor() {}

  startGame() {
    this.assets = new Assets()
    this.market = new Market(10.0, 5.0, 2.0, 4.0) // Example initial prices
  }

  nextRound() {
    // Processes the next round/step
  }
}
