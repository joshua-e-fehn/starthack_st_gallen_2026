import { Hono } from "hono"
import { generateGeminiResponse } from "@/lib/ai/chatbot"
import { getLandingQuoteSystemPrompt, getLandingQuoteUserPrompt } from "@/lib/ai/prompt"
import { generateGeminiResponseStream } from "@/lib/ai/quote"

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

app.get("/stream", async (c) => {
  const topic = c.req.query("topic")?.trim() || "long-term wealth in uncertain markets"
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of generateGeminiResponseStream({
          message: getLandingQuoteUserPrompt(topic),
          systemPrompt: getLandingQuoteSystemPrompt(),
          temperature: 0.9,
        })) {
          const payload = JSON.stringify({ type: "chunk", chunk })
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown quote stream error"
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
})

export default app
