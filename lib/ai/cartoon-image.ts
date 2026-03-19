import { randomUUID } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { getGeminiClient } from "@/lib/ai/gemini-client"

export async function generateCartoonImage(prompt: string): Promise<string> {
  const ai = getGeminiClient()
  const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image-preview"
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  })

  const parts = response.candidates?.[0]?.content?.parts ?? []
  let savedImagePath = ""

  for (const part of parts) {
    if (part.text) {
      console.log(part.text)
    } else if (part.inlineData?.data) {
      const imageData = part.inlineData.data
      const buffer = Buffer.from(imageData, "base64")
      const outputDir = path.join(process.cwd(), "public", "cartoon-images")
      const fileName = `${randomUUID()}.png`
      const absoluteFilePath = path.join(outputDir, fileName)

      fs.mkdirSync(outputDir, { recursive: true })
      fs.writeFileSync(absoluteFilePath, buffer)
      savedImagePath = `/cartoon-images/${fileName}`
      console.log(`Image saved as ${savedImagePath}`)
    }
  }

  return savedImagePath
}
