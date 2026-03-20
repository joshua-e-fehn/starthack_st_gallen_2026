"use client"

import { useMutation, useQuery } from "convex/react"
import { CornerDownLeftIcon, X } from "lucide-react"
import Image from "next/image"
import { useCallback, useState } from "react"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { ChatMessage, GameContext } from "@/lib/ai/chatbot"
import { cn } from "@/lib/utils"

type GameChatbotProps = {
  gameContext?: GameContext
  gameId?: string
  guestId?: string
  inlineTrigger?: boolean
  triggerClassName?: string
  floatingClassName?: string
}

export function GameChatbot({
  gameContext,
  gameId,
  guestId,
  inlineTrigger = false,
  triggerClassName,
  floatingClassName,
}: GameChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Real-time chat history from Convex
  const convexMessages = useQuery(
    api.game.getChatMessages,
    gameId ? { gameId: gameId as Id<"games">, guestId } : "skip",
  )
  const saveChatMessage = useMutation(api.game.saveChatMessage)

  const chatHistory = convexMessages ?? []

  const floatingPosition = floatingClassName ?? "bottom-6 right-6"

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading || !gameId) return

      const trimmed = text.trim()
      setIsLoading(true)

      // Save user message to Convex
      await saveChatMessage({
        gameId: gameId as Id<"games">,
        role: "user",
        text: trimmed,
        guestId,
      })

      // Build history for the API from persisted messages
      const historyForApi: ChatMessage[] = chatHistory.map(({ role, text: t }) => ({
        role,
        text: t,
      }))

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            gameContext,
            chatHistory: historyForApi,
          }),
        })

        const data = (await res.json()) as { message?: string; error?: string }
        const responseText = data.error
          ? `Error: ${data.error}`
          : (data.message ?? "No response received")

        // Save model response to Convex
        await saveChatMessage({
          gameId: gameId as Id<"games">,
          role: "model",
          text: responseText,
          guestId,
        })
      } catch (error) {
        await saveChatMessage({
          gameId: gameId as Id<"games">,
          role: "model",
          text: `Failed to reach advisor: ${error instanceof Error ? error.message : "Unknown error"}`,
          guestId,
        })
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, chatHistory, gameContext, gameId, guestId, saveChatMessage],
  )

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
    <div
      className={cn(
        "fixed z-50 flex w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl md:w-105",
        "h-[70vh] max-h-150",
        floatingPosition,
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <Image
          src="/characters/connie.webp"
          alt="Connie the Coin"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
        />
        <span className="flex-1 font-semibold text-lg">Hi, I am Connie!</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          aria-label="Close assistant"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages — auto-scrolling via Conversation */}
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-4 p-4">
          {/* Welcome message */}
          {chatHistory.length === 0 && !isLoading && (
            <Message from="assistant">
              <div className="flex items-start gap-3">
                <Image
                  src="/characters/connie.webp"
                  alt="Connie the Coin"
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 object-contain"
                />
                <MessageContent className="rounded-2xl border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,243,224,0.94)_100%)] px-3 py-2 shadow-sm">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    Greetings, merchant! I can see your trading position. Ask me anything about your
                    portfolio, market conditions, or what to trade next.
                  </p>
                </MessageContent>
              </div>
            </Message>
          )}

          {chatHistory.map((msg) =>
            msg.role === "user" ? (
              <Message key={msg._id} from="user">
                <MessageContent className="rounded-2xl bg-primary px-3 py-2 text-primary-foreground shadow-sm">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                    {msg.text}
                  </p>
                </MessageContent>
              </Message>
            ) : (
              <Message key={msg._id} from="assistant">
                <div className="flex items-start gap-3">
                  <Image
                    src="/characters/connie.webp"
                    alt="Connie the Coin"
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 object-contain"
                  />
                  <MessageContent className="rounded-2xl border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,243,224,0.94)_100%)] px-3 py-2 shadow-sm">
                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap wrap-break-word">
                      {msg.text}
                    </p>
                  </MessageContent>
                </div>
              </Message>
            ),
          )}

          {/* Loading indicator */}
          {isLoading && (
            <Message from="assistant">
              <div className="flex items-start gap-3">
                <Image
                  src="/characters/connie.webp"
                  alt="Connie the Coin"
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 object-contain"
                />
                <MessageContent className="rounded-2xl border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,243,224,0.94)_100%)] px-3 py-2 shadow-sm">
                  <p className="text-sm text-muted-foreground animate-pulse">Thinking...</p>
                </MessageContent>
              </div>
            </Message>
          )}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="shrink-0 border-t p-3">
        <PromptInput
          onSubmit={({ text }) => {
            void handleSend(text)
          }}
        >
          <PromptInputTextarea
            placeholder="Ask about your portfolio, market, or strategy..."
            disabled={isLoading}
            className="min-h-10 max-h-24"
          />
          <PromptInputSubmit disabled={isLoading}>
            <CornerDownLeftIcon className="size-4" />
          </PromptInputSubmit>
        </PromptInput>
      </div>
    </div>
  )
}
