import { getGeminiClient } from "@/lib/ai/gemini-client"
import { getSystemPrompt } from "@/lib/ai/prompt"

export async function generateGeminiResponse({
  message,
  systemPrompt,
  temperature = 0.7,
}: {
  message: string
  systemPrompt?: string
  temperature?: number
}): Promise<string> {
  const ai = getGeminiClient()
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest"

  const response = await ai.models.generateContent({
    model,
    contents: message,
    config: {
      systemInstruction: systemPrompt ?? getSystemPrompt(),
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

export async function generateChatbotResponse(message: string): Promise<string> {
  return generateGeminiResponse({ message })
}
