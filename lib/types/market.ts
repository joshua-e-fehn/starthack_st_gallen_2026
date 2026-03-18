export class Market {
  goldPrice: number
  woodPrice: number
  potatoesPrice: number
  fishPrice: number

  constructor(goldPrice: number, woodPrice: number, potatoesPrice: number, fishPrice: number) {
    this.goldPrice = goldPrice
    this.woodPrice = woodPrice
    this.potatoesPrice = potatoesPrice
    this.fishPrice = fishPrice
  }
}
