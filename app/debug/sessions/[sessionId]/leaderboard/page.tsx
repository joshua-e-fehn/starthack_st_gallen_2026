"use client"

import { useQuery } from "convex/react"
import { AnimatePresence, motion } from "framer-motion"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

function LeaderboardContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = params.sessionId as Id<"sessions">
  const step = Number(searchParams.get("step") ?? "0")
  const gameId = searchParams.get("gameId") ?? ""
  const playerName = searchParams.get("name") ?? ""

  const data = useQuery(api.game.getStepLeaderboard, { sessionId, step })

  // Reveal animation state
  const [revealIndex, setRevealIndex] = useState(-1)
  const [isRevealing, setIsRevealing] = useState(true)

  // Kahoot-style: reveal from last place to first, one by one
  useEffect(() => {
    if (!data?.leaderboard?.length) return

    const total = data.leaderboard.length
    let currentIndex = total // start from bottom

    setRevealIndex(-1)
    setIsRevealing(true)

    const timer = setInterval(() => {
      currentIndex--
      if (currentIndex < 0) {
        clearInterval(timer)
        setIsRevealing(false)
        return
      }
      setRevealIndex(currentIndex)
    }, 600)

    return () => clearInterval(timer)
  }, [data?.leaderboard?.length])

  if (data === undefined)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl">🏰</div>
          <p className="text-muted-foreground animate-pulse text-lg">Loading results...</p>
        </div>
      </div>
    )
  if (data === null)
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Session not found.</p>
      </div>
    )

  const { session, scenarioName, leaderboard } = data

  // Find current player's rank
  const myRank = leaderboard.findIndex((e) => e.gameId === gameId) + 1
  const myEntry = leaderboard.find((e) => e.gameId === gameId)

  // Medal assignments
  const getMedal = (rank: number) => {
    if (rank === 1) return "🥇"
    if (rank === 2) return "🥈"
    if (rank === 3) return "🥉"
    return `#${rank}`
  }

  // Color for rank background
  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-yellow-400/20 to-yellow-600/10 border-yellow-500/40"
    if (rank === 2) return "from-gray-300/20 to-gray-400/10 border-gray-400/40"
    if (rank === 3) return "from-orange-400/20 to-orange-500/10 border-orange-500/40"
    return "from-muted/30 to-muted/10 border-border"
  }

  // Should this row be visible?
  const isVisible = (index: number) => revealIndex <= index || !isRevealing

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{session.name}</h1>
            <p className="text-muted-foreground text-sm">{scenarioName}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tabular-nums">
              Year {leaderboard[0]?.date ?? step}
            </div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">
              Step {step} of {leaderboard[0]?.date ? "30" : "?"}
            </p>
          </div>
        </div>
      </div>

      {/* My result highlight */}
      {myEntry && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mx-auto mt-6 w-full max-w-3xl px-6"
        >
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-center">
            <p className="text-muted-foreground text-sm">Your Result</p>
            <p className="mt-1 text-4xl font-bold">
              {getMedal(myRank)}{" "}
              <span className="text-primary">
                {myEntry.score.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}{" "}
                gold
              </span>
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {playerName || myEntry.playerName} · Rank {myRank} of {leaderboard.length}
              {myEntry.goalReached && " · 🎯 Goal reached!"}
            </p>
          </div>
        </motion.div>
      )}

      {/* Leaderboard */}
      <div className="mx-auto mt-6 w-full max-w-3xl flex-1 px-6 pb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Leaderboard</h2>
          {isRevealing && (
            <Badge variant="secondary" className="animate-pulse">
              Revealing...
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {leaderboard.map((entry, index) => {
              const rank = index + 1
              const isMe = entry.gameId === gameId
              const visible = isVisible(index)

              if (!visible) return null

              return (
                <motion.div
                  key={entry.gameId}
                  layout
                  initial={{ opacity: 0, x: 60, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    delay: index === revealIndex ? 0 : 0.05,
                  }}
                  className={`relative overflow-hidden rounded-lg border bg-gradient-to-r ${getRankColor(rank)} ${
                    isMe ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                  }`}
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Rank */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/60 text-lg font-bold">
                      {getMedal(rank)}
                    </div>

                    {/* Player info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`truncate font-semibold ${isMe ? "text-primary" : ""}`}>
                          {entry.playerName}
                        </span>
                        {isMe && (
                          <Badge variant="default" className="shrink-0 text-[10px]">
                            YOU
                          </Badge>
                        )}
                        {entry.goalReached && (
                          <Badge
                            variant="secondary"
                            className="shrink-0 bg-green-500/10 text-green-600 text-[10px]"
                          >
                            🎯 Goal
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {entry.status === "finished" ? "Finished" : `Year ${entry.date}`}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums">
                        {entry.score.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </p>
                      <p className="text-muted-foreground text-[10px] uppercase">gold</p>
                    </div>
                  </div>

                  {/* Rank 1 glow effect */}
                  {rank === 1 && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-transparent to-yellow-400/10"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                    />
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>

          {leaderboard.length === 0 && (
            <div className="py-12 text-center">
              <div className="mb-2 text-4xl">🏰</div>
              <p className="text-muted-foreground">No players have completed this step yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 border-t bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/debug/sessions/${sessionId}?name=${encodeURIComponent(playerName)}`)
            }
          >
            ← Back to Session
          </Button>
          {gameId && (
            <Button
              onClick={() => router.push(`/dashboard/game?sessionId=${sessionId}&gameId=${gameId}`)}
            >
              Continue Playing →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground animate-pulse">Loading leaderboard...</p>
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  )
}
