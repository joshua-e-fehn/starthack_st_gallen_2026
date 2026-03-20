import { Hono } from "hono"
import type { ChatMessage, GameContext } from "@/lib/ai/chatbot"
import { generateChatbotResponse } from "@/lib/ai/chatbot"

const app = new Hono()

app.post("/", async (c) => {
  const body = (await c.req.json()) as {
    message?: string
    gameContext?: GameContext
    chatHistory?: ChatMessage[]
  }

  if (!body.message) {
    return c.json({ error: "Message is required" }, 400)
  }

  try {
    const answer = await generateChatbotResponse({
      message: body.message,
      gameContext: body.gameContext,
      chatHistory: body.chatHistory,
    })
    return c.json({ message: answer })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown chatbot error"

    return c.json({ error: message }, 500)
  }
})

export default app
