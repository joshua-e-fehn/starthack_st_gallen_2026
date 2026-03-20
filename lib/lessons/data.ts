/**
 * Lesson definitions for the single-player learning path.
 * Each lesson teaches a core investing concept through the medieval metaphor.
 *
 * Topics:
 * 1. Goals and the cost of inflation
 * 2. Investing is beneficial even with small amounts
 * 3. Different asset classes (ROI, volatility)
 * 4. Effects of volatility
 * 5. Long-term thinking & keeping nerves regardless of market developments
 * 6. Diversification & Risk Management
 * 7. The Farm — Surprise reward (PostFinance voucher)
 */

export type SlideChartLine = {
  key: string
  label: string
  color: string
  /** Dashed stroke for reference lines */
  dashed?: boolean
}

export type SlideChart = {
  /** Data points: each object has an `x` key (label) plus numeric keys for each line */
  data: Record<string, string | number>[]
  /** Line definitions */
  lines: SlideChartLine[]
  xKey: string
  yLabel?: string
  /** Optional suffix for Y-axis values (e.g. " gold") */
  ySuffix?: string
  /** Optional Y-axis domain [min, max] to control scaling */
  yDomain?: [number, number]
  /** Optional X-axis tick interval (show every Nth label; default: show all) */
  xInterval?: number
}

export type LessonSlide = {
  title: string
  content: string
  /** Optional hint text shown below the main content (Connie tip style) */
  tip?: string
  /** Optional line chart rendered below the content */
  chart?: SlideChart
  /** Optional image path (relative to /public) shown above the content */
  image?: string
  /** Optional large emoji displayed above the title */
  emoji?: string
}

export type Lesson = {
  id: string
  number: number
  title: string
  description: string
  icon: string
  slides: LessonSlide[]
}

// ── Compound-growth calculator ───────────────────────────────────
/**
 * Compute the future value of regular monthly contributions with compound interest.
 * @param monthlyContribution — amount invested each month (e.g. 20 CHF)
 * @param annualReturnPct     — expected annual return as a percentage (e.g. 7 for 7%)
 * @param years               — investment horizon in years
 * @returns total portfolio value (rounded to nearest integer)
 */
function futureValue(monthlyContribution: number, annualReturnPct: number, years: number): number {
  const monthlyRate = annualReturnPct / 100 / 12
  const months = years * 12
  if (monthlyRate === 0) return Math.round(monthlyContribution * months)
  // FV of annuity: PMT × ((1+r)^n − 1) / r
  return Math.round(monthlyContribution * (((1 + monthlyRate) ** months - 1) / monthlyRate))
}

/** Generate chart data points for lesson 2 (invested vs. compounded line) */
function buildCompoundChartData(
  monthly: number,
  annualReturn: number,
  maxYears: number,
  step: number,
): Record<string, string | number>[] {
  const points: Record<string, string | number>[] = []
  for (let y = 0; y <= maxYears; y += step) {
    points.push({
      year: y === 0 ? "Start" : `Yr ${y}`,
      invested: monthly * 12 * y,
      portfolio: y === 0 ? 0 : futureValue(monthly, annualReturn, y),
    })
  }
  return points
}

const COMPOUND_DATA = buildCompoundChartData(20, 10, 40, 5)

// ── Illustration data for lesson 3 (hand-crafted for pedagogical clarity) ────
// These are NOT simulation results — they are deliberately designed to clearly
// show the characteristic behavior of each risk profile over 30 years.
// Values represent cumulative % return from start.
const ILLUSTRATION: Record<string, number[]> = {
  wood: [
    0, 2, 4, 3, 5, 8, 10, 9, 12, 15, 17, 16, 19, 22, 25, 24, 27, 30, 34, 37, 40, 44, 47, 51, 55, 58,
    62, 66, 70, 75, 80,
  ],
  potatoes: [
    0, 15, -5, 30, 8, 55, 20, 75, 35, 60, 95, 50, 110, 70, 130, 80, 150, 100, 170, 120, 200, 145,
    225, 165, 250, 185, 280, 210, 310, 250, 340,
  ],
  fish: [
    0, 100, -60, 170, -50, 260, -10, 350, 40, 140, 420, 70, 380, 110, 520, 140, 310, 620, 200, 590,
    170, 680, 270, 500, 740, 300, 660, 380, 760, 480, 850,
  ],
  inflation: [
    0, -2, -4, -6, -8, -10, -12, -13, -15, -17, -18, -20, -21, -23, -24, -26, -27, -28, -30, -31,
    -33, -34, -35, -37, -38, -39, -40, -41, -42, -44, -45,
  ],
}

/** Build chart data for a single asset (31 yearly data points) */
function buildSingleAssetChart(assetKey: string): Record<string, string | number>[] {
  return ILLUSTRATION[assetKey].map((v, i) => ({
    year: `Y${i}`,
    asset: v,
  }))
}

/** Build combined chart data with all three assets */
function buildCombinedChart(): Record<string, string | number>[] {
  return Array.from({ length: 31 }, (_, i) => ({
    year: `Y${i}`,
    wood: ILLUSTRATION.wood[i],
    potatoes: ILLUSTRATION.potatoes[i],
    fish: ILLUSTRATION.fish[i],
  }))
}

/** Calm lake vs stormy sea fishing catch (10 days) for volatility lesson */
const VOLATILITY_COMPARISON: Record<string, string | number>[] = [
  { day: "Day 1", lake: 10, sea: 18 },
  { day: "Day 2", lake: 11, sea: 4 },
  { day: "Day 3", lake: 9, sea: 22 },
  { day: "Day 4", lake: 12, sea: 2 },
  { day: "Day 5", lake: 10, sea: 25 },
  { day: "Day 6", lake: 11, sea: 6 },
  { day: "Day 7", lake: 9, sea: 20 },
  { day: "Day 8", lake: 12, sea: 3 },
  { day: "Day 9", lake: 10, sea: 24 },
  { day: "Day 10", lake: 11, sea: 5 },
]

/** Volatility drag example: 100 coins through +50%/-50% cycles vs holding flat */
const VOLATILITY_DRAG_DATA: Record<string, string | number>[] = [
  { year: "Start", hold: 100, volatile: 100 },
  { year: "Yr 1", hold: 100, volatile: 50 },
  { year: "Yr 2", hold: 100, volatile: 75 },
  { year: "Yr 3", hold: 100, volatile: 37 },
  { year: "Yr 4", hold: 100, volatile: 56 },
]

/** "Sell vs Hold" chart: panic seller locks in loss, patient holder recovers */
const SELL_VS_HOLD_DATA: Record<string, string | number>[] = [
  { year: "Yr 0", hold: 100, sell: 100 },
  { year: "Yr 1", hold: 110, sell: 110 },
  { year: "Yr 2", hold: 80, sell: 80 },
  { year: "Yr 3", hold: 70, sell: 70 },
  { year: "Yr 4", hold: 85, sell: 70 },
  { year: "Yr 5", hold: 105, sell: 70 },
  { year: "Yr 6", hold: 120, sell: 70 },
  { year: "Yr 7", hold: 140, sell: 70 },
]

/** Frequent trader vs buy-and-hold after fees (Lesson 5) */
const TRADER_VS_HOLDER_DATA: Record<string, string | number>[] = [
  { year: "Yr 0", trader: 100, holder: 100 },
  { year: "Yr 1", trader: 97, holder: 107 },
  { year: "Yr 2", trader: 101, holder: 98 },
  { year: "Yr 3", trader: 95, holder: 112 },
  { year: "Yr 4", trader: 99, holder: 105 },
  { year: "Yr 5", trader: 93, holder: 125 },
  { year: "Yr 6", trader: 90, holder: 118 },
  { year: "Yr 7", trader: 88, holder: 140 },
  { year: "Yr 8", trader: 85, holder: 155 },
  { year: "Yr 10", trader: 80, holder: 180 },
]

/** Dollar-cost averaging vs lump sum in a bumpy market (Lesson 5) */
const DCA_DATA: Record<string, string | number>[] = [
  { month: "Jan", price: 10, avgCost: 10 },
  { month: "Mar", price: 8, avgCost: 9.0 },
  { month: "May", price: 6, avgCost: 8.0 },
  { month: "Jul", price: 7, avgCost: 7.7 },
  { month: "Sep", price: 9, avgCost: 7.8 },
  { month: "Nov", price: 11, avgCost: 8.2 },
  { month: "Jan", price: 12, avgCost: 8.6 },
]

/** Fish-only trader who goes all-in and gets wiped out in a crash */
const FISH_CRASH_DATA: Record<string, string | number>[] = [
  { year: "Yr 0", fish: 100 },
  { year: "Yr 1", fish: 200 },
  { year: "Yr 2", fish: 140 },
  { year: "Yr 3", fish: 270 },
  { year: "Yr 4", fish: 90 },
  { year: "Yr 5", fish: 40 },
  { year: "Yr 6", fish: 25 },
]

/** Fish-only vs blended (equal-weight wood+potatoes+fish) — first 9 years */
function buildDiversificationChart(): Record<string, string | number>[] {
  // Custom fish data with deeper crashes to emphasize volatility
  const fishDeep = [0, 120, -80, 200, -70, 280, -60, 100, 200, 180]
  return Array.from({ length: 10 }, (_, i) => ({
    year: `Y${i}`,
    fishOnly: fishDeep[i],
    blended: Math.round((ILLUSTRATION.wood[i] + ILLUSTRATION.potatoes[i] + fishDeep[i]) / 3),
  }))
}

export const LESSONS: Lesson[] = [
  // ────────────────────────────────────────────────────────────────
  // LESSON 1 — Goals and the cost of inflation
  // ────────────────────────────────────────────────────────────────
  {
    id: "goals-and-inflation",
    number: 1,
    title: "Coins Under the Mattress",
    description: "Set your goal — and discover why saving alone is not enough.",
    icon: "🪙",
    slides: [
      {
        title: "Welcome, Traveler!",
        content:
          "You are a humble worker in the medieval kingdom. Each year you earn coins from your labor. Your dream? To one day buy the farm you work on and become truly independent.",
        tip: "Having a clear financial goal gives your decisions direction.",
      },
      {
        title: "The Price of a Dream",
        content:
          "The farm costs 500 gold today. You earn 50 gold per year. If you just save, it will take 10 years — simple, right? But there is a catch nobody told you about.",
      },
      {
        title: "The Gold Pile",
        content:
          "You have been stashing gold under your mattress for years. It feels safe — nobody can take it. But look at the market: the blacksmith charges more for tools this year. Bread costs more. Even the farm price keeps climbing.",
      },
      {
        title: "The Silent Thief",
        content:
          "After 10 years of saving, you finally have 500 gold. But the farm now costs 650 gold! Prices rose about 3% each year — a force called inflation. Your gold stayed the same while everything around it got more expensive.",
        tip: "Inflation typically runs 1–3% per year. Over decades, it dramatically reduces your buying power.",
      },
      {
        title: "Lesson Learned",
        content:
          "A goal without a plan loses value over time. Holding only cash (or coins) might feel safe, but inflation means your purchasing power shrinks every single year. To reach your dream, you need to put your coins to work — and that is what investing is all about.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // LESSON 2 — Investing is beneficial even with small amounts
  // ────────────────────────────────────────────────────────────────
  {
    id: "small-amounts-matter",
    number: 2,
    title: "Every Coin Counts",
    description: "Even a few coins each month can grow into a fortune over time.",
    icon: "💰",
    slides: [
      {
        title: "Too Little to Matter?",
        content:
          "Many villagers think: 'I only have 5 gold to spare — what difference could that make?' So they spend it at the tavern instead. But one farmer thinks differently.",
      },
      {
        title: "The Power of Starting Small",
        content:
          "She invests just 5 gold into a small bundle of wood. A year later it is worth 5.25 gold — a 5% return. Not exciting? She does it again the next year... and the year after that.",
        tip: "You do not need to be rich to start investing. Consistency matters far more than size.",
      },
      {
        title: "The Magic of Compounding",
        content:
          "After 5 years of investing 5 gold each year, she does not have just 25 gold. She has 29 gold — because each year's gains earn their own gains. After 20 years, her small contributions have grown to over 175 gold!",
        tip: "Compound interest is called the 'eighth wonder of the world.' Your money earns money on its own.",
      },
      {
        title: "The Tavern Spender vs. the Investor",
        image: "/farm.webp",
        content:
          "Her neighbor spent the same 5 gold per year on mead and feasts. After 20 years, he has nothing saved. She is halfway to buying the farm — all from coins he thought were 'too small to matter.'",
      },
      {
        title: "Lesson Learned",
        content:
          "You do not need to be rich to start investing. Small, regular contributions grow into serious wealth thanks to compounding. Start with whatever you can — even 20 CHF a month — and let time do the heavy lifting.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // LESSON 3 — Different asset classes (ROI, volatility)
  // ────────────────────────────────────────────────────────────────
  {
    id: "asset-classes",
    number: 3,
    title: "Wood, Potatoes & Fish",
    description: "Three goods, three risk levels — learn how asset classes differ.",
    icon: "📦",
    slides: [
      {
        title: "The Three Goods",
        content:
          "The kingdom's market offers three goods for trade: wood, potatoes, and fish. Each has a very different personality — and understanding them is the key to smart investing.",
      },
      {
        title: "Wood — The Steady Oak",
        image: "/asset-classes/wood.webp",
        content:
          "Slow, reliable growth with few surprises. In the real world, wood is like ETFs or bond funds.",
        chart: {
          xKey: "year",
          ySuffix: "%",
          yDomain: [0, 100],
          xInterval: 10,
          lines: [{ key: "asset", label: "Wood (cumulative return)", color: "#6B4226" }],
          data: buildSingleAssetChart("wood"),
        },
        tip: "Low risk, low reward. Wood rarely loses value but never makes you rich overnight.",
      },
      {
        title: "Potatoes — Steady Growth",
        image: "/asset-classes/potatoes.webp",
        content:
          "Better returns, but harvests vary. Think of potatoes as stocks and equities — more growth, more bumps.",
        chart: {
          xKey: "year",
          ySuffix: "%",
          yDomain: [-30, 400],
          xInterval: 10,
          lines: [{ key: "asset", label: "Potatoes (cumulative return)", color: "#B8860B" }],
          data: buildSingleAssetChart("potatoes"),
        },
        tip: "Medium risk, medium reward. Potatoes outperform wood over long periods, but with more ups and downs.",
      },
      {
        title: "Fish — The Wild Card",
        image: "/asset-classes/fish.webp",
        content:
          "Huge gains one year, devastating crashes the next. Fish represents crypto and speculative assets.",
        chart: {
          xKey: "year",
          ySuffix: "%",
          yDomain: [-100, 950],
          xInterval: 10,
          lines: [{ key: "asset", label: "Fish (cumulative return)", color: "#1E90FF" }],
          data: buildSingleAssetChart("fish"),
        },
        tip: "High risk, high reward. Fish can double your coins or halve them in a single season.",
      },
      {
        title: "All Three — Compared",
        content:
          "Over 10 years: wood might turn 50 gold into 70. Potatoes could make it 100 — or drop it to 40 first. Fish might soar to 250... or crash to 15. Every asset class has a different risk-return profile. The right mix depends on your goals and your stomach.",
      },
      {
        title: "Lesson Learned",
        content:
          "Not all investments are alike. Safe assets (wood/ETFs) grow slowly but steadily. Medium-risk assets (potatoes/stocks) offer more upside with more uncertainty. Speculative assets (fish/crypto) can soar or sink. Knowing the difference is the foundation of every good strategy.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // LESSON 4 — Effects of volatility
  // ────────────────────────────────────────────────────────────────
  {
    id: "volatility",
    number: 4,
    title: "Calm Seas & Stormy Waters",
    description: "What wild price swings really mean for your wealth.",
    icon: "🌊",
    slides: [
      {
        title: "What Is Volatility?",
        content:
          "One fisherman sails a calm lake — his daily catch barely changes. The other braves the open sea — some days a huge haul, other days almost nothing. That unpredictability is volatility.",
        chart: {
          xKey: "day",
          ySuffix: "",
          yDomain: [0, 28],
          lines: [
            { key: "lake", label: "Lake (calm)", color: "#6B4226" },
            { key: "sea", label: "Sea (stormy)", color: "#1E90FF" },
          ],
          data: VOLATILITY_COMPARISON,
        },
      },
      {
        title: "The Emotional Trap",
        content:
          "When prices crash, villagers panic and sell at rock-bottom. But traders who stay calm see prices recover — and surpass the old highs.",
        chart: {
          xKey: "year",
          ySuffix: "%",
          yDomain: [-100, 950],
          xInterval: 10,
          lines: [{ key: "asset", label: "Fish price (cumulative)", color: "#1E90FF" }],
          data: buildSingleAssetChart("fish"),
        },
        tip: "Volatility is temporary. Panic selling turns paper losses into real ones.",
      },
      {
        title: "Volatility ≠ Risk",
        content:
          "A price dropping 30% is scary — but it only becomes a real loss if you sell. The patient holder recovers; the panic seller is stuck.",
        chart: {
          xKey: "year",
          ySuffix: "",
          yDomain: [60, 150],
          lines: [
            { key: "hold", label: "Held through crash", color: "#16a34a" },
            { key: "sell", label: "Sold during crash", color: "#dc2626", dashed: true },
          ],
          data: SELL_VS_HOLD_DATA,
        },
        tip: "Every major stock market crash in history has eventually recovered. Time is your strongest ally.",
      },
      {
        title: "The Hidden Cost of Swings",
        content:
          "Here is a tricky truth: if your fish loses 50% one year and gains 50% the next, you are NOT back to even. 50 gold → 25 gold → 38 gold. Volatility itself destroys value — a concept called 'volatility drag.'",
        tip: "A 50% loss requires a 100% gain just to break even. That is why managing volatility matters.",
      },
      {
        title: "Lesson Learned",
        content:
          "Volatility — big price swings — is a natural part of markets. It creates both opportunity and danger. The key is understanding it, expecting it, and not letting it push you into emotional decisions. Calm minds build wealth; panicked minds destroy it.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // LESSON 5 — Long-term thinking & practical strategies
  // ────────────────────────────────────────────────────────────────
  {
    id: "long-term-thinking",
    number: 5,
    title: "The Patient Farmer",
    description: "Why thinking in years — not days — builds real wealth.",
    icon: "🌱",
    slides: [
      {
        title: "The Impatient Trader",
        content:
          "Some traders buy and sell every day, chasing small profits. They pay fees to the merchant on every trade and spend all their time watching prices. After a year of frantic trading, they often end up with less than they started.",
      },
      {
        title: "The Patient Farmer",
        content:
          "Meanwhile, a quiet farmer bought wood and potatoes years ago and simply held them. Through good kings and bad kings — peace times and war times — the value of her holdings grew steadily. Time was her greatest ally.",

        tip: "Historically, major stock indices have always recovered from crashes — given enough time.",
      },
      {
        title: "The Good King & The Bad King",
        content:
          "Under the Good King, trade flourishes and prices rise. But kings change — the Bad King raises taxes and frightens merchants. Prices fall. Panic spreads. Those who sell during the Bad King's reign lock in their losses forever. Those who wait almost always see a new Good King rise.",
      },
      {
        title: "Keeping Your Nerves",
        content:
          "In 2008, many real-world investors sold their stocks in terror. Those who held on saw their portfolios fully recover within a few years — and then grow to new highs. The hardest part of investing is doing nothing when everything screams 'act!'",
        tip: "The market rewards patience. Over any 20-year period in history, broad stock indices have always ended higher than they started.",
      },
      {
        title: "Compound Growth in Action",
        content:
          "Each year, the patient farmer's investments grew a little. And the next year, those gains earned their own gains. After 25 years, her modest portfolio had multiplied many times over. Compound growth turned her patience into prosperity.",
      },
      {
        title: "Lesson Learned",
        content:
          "Trade less, invest regularly, and think in decades. Buy-and-hold beats frequent trading. Dollar-cost averaging removes timing stress. The patient farmer always outperforms the anxious trader.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // LESSON 6 — Diversification & Risk Management
  // ────────────────────────────────────────────────────────────────
  {
    id: "diversification",
    number: 6,
    title: "Don't Put All Eggs in One Basket",
    description: "Spreading your coins across goods protects you when markets shake.",
    icon: "🧺",
    slides: [
      {
        title: "The One-Good Trader",
        content:
          "A trader put all his coins into fish. At first it soared — he felt like a genius. Then the storm hit.",
        chart: {
          xKey: "year",
          ySuffix: "",
          yDomain: [0, 300],
          lines: [{ key: "fish", label: "Fish-only portfolio", color: "#1E90FF" }],
          data: FISH_CRASH_DATA,
        },
        tip: "He sold in panic at Year 6. His 100 coins had become 25.",
      },
      {
        title: "The Balanced Trader",
        content:
          "Another trader split his coins equally between wood, potatoes, and fish. Compare the smooth green line to the wild blue one.",
        chart: {
          xKey: "year",
          ySuffix: "%",
          yDomain: [-80, 450],
          xInterval: 5,
          lines: [
            { key: "fishOnly", label: "Fish only", color: "#1E90FF", dashed: true },
            { key: "blended", label: "Blended (1/3 each)", color: "#16a34a" },
          ],
          data: buildDiversificationChart(),
        },
        tip: "Diversification reduces risk without necessarily reducing returns.",
      },
      {
        title: "Managing Your Risk",
        emoji: "⚖️",
        content:
          "It is not about avoiding risk — it is about choosing how much you can live with. Young farmer? More fish. Close to buying the farm? Mostly wood and potatoes.",
        tip: "The younger you are, the more risk you can take — you have time to recover from downturns.",
      },
      {
        title: "The Sleep Test",
        emoji: "🛏️",
        content:
          "If your portfolio dropped 30% tomorrow, would you sleep soundly? Or lie awake in panic? Your answer tells you whether you need more safe wood or stormy fish.",
      },
      {
        title: "Lesson Learned",
        content:
          "Spread your investments so no single disaster can wipe you out. Match your risk to your timeline and temperament. A diversified portfolio is the strongest shield on the road to your farm.",
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // LESSON 7 — The Farm: Surprise Reward
  // ────────────────────────────────────────────────────────────────
  {
    id: "the-farm",
    number: 7,
    title: "The Farm Awaits",
    description: "Everything you learned leads here — claim your reward.",
    icon: "🏡",
    slides: [
      {
        title: "You Have Come a Long Way",
        emoji: "🏡",
        content:
          "You started as a humble worker with a dream — and now you are ready to buy your farm. Here is what you learned along the way.",
      },
      {
        title: "🪙 Coins Under the Mattress",
        content:
          "Saving alone is not enough. Inflation silently eats away at idle coins — your purchasing power shrinks every year. To reach your dream, you need to put your money to work.",
      },
      {
        title: "💰 Every Coin Counts",
        content:
          "You do not need to be rich to start investing. Small, regular contributions grow into serious wealth thanks to compounding. Even 20 coins a month can become a fortune.",
      },
      {
        title: "🧺 Wood, Potatoes & Fish",
        content:
          "Not all investments are alike. Safe assets grow slowly but steadily, medium-risk assets offer more upside with more swings, and speculative assets can soar or sink. Knowing the difference is key.",
      },
      {
        title: "🌊 Calm Seas & Stormy Waters",
        content:
          "Big price swings are a natural part of markets. The key is expecting volatility, understanding it, and never letting it push you into panic selling.",
      },
      {
        title: "🌱 The Patient Farmer",
        content:
          "Trade less, invest regularly, and think in decades. Buy-and-hold beats frequent trading, and dollar-cost averaging removes the stress of timing the market.",
      },
      {
        title: "🧺 Don't Put All Eggs in One Basket",
        content:
          "Spread your investments so no single disaster can wipe you out. A diversified portfolio matched to your risk tolerance is the strongest shield on the road to your farm.",
      },
    ],
  },
]
