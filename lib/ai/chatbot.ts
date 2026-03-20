import { getGeminiClient } from "@/lib/ai/gemini-client"
import { getChatbotSystemPrompt } from "@/lib/ai/prompt"

// ─── Types ───────────────────────────────────────────────────────

export type ChatMessage = {
  role: "user" | "model"
  text: string
}

export type GameContext = {
  portfolio: { gold: number; wood: number; potatoes: number; fish: number }
  market: {
    regime: string
    inflation: number
    prices: {
      wood: { basePrice: number; buyFactor: number; sellFactor: number }
      potatoes: { basePrice: number; buyFactor: number; sellFactor: number }
      fish: { basePrice: number; buyFactor: number; sellFactor: number }
    }
  }
  currentStep: number
  currentYear: number
  goal: number
  goalReached: boolean
  totalNetWorth: number
  recentEvents: Array<{ step: number; name: string; description?: string }>
  goldHistory: number[]
  startYear: number
  endYear: number
}

// ─── Context Formatter ───────────────────────────────────────────

function formatGameContextMessage(ctx: GameContext): string {
  const inf = ctx.market.inflation
  const nominalPrice = (p: { basePrice: number }) => Math.round(p.basePrice * inf * 100) / 100
  const buyPrice = (p: { basePrice: number; buyFactor: number }) =>
    Math.round(p.basePrice * inf * p.buyFactor * 100) / 100
  const sellPrice = (p: { basePrice: number; sellFactor: number }) =>
    Math.round(p.basePrice * inf * p.sellFactor * 100) / 100

  const woodVal = ctx.portfolio.wood * sellPrice(ctx.market.prices.wood)
  const potatoVal = ctx.portfolio.potatoes * sellPrice(ctx.market.prices.potatoes)
  const fishVal = ctx.portfolio.fish * sellPrice(ctx.market.prices.fish)
  const totalInvested = woodVal + potatoVal + fishVal
  const totalWithGold = totalInvested + ctx.portfolio.gold

  const pctGold = totalWithGold > 0 ? ((ctx.portfolio.gold / totalWithGold) * 100).toFixed(1) : "0"
  const pctWood = totalWithGold > 0 ? ((woodVal / totalWithGold) * 100).toFixed(1) : "0"
  const pctPotato = totalWithGold > 0 ? ((potatoVal / totalWithGold) * 100).toFixed(1) : "0"
  const pctFish = totalWithGold > 0 ? ((fishVal / totalWithGold) * 100).toFixed(1) : "0"

  const remainingYears = ctx.endYear - ctx.currentYear
  const goalProgress = ctx.goal > 0 ? ((ctx.totalNetWorth / ctx.goal) * 100).toFixed(1) : "unknown"

  const recentEventsSummary =
    ctx.recentEvents.length > 0
      ? ctx.recentEvents
          .slice(-5)
          .map((e) => `- Year ${ctx.startYear + e.step}: ${e.name}`)
          .join("\n")
      : "None"

  const goldTrend =
    ctx.goldHistory.length >= 2
      ? ctx.goldHistory
          .slice(-5)
          .map(
            (g, i) =>
              `Year ${ctx.currentYear - (ctx.goldHistory.slice(-5).length - 1 - i)}: ${Math.round(g)} gold`,
          )
          .join(", ")
      : "No history yet"

  return `
[CURRENT GAME STATE — Year ${ctx.currentYear} (Step ${ctx.currentStep})]

📅 Time: Year ${ctx.currentYear} of ${ctx.endYear} (${remainingYears} years remaining)
🏁 Goal: ${Math.round(ctx.goal)} taler | Progress: ${goalProgress}% | ${ctx.goalReached ? "✅ Goal reached!" : "❌ Not yet reached"}

💰 Portfolio:
- Gold (cash): ${Math.round(ctx.portfolio.gold)} taler (${pctGold}% of net worth)
- Wood: ${ctx.portfolio.wood} units × ${nominalPrice(ctx.market.prices.wood)} = ${Math.round(woodVal)} taler (${pctWood}%)
- Potatoes: ${ctx.portfolio.potatoes} units × ${nominalPrice(ctx.market.prices.potatoes)} = ${Math.round(potatoVal)} taler (${pctPotato}%)
- Fish: ${ctx.portfolio.fish} units × ${nominalPrice(ctx.market.prices.fish)} = ${Math.round(fishVal)} taler (${pctFish}%)
- Total Net Worth: ${Math.round(totalWithGold)} taler

📊 Market:
- Regime: ${ctx.market.regime === "peace" || ctx.market.regime === "bull" ? "Peace Time (bull market)" : "War Time (bear market)"}
- Inflation: ${((ctx.market.inflation - 1) * 100).toFixed(1)}% cumulative
- Wood price: ${nominalPrice(ctx.market.prices.wood)} (buy: ${buyPrice(ctx.market.prices.wood)}, sell: ${sellPrice(ctx.market.prices.wood)})
- Potato price: ${nominalPrice(ctx.market.prices.potatoes)} (buy: ${buyPrice(ctx.market.prices.potatoes)}, sell: ${sellPrice(ctx.market.prices.potatoes)})
- Fish price: ${nominalPrice(ctx.market.prices.fish)} (buy: ${buyPrice(ctx.market.prices.fish)}, sell: ${sellPrice(ctx.market.prices.fish)})

📈 Gold Balance Trend: ${goldTrend}

⚡ Recent Events:
${recentEventsSummary}
`.trim()
}

// ─── Main API ────────────────────────────────────────────────────

export async function generateGeminiResponse({
  message,
  systemPrompt,
  temperature = 0.7,
}: {
  message: string
  systemPrompt: string
  temperature?: number
}): Promise<string> {
  const ai = getGeminiClient()
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest"

  const response = await ai.models.generateContent({
    model,
    contents: message,
    config: {
      systemInstruction: systemPrompt,
      temperature,
      responseMimeType: "text/plain",
      maxOutputTokens: 160,
    },
  })

  const text = response.text?.trim()
  if (text && text.length > 0) {
    return text
  }

  const fallbackText = response.candidates?.[0]?.content?.parts
    ?.map((part) => {
      if ("text" in part && typeof part.text === "string") {
        return part.text.trim()
      }
      return ""
    })
    .filter(Boolean)
    .join("\n")
    .trim()

  if (fallbackText) {
    return fallbackText
  }

  throw new Error("LLM returned no text output")
}

/**
 * Generate a chatbot response with full game context and conversation history.
 */
export async function generateChatbotResponse({
  message,
  gameContext,
  chatHistory = [],
}: {
  message: string
  gameContext?: GameContext
  chatHistory?: ChatMessage[]
}): Promise<string> {
  const ai = getGeminiClient()
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest"

  // Build multi-turn contents array
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = []

  // If we have game context, inject it as the first "user" message context
  if (gameContext) {
    const contextMsg = formatGameContextMessage(gameContext)
    contents.push({
      role: "user",
      parts: [
        {
          text: `${contextMsg}\n\n---\nThe above is my current game state. I'll now ask you a question.`,
        },
      ],
    })
    contents.push({
      role: "model",
      parts: [
        {
          text: "I can see your current trading position. How can I help you, merchant? — Connie",
        },
      ],
    })
  }

  // Add conversation history
  for (const msg of chatHistory) {
    contents.push({
      role: msg.role,
      parts: [{ text: msg.text }],
    })
  }

  // Add the current user message
  contents.push({
    role: "user",
    parts: [{ text: message }],
  })

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: getChatbotSystemPrompt(),
      temperature: 0.7,
      responseMimeType: "text/plain",
      maxOutputTokens: 2048,
    },
  })

  const text = response.text?.trim()
  if (text && text.length > 0) return text

  const fallbackText = response.candidates?.[0]?.content?.parts
    ?.map((part) => {
      if ("text" in part && typeof part.text === "string") return part.text.trim()
      return ""
    })
    .filter(Boolean)
    .join("\n")
    .trim()

  if (fallbackText) return fallbackText

  throw new Error("LLM returned no text output")
}
