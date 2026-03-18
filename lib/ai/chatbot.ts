import { getSystemPrompt } from "@/lib/ai/prompt"

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

function getTextFromResponse(data: GeminiResponse) {
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text?.trim())
    .filter(Boolean)
    .join("\n")

  if (text && text.length > 0) {
    return text
  }

  throw new Error("LLM returned no text output")
}

export async function generateChatbotResponse(message: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
  const baseUrl = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta"

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY")
  }

  const response = await fetch(`${baseUrl}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: getSystemPrompt() }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LLM request failed: ${response.status} ${errorText}`)
  }

  const data = (await response.json()) as GeminiResponse

  return getTextFromResponse(data)
}
