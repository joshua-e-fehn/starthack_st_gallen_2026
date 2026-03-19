import { getGeminiClient } from "@/lib/ai/gemini-client"
import { getSystemPrompt } from "@/lib/ai/prompt"

export async function* generateGeminiResponseStream({
  message,
  systemPrompt,
  temperature = 0.7,
}: {
  message: string
  systemPrompt?: string
  temperature?: number
}): AsyncGenerator<string> {
  const ai = getGeminiClient()
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest"

  const response = await ai.models.generateContentStream({
    model,
    contents: message,
    config: {
      systemInstruction: systemPrompt ?? getSystemPrompt(),
      temperature,
      responseMimeType: "text/plain",
    },
  })

  for await (const chunk of response) {
    const text = chunk.text
    if (text) {
      yield text
    }
  }
}
