"use client"

import { useQuery } from "convex/react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ActivityIcon,
  ArrowLeftIcon,
  ChevronDown,
  CopyIcon,
  Loader2,
  QrCodeIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { authClient } from "@/lib/auth-client"
import { cn, isValidConvexId } from "@/lib/utils"

const MAX_VISIBLE = 7

function formatTaler(value: number) {
  return `${new Intl.NumberFormat("de-CH").format(Math.round(value))} taler`
}

const ASSET_META = [
  { key: "gold" as const, label: "Taler", icon: "/asset-classes/taler.webp", color: "#FFD700" },
  { key: "wood" as const, label: "Wood", icon: "/asset-classes/wood.webp", color: "#8B5E3C" },
  {
    key: "potatoes" as const,
    label: "Potatoes",
    icon: "/asset-classes/potatoes.webp",
    color: "#C4A35A",
  },
  { key: "fish" as const, label: "Fish", icon: "/asset-classes/fish.webp", color: "#5B9BD5" },
]

type AssetBreakdown = {
  gold: number
  wood: number
  potatoes: number
  fish: number
  total: number
}

type LeaderboardEntry = {
  gameId: string
  playerName: string
  status: string
  netWorth: number
  assetBreakdown?: AssetBreakdown
}

type Row =
  | { type: "player"; entry: LeaderboardEntry; rank: number }
  | { type: "gap"; hiddenCount: number }

function sliceLeaderboard(entries: LeaderboardEntry[]): Row[] {
  if (entries.length <= MAX_VISIBLE) {
    return entries.map((entry, i) => ({ type: "player" as const, entry, rank: i }))
  }

  const rows: Row[] = []
  const n = entries.length
  const lastIdx = n - 1
  const medianCenter = Math.floor(n / 2)

  for (let i = 0; i < 3; i++) {
    rows.push({ type: "player", entry: entries[i], rank: i })
  }

  const medianStart = medianCenter - 1
  const medianEnd = medianCenter + 1

  if (medianStart > 3) {
    rows.push({ type: "gap", hiddenCount: medianStart - 3 })
  }

  for (let i = medianStart; i <= medianEnd; i++) {
    rows.push({ type: "player", entry: entries[i], rank: i })
  }

  if (lastIdx - medianEnd > 1) {
    rows.push({ type: "gap", hiddenCount: lastIdx - medianEnd - 1 })
  }

  rows.push({ type: "player", entry: entries[lastIdx], rank: lastIdx })

  return rows
}

export default function SlideshowSessionPage() {
  const params = useParams()
  const router = useRouter()
  const rawSessionId = params.sessionId as string
  const sessionId = rawSessionId as Id<"sessions">
  const validId = isValidConvexId(rawSessionId)
  const { data: authSession } = authClient.useSession()

  const sessionData = useQuery(api.game.getSessionWithLeaderboard, validId ? { sessionId } : "skip")

  const [copied, setCopied] = useState(false)
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null)

  const isHost =
    authSession?.user && sessionData ? sessionData.session.hostId === authSession.user.id : null

  useEffect(() => {
    if (isHost === false) {
      router.replace("/dashboard")
    }
  }, [isHost, router])

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/game/lobby/${sessionId}`
  }, [sessionId])

  const handleCopyCode = useCallback(async () => {
    if (!sessionData) return
    try {
      await navigator.clipboard.writeText(sessionData.session.joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [sessionData, joinUrl])

  if (!validId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-lg text-muted-foreground">Competition not found.</p>
      </div>
    )
  }

  if (!sessionData || isHost === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isHost === false) {
    return null
  }

  const { session, leaderboard } = sessionData

  return (
    <div className="mx-auto w-full max-w-350 px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="sticky top-4 border-primary/20 bg-card/95 shadow-lg backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCodeIcon className="size-4 text-primary" />
                Join Game
              </CardTitle>
              <CardDescription>Players scan and join this session instantly.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl border-2 border-primary/20 bg-white p-4 shadow-sm">
                  <QRCodeSVG
                    value={joinUrl}
                    size={220}
                    level="M"
                    marginSize={2}
                    className="h-auto w-full max-w-56"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Scan to join competition lobby</p>
              </div>

              <div className="space-y-2">
                <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Join Code
                </p>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={cn(
                    "group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed py-4 transition-all duration-200 active:scale-[0.98]",
                    copied
                      ? "border-green-500/40 bg-green-500/5"
                      : "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10",
                  )}
                >
                  <span className="font-mono text-3xl font-black tracking-[0.4em] text-primary sm:text-4xl">
                    {session.joinCode}
                  </span>
                  <CopyIcon className="size-5 text-muted-foreground" />
                </button>
                {copied && (
                  <p className="text-center text-xs text-green-600">Copied to clipboard!</p>
                )}
              </div>

              <div className="rounded-lg border bg-muted/40 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Direct Link
                </p>
                <p className="mt-1 break-all font-mono text-xs text-foreground/80">{joinUrl}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="h-full border-primary/20 bg-card/95 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrophyIcon className="size-4 text-primary" />
                Leaderboard
                <Badge variant="secondary" className="ml-auto text-xs">
                  {leaderboard.length} joined
                </Badge>
              </CardTitle>
              <CardDescription>
                Live rankings, mirroring the competitions leaderboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <UsersIcon className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Waiting for players to join...</p>
                </div>
              ) : (
                <ScrollArea className="h-[68vh] pr-2">
                  <div className="space-y-2">
                    {(() => {
                      const maxNetWorth = leaderboard[0]?.netWorth || 1
                      return sliceLeaderboard(leaderboard).map((row, i) => {
                        if (row.type === "gap") {
                          return (
                            <div
                              key={`gap-${row.hiddenCount}`}
                              className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground"
                            >
                              <span className="h-px flex-1 bg-border" />
                              <span className="font-mono">
                                ... {row.hiddenCount} more player{row.hiddenCount !== 1 ? "s" : ""}{" "}
                                ...
                              </span>
                              <span className="h-px flex-1 bg-border" />
                            </div>
                          )
                        }

                        const { entry, rank } = row
                        const isGold = rank === 0
                        const isSilver = rank === 1
                        const isBronze = rank === 2
                        const isLast = rank === leaderboard.length - 1 && leaderboard.length > 1
                        const medianCenter = Math.floor(leaderboard.length / 2)
                        const isMedian =
                          leaderboard.length > MAX_VISIBLE &&
                          rank >= medianCenter - 1 &&
                          rank <= medianCenter + 1
                        const fillPct = Math.max(
                          0,
                          Math.min(100, (entry.netWorth / maxNetWorth) * 100),
                        )

                        const isExpanded = expandedGameId === entry.gameId
                        const breakdown = entry.assetBreakdown

                        return (
                          <motion.div
                            key={entry.gameId}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={cn(
                              "relative cursor-pointer overflow-hidden rounded-lg border transition-colors",
                              isGold
                                ? "border-yellow-500/30"
                                : isSilver
                                  ? "border-slate-400/30"
                                  : isBronze
                                    ? "border-amber-700/20"
                                    : isLast
                                      ? "border-rose-400/20"
                                      : "border-border/70",
                            )}
                            onClick={() => setExpandedGameId(isExpanded ? null : entry.gameId)}
                          >
                            <div className="relative flex items-center justify-between px-3 py-2.5">
                              <div
                                className={cn(
                                  "pointer-events-none absolute inset-y-0 left-0 rounded-r-sm transition-all duration-500",
                                  isGold
                                    ? "bg-yellow-400/25"
                                    : isSilver
                                      ? "bg-slate-400/20"
                                      : isBronze
                                        ? "bg-amber-600/20"
                                        : isLast
                                          ? "bg-rose-400/20"
                                          : "bg-primary/15",
                                )}
                                style={{ width: `${fillPct}%` }}
                              />

                              <div className="relative z-10 flex items-center gap-3">
                                <span
                                  className={cn(
                                    "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                                    isGold
                                      ? "bg-yellow-500 text-yellow-950"
                                      : isSilver
                                        ? "bg-slate-400 text-white"
                                        : isBronze
                                          ? "bg-amber-700 text-white"
                                          : isLast
                                            ? "bg-rose-400 text-white"
                                            : "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {rank + 1}
                                </span>
                                <div>
                                  <p className="text-sm font-bold">
                                    {entry.playerName}
                                    {isMedian && (
                                      <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                                        median
                                      </span>
                                    )}
                                  </p>
                                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <ActivityIcon className="size-2" />
                                    {entry.status}
                                  </p>
                                </div>
                              </div>

                              <div className="relative z-10 flex items-center gap-2">
                                <p className="font-mono text-sm font-black text-primary">
                                  {formatTaler(entry.netWorth)}
                                </p>
                                <ChevronDown
                                  className={cn(
                                    "size-4 text-muted-foreground transition-transform duration-200",
                                    isExpanded && "rotate-180",
                                  )}
                                />
                              </div>
                            </div>

                            <AnimatePresence>
                              {isExpanded && breakdown && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="border-t border-border/50 bg-muted/30 px-3 py-2.5">
                                    <div className="grid grid-cols-4 gap-2">
                                      {ASSET_META.map((asset) => {
                                        const value = breakdown[asset.key]
                                        const pct =
                                          breakdown.total > 0
                                            ? Math.round((value / breakdown.total) * 100)
                                            : 0
                                        return (
                                          <div
                                            key={asset.key}
                                            className="flex flex-col items-center justify-between rounded-lg bg-background/60 px-1.5 py-2"
                                          >
                                            <div className="flex h-6 items-center justify-center">
                                              <Image
                                                src={asset.icon}
                                                alt={asset.label}
                                                width={20}
                                                height={20}
                                                className="object-contain"
                                              />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground">
                                              {asset.label}
                                            </span>
                                            <span className="mt-auto font-mono text-xs font-black">
                                              {pct}%
                                            </span>
                                            <div className="mt-1 h-1 w-full rounded-full bg-muted">
                                              <div
                                                className="h-full rounded-full transition-all duration-300"
                                                style={{
                                                  width: `${pct}%`,
                                                  backgroundColor: asset.color,
                                                }}
                                              />
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })
                    })()}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
