"use client"

import confetti from "canvas-confetti"
import { useQuery } from "convex/react"
import { AnimatePresence, motion } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"
import { AssetDistributionBar } from "@/components/molecules/asset-distribution-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

function LeaderboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("sessionId") as Id<"sessions">
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
    let currentIndex = total

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

  // Derive player data (hooks must be before early returns)
  const leaderboard = data?.leaderboard ?? []
  const myEntry = leaderboard.find((e) => e.gameId === gameId)

  // Confetti only the FIRST time goal is reached in this session
  const confettiFired = useRef(false)
  useEffect(() => {
    if (!myEntry?.goalReached || confettiFired.current || isRevealing) return
    const storageKey = `confetti_${sessionId}`
    if (typeof window !== "undefined" && sessionStorage.getItem(storageKey)) {
      confettiFired.current = true
      return
    }
    confettiFired.current = true
    if (typeof window !== "undefined") sessionStorage.setItem(storageKey, "1")
    const end = Date.now() + 2500
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#FFD700", "#FFA500", "#FF6347", "#00CED1", "#7B68EE"],
      })
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#FFD700", "#FFA500", "#FF6347", "#00CED1", "#7B68EE"],
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [myEntry?.goalReached, isRevealing, sessionId])

  if (data === undefined)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl">🏰</div>
          <p className="animate-pulse text-lg text-muted-foreground">Loading results...</p>
        </div>
      </div>
    )
  if (data === null)
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Session not found.</p>
      </div>
    )

  const { session, scenarioName } = data

  const myRank = leaderboard.findIndex((e) => e.gameId === gameId) + 1

  const getMedal = (rank: number) => {
    if (rank === 1) return "🥇"
    if (rank === 2) return "🥈"
    if (rank === 3) return "🥉"
    return `#${rank}`
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-yellow-400/20 to-yellow-600/10 border-yellow-500/40"
    if (rank === 2) return "from-gray-300/20 to-gray-400/10 border-gray-400/40"
    if (rank === 3) return "from-orange-400/20 to-orange-500/10 border-orange-500/40"
    return "from-muted/30 to-muted/10 border-border"
  }

  const isVisible = (index: number) => revealIndex <= index || !isRevealing

  return (
    <div className="bg-linear-to-b from-background to-muted/30 flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{session.name}</h1>
            <p className="text-sm text-muted-foreground">{scenarioName}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tabular-nums">
              Year {leaderboard[0]?.date ?? step}
            </div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
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
            <p className="text-sm text-muted-foreground">Your Result</p>
            <p className="mt-1 text-4xl font-bold">
              {getMedal(myRank)}{" "}
              <span className="text-primary">
                {myEntry.score.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}{" "}
                taler
              </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {playerName || myEntry.playerName} · Rank {myRank} of {leaderboard.length}
              {myEntry.goalReached && " · 🎯 Goal reached!"}
            </p>{" "}
            {/* Goal progress bar */}
            {myEntry.goal > 0 && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Goal Progress</span>
                  <span className="font-mono tabular-nums">
                    {myEntry.score.toLocaleString(undefined, { maximumFractionDigits: 0 })} /{" "}
                    {myEntry.goal.toLocaleString(undefined, { maximumFractionDigits: 0 })} taler
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={`h-full rounded-full ${
                      myEntry.score >= myEntry.goal ? "bg-green-500" : "bg-primary"
                    }`}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (myEntry.score / myEntry.goal) * 100)}%`,
                    }}
                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}{" "}
          </div>
        </motion.div>
      )}

      {/* Leaderboard */}
      <div className="mx-auto mt-6 w-full max-w-3xl flex-1 px-6 pb-28">
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
              const maxScore = leaderboard[0]?.score || 1

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
                  className={`relative overflow-hidden rounded-lg border bg-linear-to-r ${getRankColor(rank)} ${
                    isMe ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                  }`}
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/60 text-lg font-bold">
                      {getMedal(rank)}
                    </div>

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
                            className="shrink-0 bg-green-500/10 text-[10px] text-green-600"
                          >
                            🎯 Goal
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.status === "finished" ? "Finished" : `Year ${entry.date}`}
                      </p>
                      <AssetDistributionBar
                        breakdown={entry.assetBreakdown}
                        scalePercent={(entry.score / maxScore) * 100}
                        showDetails={rank <= 3}
                        className="mt-1.5"
                      />
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums">
                        {entry.score.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </p>
                      <p className="text-[10px] uppercase text-muted-foreground">taler</p>
                    </div>
                  </div>

                  {rank === 1 && (
                    <motion.div
                      className="bg-linear-to-r absolute inset-0 from-yellow-400/10 via-transparent to-yellow-400/10"
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
      <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/90 backdrop-blur-md supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-4 px-6 py-4">
          {gameId && (
            <motion.div
              className="w-full max-w-sm"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <div className="relative overflow-hidden rounded-xl">
                <Button
                  className="relative h-12 w-full overflow-hidden rounded-xl border border-primary/60 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.45),transparent_40%),linear-gradient(110deg,oklch(0.8_0.15_88)_0%,oklch(0.88_0.17_90)_40%,oklch(0.95_0.18_95)_52%,oklch(0.88_0.17_90)_64%,oklch(0.8_0.15_88)_100%)] text-primary-foreground font-black tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-10px_18px_rgba(166,108,0,0.2),0_14px_34px_rgba(239,173,0,0.42)]"
                  onClick={() =>
                    router.push(`/game?sessionId=${sessionId}&gameId=${gameId}&showEvent=1`)
                  }
                >
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute -inset-y-2 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-white/95 to-transparent blur-md"
                    initial={{ x: "-140%", opacity: 0.9 }}
                    animate={{ x: ["-140%", "320%"] }}
                    transition={{
                      duration: 2,
                      ease: "linear",
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  />
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute -inset-y-2 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-amber-100/85 to-transparent blur-lg"
                    initial={{ x: "-140%", opacity: 0.72 }}
                    animate={{ x: ["-140%", "320%"] }}
                    transition={{
                      duration: 2,
                      ease: "linear",
                      repeat: Number.POSITIVE_INFINITY,
                      delay: 1,
                    }}
                  />

                  <span className="relative z-10">Continue Playing →</span>
                </Button>
              </div>
            </motion.div>
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
          <p className="animate-pulse text-muted-foreground">Loading leaderboard...</p>
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  )
}
