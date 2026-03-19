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
  /** Optional hint text shown below the main content (Gildi tip style) */
  tip?: string
  /** Optional line chart rendered below the content */
  chart?: SlideChart
  /** Optional image path (relative to /public) shown above the content */
  image?: string
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

/** Fish-only vs blended (equal-weight wood+potatoes+fish) portfolio over 30 years */
function buildDiversificationChart(): Record<string, string | number>[] {
  return Array.from({ length: 31 }, (_, i) => ({
    year: `Y${i}`,
    fishOnly: ILLUSTRATION.fish[i],
    blended: Math.round(
      (ILLUSTRATION.wood[i] + ILLUSTRATION.potatoes[i] + ILLUSTRATION.fish[i]) / 3,
    ),
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
          "The farm costs 1 000 coins today. You earn 100 coins per year. If you just save, it will take 10 years — simple, right? But there is a catch nobody told you about.",
      },
      {
        title: "The Coin Pile",
        content:
          "You stash coins under your mattress. It feels safe — but watch what happens to their real value over time.",
        chart: {
          xKey: "year",
          yLabel: "Coins",
          ySuffix: "",
          yDomain: [50, 100],
          lines: [
            { key: "real", label: "Purchasing power of 100 coins", color: "oklch(0.55 0.2 25)" },
          ],
          data: [
            { year: "Yr 0", real: 100 },
            { year: "Yr 5", real: 86 },
            { year: "Yr 10", real: 74 },
            { year: "Yr 15", real: 64 },
            { year: "Yr 20", real: 55 },
          ],
        },
        tip: "Even though you still hold 100 coins, after 20 years they only buy what 55 coins could buy today. That is the hidden cost of doing nothing.",
      },
      {
        title: "The Rising Price of the Farm",
        content:
          "The farm costs 1 000 coins today. At 3% inflation, it keeps climbing every year — your flat savings can never catch up.",
        chart: {
          xKey: "year",
          yLabel: "Coins",
          ySuffix: "",
          yDomain: [950, 1350],
          lines: [
            { key: "farmPrice", label: "Farm price (3% inflation)", color: "oklch(0.55 0.2 25)" },
          ],
          data: [
            { year: "Yr 0", farmPrice: 1000 },
            { year: "Yr 2", farmPrice: 1061 },
            { year: "Yr 4", farmPrice: 1126 },
            { year: "Yr 6", farmPrice: 1194 },
            { year: "Yr 8", farmPrice: 1267 },
            { year: "Yr 10", farmPrice: 1344 },
          ],
        },
        tip: "After 10 years of saving 100 coins/year you have 1 000 — but the farm now costs 1 344. The gap only widens.",
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
          "Many villagers think: 'I only have 20 coins to spare — what difference could that make?' So they spend it at the tavern instead. But one farmer thinks differently.",
        tip: "Spoiler: those 20 coins will matter a lot.",
      },
      {
        title: "20 Coins a Month",
        content:
          "He sets aside just 20 coins every single month — the price of a mug of mead. Not a fortune. But he invests it instead of spending it, and lets it grow year after year.",
        tip: "In the real world, 20 CHF per month is enough to start. PostFinance lets you invest from as little as 20 CHF.",
      },
      {
        title: "The Compound Effect",
        content:
          "His investments earn about 10% per year. After 10 years he invested 2 400 coins — but his portfolio is already worth over 4 000. The earnings earn their own earnings.",
        chart: {
          xKey: "year",
          ySuffix: "",
          yDomain: [
            0,
            Math.round((COMPOUND_DATA[COMPOUND_DATA.length - 1].portfolio as number) / 1000) *
              1000 +
              1000,
          ],
          lines: [
            {
              key: "invested",
              label: "Total coins invested",
              color: "oklch(0.75 0.15 85)",
              dashed: true,
            },
            {
              key: "portfolio",
              label: "Portfolio value (10% return)",
              color: "oklch(0.65 0.2 145)",
            },
          ],
          data: COMPOUND_DATA,
        },
        tip: "After 40 years, 20 coins/month (9 600 total) grow to over 126 000. That is the magic of compound interest. 🚀",
      },
      {
        title: "The Tavern Spender vs. the Investor",
        image: "/farm.webp",
        content:
          "His neighbor spent 20 coins a month on feasts. After 40 years he has nothing. Our farmer turned those same small coins into a fortune — enough to buy a farm and retire comfortably.",
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
          "Same starting investment, three very different journeys. Notice how the spread increases with risk.",
        chart: {
          xKey: "year",
          ySuffix: "%",
          yDomain: [-150, 950],
          xInterval: 10,
          lines: [
            { key: "wood", label: "Wood", color: "#6B4226" },
            { key: "potatoes", label: "Potatoes", color: "#B8860B" },
            { key: "fish", label: "Fish", color: "#1E90FF" },
          ],
          data: buildCombinedChart(),
        },
        tip: "Higher potential returns come with wilder swings. That trade-off is the fundamental law of investing.",
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
          "If fish loses 50% then gains 50%, you are NOT back to even. 100 → 50 → 75. Volatility itself destroys value — a concept called 'volatility drag.'",
        chart: {
          xKey: "year",
          ySuffix: "",
          yDomain: [20, 110],
          lines: [
            { key: "hold", label: "Holding steady (100 coins)", color: "#6B4226", dashed: true },
            { key: "volatile", label: "±50% swings each year", color: "#dc2626" },
          ],
          data: VOLATILITY_DRAG_DATA,
        },
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
          "Some traders buy and sell every day, chasing small gains. But each trade costs a fee — and those fees add up fast.",
        chart: {
          xKey: "year",
          ySuffix: "",
          yDomain: [70, 190],
          lines: [
            { key: "holder", label: "Buy & hold", color: "#16a34a" },
            {
              key: "trader",
              label: "Frequent trader (after fees)",
              color: "#dc2626",
              dashed: true,
            },
          ],
          data: TRADER_VS_HOLDER_DATA,
        },
        tip: "Transaction fees, taxes, and bad timing eat into returns. Doing less often means earning more.",
      },
      {
        title: "Zoom Out",
        content:
          "Up close, potatoes look terrifying — wild swings every year. But zoom out to 30 years and the trend is unmistakable: up.",
        chart: {
          xKey: "year",
          ySuffix: "%",
          yDomain: [-30, 400],
          xInterval: 10,
          lines: [{ key: "asset", label: "Potatoes (cumulative return)", color: "#B8860B" }],
          data: buildSingleAssetChart("potatoes"),
        },
      },
      {
        title: "Dollar-Cost Averaging",
        content:
          "Instead of timing the market, invest the same amount every month. When prices drop, you buy more shares. When they rise, you buy fewer. Your average cost smooths out.",
        chart: {
          xKey: "month",
          ySuffix: "",
          yDomain: [4, 14],
          lines: [
            { key: "price", label: "Market price", color: "#1E90FF" },
            { key: "avgCost", label: "Your average cost", color: "#16a34a", dashed: true },
          ],
          data: DCA_DATA,
        },
        tip: "DCA removes the stress of 'when should I buy?' — you just invest regularly and let math work for you.",
      },
      {
        title: "Time in the Market",
        content:
          "Trying to predict the best days to buy is nearly impossible. Missing just the 10 best days over 20 years can cut your returns in half. Being invested consistently matters more than being invested perfectly.",
        tip: "'Time in the market beats timing the market' — this is not just a saying, it is backed by decades of data.",
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
          "A trader put all his coins into fish. When the catch was good, he was the richest man around. But when storms came, he lost nearly everything.",
        chart: {
          xKey: "year",
          ySuffix: "%",
          yDomain: [-100, 950],
          xInterval: 10,
          lines: [{ key: "asset", label: "Fish only", color: "#1E90FF" }],
          data: buildSingleAssetChart("fish"),
        },
      },
      {
        title: "The Balanced Trader",
        content:
          "Another trader split his coins equally between wood, potatoes, and fish. Smoother ride, still strong growth.",
        chart: {
          xKey: "year",
          ySuffix: "%",
          yDomain: [-100, 950],
          xInterval: 10,
          lines: [
            { key: "fishOnly", label: "Fish only", color: "#1E90FF", dashed: true },
            { key: "blended", label: "Blended (1/3 each)", color: "#16a34a" },
          ],
          data: buildDiversificationChart(),
        },
        tip: "Diversification is the only 'free lunch' in investing — it reduces risk without necessarily reducing returns.",
      },
      {
        title: "Managing Your Risk",
        content:
          "Risk management is not about avoiding risk — it is about choosing how much risk you can live with. A young farmer with decades ahead can afford more fish. An older farmer close to buying the farm might want mostly wood and potatoes.",
        tip: "A common rule: the younger you are, the more risk you can take — because you have time to recover from downturns.",
      },
      {
        title: "The 'Sleep at Night' Test",
        content:
          "Ask yourself: if your portfolio dropped 30% tomorrow, would you sleep soundly knowing it will recover? Or would you lie awake in panic? Your answer tells you whether you need more safe wood or whether you can handle some stormy fish.",
      },
      {
        title: "Lesson Learned",
        content:
          "Diversification means spreading investments across different asset types so that no single disaster can wipe you out. Combine it with a risk level that matches your timeline and temperament. A well-diversified portfolio is the strongest shield on the road to your farm.",
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
        title: "The Journey So Far",
        content:
          "You started as a humble worker with a dream. Along the way, you learned that inflation steals idle coins, that even small investments grow, that different goods carry different risks, and that patience and diversification are your strongest allies.",
      },
      {
        title: "Your Strategy Toolkit",
        content:
          "You now understand the core pillars of smart investing: set clear goals, start early (even small), know your asset classes, expect volatility without panicking, think long-term, and diversify your holdings. These are the same principles used by the world's best investors.",
      },
      {
        title: "From Medieval Coins to Real Money",
        content:
          "In our game, wood represents safe ETFs, potatoes represent stocks, and fish represents crypto. The principles are identical in the real world: balance risk, stay patient, diversify, and keep investing consistently — no matter how small the amount.",
        tip: "You do not need to be a finance expert. Understanding these basics already puts you ahead of most people.",
      },
      {
        title: "The Farm Is Yours!",
        content:
          "Congratulations — you have earned the wisdom to buy your farm! But this is not the end of your story. It is the beginning. Because the knowledge you just gained is not just for a game...",
      },
      {
        title: "A Real Surprise Awaits",
        content:
          "You have proven you understand the fundamentals of investing. Now it is time to put that knowledge into practice — for real. Complete this lesson to discover a special reward waiting for you.",
        tip: "This is not a drill. Something real is waiting on the other side.",
      },
    ],
  },
]
