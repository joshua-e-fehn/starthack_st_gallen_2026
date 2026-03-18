import { Hono } from "hono"
import { generateChatbotResponse } from "@/lib/ai/chatbot"

const app = new Hono()

app.post("/", async (c) => {
  const body = (await c.req.json()) as { message?: string }

  if (!body.message) {
    return c.json({ error: "Message is required" }, 400)
  }

  try {
    const answer = await generateChatbotResponse(body.message)
    return c.json({ message: answer })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown chatbot error"

    return c.json({ error: message }, 500)
  }
})

export default app
