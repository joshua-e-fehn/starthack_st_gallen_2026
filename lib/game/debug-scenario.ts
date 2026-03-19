import type { Scenario } from "../types/scenario"

/**
 * A hardcoded scenario for development / debug purposes.
 * Uses realistic-ish parameters that produce visible market movement.
 */
export const DEBUG_SCENARIO: Scenario = {
  id: "debug-001",
  name: "Debug Scenario",
  description: "A test scenario with moderate parameters for engine debugging.",
  mode: "live",
  startCapital: 100,
  recurringRevenue: 25,
  startYear: 1400,
  endYear: 1430, // 30 steps (years)
  buyFactor: 1.02,
  sellFactor: 0.97,
  inflationReturn: 0.02, // 2% per year
  inflationVolatility: 0.01,
  market: {
    warToPeaceProbability: 0.25,
    peaceToWarProbability: 0.1,
    peaceReturn: 0.08, // 8% per year in peace
    warReturn: -0.06, // -6% per year in war
    peaceVolatility: 0.05,
    warVolatility: 0.05,
  },
  assets: {
    wood: {
      startPrice: 10,
      priceReturn: 0.02, // 2% annual real — ETF-like
      priceVolatility: 0.1,
      event: {
        type: "fire",
        name: "Fire",
        description: "A fire broke out and destroyed part of the timber reserves!",
        probability: 0.05,
        quantityMultiplier: 0.9,
        priceMultiplier: 1.0,
      },
    },
    potatoes: {
      startPrice: 5,
      priceReturn: 0.05, // 5% annual real — stock-like
      priceVolatility: 0.1,
      event: {
        type: "mice_infestation",
        name: "Mice Infestation",
        description: "Mice ravaged the potato stores!",
        probability: 0.06,
        quantityMultiplier: 0.8,
        priceMultiplier: 1.0,
      },
    },
    fish: {
      startPrice: 20,
      priceReturn: 0.1, // 10% annual real — crypto-like
      priceVolatility: 0.5,
      event: {
        type: "cooling_failure",
        name: "Cooling Failure",
        description: "The ice house failed — fish stocks spoiled!",
        probability: 0.07,
        quantityMultiplier: 0.7,
        priceMultiplier: 1.0,
      },
    },
  },
  globalEvents: [],
  goalAmount: 500,
}
