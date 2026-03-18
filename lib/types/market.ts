export class Market {
  goldPrice: number
  woodPrice: number
  vegetablesPrice: number
  fishPrice: number

  constructor(goldPrice: number, woodPrice: number, vegetablesPrice: number, fishPrice: number) {
    this.goldPrice = goldPrice
    this.woodPrice = woodPrice
    this.vegetablesPrice = vegetablesPrice
    this.fishPrice = fishPrice
  }
}
