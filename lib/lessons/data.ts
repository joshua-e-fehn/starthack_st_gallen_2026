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

export const LESSONS: Lesson[] = [
  // ────────────────────────────────────────────────────────────────
  // LESSON 1 — Goals and the cost of inflation
  // ────────────────────────────────────────────────────────────────
  {
    id: "goals-and-inflation",
    number: 1,
    title: "Gold Under the Mattress",
    description: "Set your goal — and discover why saving alone is not enough.",
    icon: "🪙",
    slides: [
      {
        title: "Welcome, Traveler!",
        content:
          "You are a humble worker in the medieval kingdom. Each year you earn gold from your labor. Your dream? To one day buy the farm you work on and become truly independent.",
        tip: "Having a clear financial goal gives your decisions direction.",
      },
      {
        title: "The Price of a Dream",
        content:
          "The farm costs 1 000 gold today. You earn 100 gold per year. If you just save, it will take 10 years — simple, right? But there is a catch nobody told you about.",
      },
      {
        title: "The Gold Pile",
        content:
          "You stash gold under your mattress. It feels safe — but watch what happens to its real value over time.",
        chart: {
          xKey: "year",
          yLabel: "Gold",
          ySuffix: "",
          yDomain: [50, 100],
          lines: [
            { key: "real", label: "Purchasing power of 100 gold", color: "oklch(0.55 0.2 25)" },
          ],
          data: [
            { year: "Yr 0", real: 100 },
            { year: "Yr 5", real: 86 },
            { year: "Yr 10", real: 74 },
            { year: "Yr 15", real: 64 },
            { year: "Yr 20", real: 55 },
          ],
        },
        tip: "Even though you still hold 100 gold coins, after 20 years they only buy what 55 gold could buy today. That is the hidden cost of doing nothing.",
      },
      {
        title: "The Rising Price of the Farm",
        content:
          "The farm costs 1 000 gold today. At 3% inflation, it keeps climbing every year — your flat savings can never catch up.",
        chart: {
          xKey: "year",
          yLabel: "Gold",
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
        tip: "After 10 years of saving 100 gold/year you have 1 000 — but the farm now costs 1 344. The gap only widens.",
      },
      {
        title: "Lesson Learned",
        content:
          "A goal without a plan loses value over time. Holding only cash (or gold) might feel safe, but inflation means your purchasing power shrinks every single year. To reach your dream, you need to put your gold to work — and that is what investing is all about.",
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
        content:
          "Wood grows slowly but reliably. Prices move up 3–5% per year with very little surprise. It is the safe, boring choice — but boring is beautiful when markets shake. In the real world, wood is like ETFs or bond funds.",
        tip: "Low risk, low reward. Wood rarely loses value but never makes you rich overnight.",
      },
      {
        title: "Potatoes — The Dependable Harvest",
        content:
          "Potatoes offer better returns — about 6–10% in good years. But harvests vary: some years are great, others are poor. Think of potatoes as stocks and equities. More growth potential, but expect bumps along the way.",
        tip: "Medium risk, medium reward. Potatoes outperform wood over long periods, but with more ups and downs.",
      },
      {
        title: "Fish — The High-Seas Gamble",
        content:
          "Fish can explode in value — 50% gains in a single year! But storms can also wipe out your entire catch. Fish represents crypto and speculative investments. Thrilling, but not for the faint of heart.",
        tip: "High risk, high reward. Fish can double your gold or halve it in a single season.",
      },
      {
        title: "Comparing the Three",
        content:
          "Over 10 years: wood might turn 100 gold into 140. Potatoes could make it 200 — or drop it to 80 first. Fish might soar to 500... or crash to 30. Every asset class has a different risk-return profile. The right mix depends on your goals and your stomach.",
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
          "Imagine two fishermen. One sails a calm lake — his catch is almost the same every day. The other sails the open sea — some days he hauls in a mountain of fish, other days he comes back empty. That unpredictability is volatility.",
      },
      {
        title: "The Emotional Trap",
        content:
          "When fish prices crash 40% in a single season, villagers panic. They sell everything at rock-bottom prices, terrified of losing more. But the traders who stay calm often see prices recover — and even surpass the old highs.",
        tip: "Volatility is temporary. Panic selling turns paper losses into real ones.",
      },
      {
        title: "Volatility Is Not the Same as Risk",
        content:
          "A price dropping 30% is scary — but it only becomes a real loss if you sell. If you can wait, volatile assets often deliver higher long-term returns precisely because most people cannot handle the ride. Time tames volatility.",
      },
      {
        title: "The Hidden Cost of Swings",
        content:
          "Here is a tricky truth: if your fish loses 50% one year and gains 50% the next, you are NOT back to even. 100 gold → 50 gold → 75 gold. Volatility itself destroys value — a concept called 'volatility drag.'",
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
  // LESSON 5 — Long-term thinking & keeping nerves
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
          "Meanwhile, a quiet farmer bought wood and potatoes years ago and simply held them. Through good kings and bad kings — bull markets and bear markets — the value of his holdings grew steadily. Time was his greatest ally.",
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
          "Each year, the patient farmer's investments grew a little. And the next year, those gains earned their own gains. After 25 years, his modest portfolio had multiplied many times over. Compound growth turned his patience into prosperity.",
      },
      {
        title: "Lesson Learned",
        content:
          "Markets go up and down — that is completely normal. Long-term thinking beats short-term trading. Stay invested through downturns, avoid emotional reactions, and let compound growth work its quiet magic. The farm is a marathon, not a sprint.",
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
    description: "Spreading your gold across goods protects you when markets shake.",
    icon: "🧺",
    slides: [
      {
        title: "The One-Good Trader",
        content:
          "A trader in the next village put all his gold into fish. When the catch was good, he was the richest man around. But when a terrible storm came, he lost nearly everything in a single season.",
      },
      {
        title: "The Balanced Trader",
        content:
          "Another trader split his gold between wood, potatoes, and fish. When fish crashed, his wood and potatoes kept him afloat. He did not reach the highest highs, but he avoided the devastating lows.",
        tip: "Diversification is the only 'free lunch' in investing — it reduces risk without necessarily reducing returns.",
      },
      {
        title: "How Diversification Works",
        content:
          "Different assets respond to events differently. When the king raises taxes, fish might crash but wood barely moves. When a plague hits the harvest, potato prices soar while fish stays cheap. By holding a mix, bad news for one is cushioned by the others.",
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
          "You started as a humble worker with a dream. Along the way, you learned that inflation steals idle gold, that even small investments grow, that different goods carry different risks, and that patience and diversification are your strongest allies.",
      },
      {
        title: "Your Strategy Toolkit",
        content:
          "You now understand the core pillars of smart investing: set clear goals, start early (even small), know your asset classes, expect volatility without panicking, think long-term, and diversify your holdings. These are the same principles used by the world's best investors.",
      },
      {
        title: "From Medieval Gold to Real Money",
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
