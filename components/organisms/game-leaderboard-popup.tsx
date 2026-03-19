"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Trophy, Users } from "lucide-react"
import { useCallback, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

type LeaderboardEntry = {
  gameId: string
  playerName: string
  status: string
  netWorth: number
  date?: number
}

export function GameLeaderboardPopup({
  open,
  onOpenChange,
  sessionJoinCode,
  sessionId,
  leaderboard,
  onOpenFullLeaderboard,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionJoinCode?: string
  sessionId: string | null
  leaderboard: LeaderboardEntry[]
  onOpenFullLeaderboard: (path: string) => void
}) {
  const [revealIndex, setRevealIndex] = useState(-1)

  // Simple reveal animation when popup opens
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange(newOpen)
      if (newOpen && leaderboard.length > 0) {
        setRevealIndex(-1)
        let currentIndex = leaderboard.length

        const timer = setInterval(() => {
          currentIndex--
          if (currentIndex < 0) {
            clearInterval(timer)
            return
          }
          setRevealIndex(currentIndex)
        }, 150)

        return () => clearInterval(timer)
      }
    },
    [leaderboard.length, onOpenChange],
  )

  const getMedal = useCallback((rank: number) => {
    if (rank === 1) return "🥇"
    if (rank === 2) return "🥈"
    if (rank === 3) return "🥉"
    return `#${rank}`
  }, [])

  const getRankColor = useCallback((rank: number) => {
    if (rank === 1) return "from-yellow-400/20 to-yellow-600/10 border-yellow-500/40"
    if (rank === 2) return "from-gray-300/20 to-gray-400/10 border-gray-400/40"
    if (rank === 3) return "from-orange-400/20 to-orange-500/10 border-orange-500/40"
    return "from-muted/30 to-muted/10 border-border"
  }, [])

  const isVisible = useCallback(
    (index: number) => revealIndex <= index || revealIndex === -1,
    [revealIndex],
  )

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="mx-auto w-full max-w-2xl rounded-t-2xl">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2 text-left">
            <Trophy className="size-5 text-yellow-500" />
            Session Leaderboard
          </DrawerTitle>
          <DrawerDescription className="text-left">
            Live rankings based on current net worth.
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-4">
          <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
            <Badge variant="outline" className="flex h-6 items-center gap-1">
              <Users className="size-3" />
              {leaderboard.length} Players
            </Badge>
            {sessionJoinCode ? (
              <span className="text-xs text-muted-foreground">
                Join code:{" "}
                <span className="font-mono font-semibold text-foreground">{sessionJoinCode}</span>
              </span>
            ) : null}
          </div>

          {!sessionId ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No active session found. Join or create a session to see the leaderboard.
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No players have started yet.
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {leaderboard.map((entry, index) => {
                  const rank = index + 1
                  const visible = isVisible(index)

                  if (!visible) return null

                  return (
                    <motion.div
                      key={entry.gameId}
                      layout
                      initial={{ opacity: 0, x: 40, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                        delay: index === revealIndex ? 0 : 0.05,
                      }}
                      className={`relative overflow-hidden rounded-lg border bg-linear-to-r ${getRankColor(rank)} px-4 py-3 transition-all`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/60 text-base font-bold">
                          {getMedal(rank)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{entry.playerName}</div>
                          <p className="text-xs text-muted-foreground">
                            {entry.status === "finished" ? "Finished" : `Year ${entry.date ?? 0}`}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-base font-bold tabular-nums">
                            {Math.round(entry.netWorth).toLocaleString()}
                          </p>
                          <p className="text-[10px] uppercase text-muted-foreground">gold</p>
                        </div>
                      </div>

                      {rank === 1 && (
                        <motion.div
                          className="absolute inset-0 bg-linear-to-r from-yellow-400/10 via-transparent to-yellow-400/10"
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        />
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}

          {sessionId && leaderboard.length > 0 && (
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => {
                onOpenFullLeaderboard(`/dashboard/sessions/${sessionId}/leaderboard?step=0&gameId=`)
              }}
            >
              View Full Leaderboard →
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
