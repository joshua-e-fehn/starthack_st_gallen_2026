"use client"

import { Send, X } from "lucide-react"
import Image from "next/image"
import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import type { ChatMessage, GameContext } from "@/lib/ai/chatbot"
import { cn } from "@/lib/utils"

type ChatBubble = ChatMessage & { id: number }

type GameChatbotProps = {
  gameContext?: GameContext
  inlineTrigger?: boolean
  triggerClassName?: string
  floatingClassName?: string
}

export function GameChatbot({
  gameContext,
  inlineTrigger = false,
  triggerClassName,
  floatingClassName,
}: GameChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatBubble[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const nextId = useRef(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    })
  }, [])

  const floatingPosition = floatingClassName ?? "bottom-6 right-6"

  async function handleSendMessage() {
    if (!message.trim() || isLoading) return

    const userMsg: ChatBubble = { id: nextId.current++, role: "user", text: message.trim() }
    setChatHistory((prev) => [...prev, userMsg])
    setMessage("")
    setIsLoading(true)
    scrollToBottom()

    // Build history for the API (exclude the message we're about to send)
    const historyForApi: ChatMessage[] = chatHistory.map(({ role, text }) => ({ role, text }))

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          gameContext,
          chatHistory: historyForApi,
        }),
      })

      const data = (await res.json()) as { message?: string; error?: string }
      const responseText = data.error
        ? `Error: ${data.error}`
        : (data.message ?? "No response received")

      const modelMsg: ChatBubble = { id: nextId.current++, role: "model", text: responseText }
      setChatHistory((prev) => [...prev, modelMsg])
    } catch (error) {
      const modelMsg: ChatBubble = {
        id: nextId.current++,
        role: "model",
        text: `Failed to reach advisor: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
      setChatHistory((prev) => [...prev, modelMsg])
    } finally {
      setIsLoading(false)
      scrollToBottom()
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSendMessage()
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          inlineTrigger
            ? "flex items-center justify-center rounded-2xl bg-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            : "fixed z-50 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg transition-transform hover:scale-105 active:scale-95",
          inlineTrigger ? triggerClassName : floatingPosition,
        )}
        aria-label="Open AI assistant"
      >
        <Image
          src="/characters/connie.webp"
          alt="AI Assistant"
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
        />
      </button>
    )
  }

  return (
    <Card
      className={cn(
        "fixed z-50 flex w-[calc(100vw-3rem)] max-h-[70vh] flex-col md:w-105 md:max-h-150 shadow-2xl",
        floatingPosition,
      )}
    >
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-0 shrink-0">
        <Image
          src="/characters/connie.webp"
          alt="Connie the Coin"
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
        />
        <div className="flex-1">
          <CardTitle className="text-lg">Hi, I am Connie!</CardTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          aria-label="Close assistant"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-3">
        {/* Chat history */}
        <ScrollArea className="flex-1 min-h-0 max-h-[calc(70vh-12rem)] md:max-h-100">
          <div className="space-y-3 pr-3">
            {/* Welcome message */}
            {chatHistory.length === 0 && !isLoading && (
              <div className="flex items-start gap-3">
                <Image
                  src="/characters/connie.webp"
                  alt="Connie the Coin"
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 object-contain"
                />
                <div className="relative flex-1 rounded-2xl border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,243,224,0.94)_100%)] px-3 py-2 text-card-foreground shadow-sm">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    Greetings, merchant! I can see your trading position. Ask me anything about your
                    portfolio, market conditions, or what to trade next.
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            {chatHistory.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground shadow-sm">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex items-start gap-3">
                  <Image
                    src="/characters/connie.webp"
                    alt="Connie the Coin"
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 object-contain"
                  />
                  <div className="relative flex-1 rounded-2xl border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,243,224,0.94)_100%)] px-3 py-2 text-card-foreground shadow-sm">
                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap wrap-break-word">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ),
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <Image
                  src="/characters/connie.webp"
                  alt="Connie the Coin"
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 object-contain"
                />
                <div className="rounded-2xl border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,243,224,0.94)_100%)] px-3 py-2 shadow-sm">
                  <p className="text-sm text-muted-foreground animate-pulse">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="space-y-2 shrink-0">
          <Textarea
            placeholder="Ask about your portfolio, market, or strategy..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={isLoading}
            className="resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
                Ask Connie
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
