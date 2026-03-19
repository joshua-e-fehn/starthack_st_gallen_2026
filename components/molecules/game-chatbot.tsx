"use client"

import { Send, X } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export function GameChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [response, setResponse] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isQuestionLocked, setIsQuestionLocked] = useState(false)

  async function handleSendMessage() {
    if (!message.trim() || isLoading) {
      return
    }

    setIsLoading(true)
    setIsQuestionLocked(true)
    setResponse("")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      })

      const data = (await res.json()) as { message?: string; error?: string }

      if (data.error) {
        setResponse(`Error: ${data.error}`)
      } else if (data.message) {
        setResponse(data.message)
      } else {
        setResponse("No response received")
      }
    } catch (error) {
      setResponse(
        `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSendMessage()
    }
  }

  function handleTextareaFocus() {
    if (isQuestionLocked) {
      setIsQuestionLocked(false)
      setMessage("")
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Open AI assistant"
      >
        <Image
          src="/characters/wise_coini.webp"
          alt="AI Assistant"
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
        />
      </button>
    )
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-[420px] max-h-[600px] shadow-2xl">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-0">
        <Image
          src="/characters/wise_coini.webp"
          alt="Wise Coini"
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
        />
        <div className="flex-1">
          <CardTitle className="text-lg">Hi, I am Coini!</CardTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsOpen(false)
            setMessage("")
            setResponse("")
          }}
          aria-label="Close assistant"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto max-h-[500px]">
        <div className="space-y-2">
          <Textarea
            placeholder="What is your question?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleTextareaFocus}
            rows={3}
            disabled={isLoading}
            className={`resize-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors ${
              isQuestionLocked ? "text-muted-foreground cursor-pointer" : ""
            }`}
          />
          <Button
            type="button"
            onClick={() => void handleSendMessage()}
            disabled={!message.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? (
              "Thinking..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Ask Coini
              </>
            )}
          </Button>
        </div>

        {response ? (
          <div className="flex items-start gap-3">
            <Image
              src="/characters/wise_coini.webp"
              alt="Wise Coini"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 object-contain"
            />
            <div className="relative flex-1 rounded-2xl border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,243,224,0.94)_100%)] px-4 py-3 text-card-foreground shadow-lg">
              <div
                aria-hidden="true"
                className="absolute -left-2 top-4 size-4 rotate-45 rounded-[4px] border-l border-t border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,243,224,0.94)_100%)]"
              />
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                {response}
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
