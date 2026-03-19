import { GoogleGenAI } from "@google/genai"

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY")
  }

  return new GoogleGenAI({ apiKey })
}
