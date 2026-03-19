import { Hono } from "hono"
import { generateGeminiResponse } from "@/lib/ai/chatbot"
import { getLandingQuoteSystemPrompt, getLandingQuoteUserPrompt } from "@/lib/ai/prompt"

const app = new Hono()

app.post("/", async (c) => {
  const body = (await c.req.json()) as { topic?: string }
  const topic = body.topic?.trim() || "long-term wealth in uncertain markets"

  try {
    const rawQuote = await generateGeminiResponse({
      message: getLandingQuoteUserPrompt(topic),
      systemPrompt: getLandingQuoteSystemPrompt(),
      temperature: 0.9,
    })

    const quote = rawQuote
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)[0]

    if (!quote) {
      return c.json({ error: "Quote generation returned empty text" }, 500)
    }

    return c.json({ quote })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown quote error"
    return c.json({ error: message }, 500)
  }
})

export default app
