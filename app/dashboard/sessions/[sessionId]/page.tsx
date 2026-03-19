"use client"

import { useQuery } from "convex/react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ActivityIcon,
  ArrowLeftIcon,
  CheckIcon,
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
import { useCallback, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

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

/**
 * Smart leaderboard slice for large player counts.
 *
 * ≤ 7 players  → show all
 * 8 players    → top 3, median 3, (...), last 1
 * ≥ 9 players  → top 3, (...), median 3, (...), last 1
 *
 * Always displays exactly 7 player rows when truncating.
 */
function sliceLeaderboard(entries: LeaderboardEntry[]): Row[] {
  if (entries.length <= MAX_VISIBLE) {
    return entries.map((entry, i) => ({ type: "player" as const, entry, rank: i }))
  }

  const rows: Row[] = []
  const n = entries.length
  const lastIdx = n - 1
  const medianCenter = Math.floor(n / 2)

  // Top 3
  for (let i = 0; i < 3; i++) {
    rows.push({ type: "player", entry: entries[i], rank: i })
  }

  // Median 3 (centered around the median)
  const medianStart = medianCenter - 1
  const medianEnd = medianCenter + 1

  // Gap between top 3 and median 3 (only when ≥ 9)
  if (medianStart > 3) {
    rows.push({ type: "gap", hiddenCount: medianStart - 3 })
  }

  for (let i = medianStart; i <= medianEnd; i++) {
    rows.push({ type: "player", entry: entries[i], rank: i })
  }

  // Gap between median 3 and last 1
  if (lastIdx - medianEnd > 1) {
    rows.push({ type: "gap", hiddenCount: lastIdx - medianEnd - 1 })
  }

  // Last 1
  rows.push({ type: "player", entry: entries[lastIdx], rank: lastIdx })

  return rows
}

export default function SessionLobbyPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as Id<"sessions">

  const sessionData = useQuery(api.game.getSessionWithLeaderboard, { sessionId })

  const [copied, setCopied] = useState(false)
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null)

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/?sessionId=${sessionId}`
  }, [sessionId])

  const handleCopyCode = useCallback(async () => {
    if (!sessionData) return
    try {
      await navigator.clipboard.writeText(sessionData.session.joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: copy the full URL
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [sessionData, joinUrl])

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  if (!sessionData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  const { session, leaderboard } = sessionData

  return (
    <div className="flex flex-1 flex-col items-center p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={handleBack}>
            <ArrowLeftIcon className="mr-1 size-4" />
            Back
          </Button>

          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{session.name}</h1>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                session.status === "active"
                  ? "border-green-500/30 bg-green-500/10 text-green-700"
                  : "border-muted",
              )}
            >
              {session.status}
            </Badge>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="join" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="join" className="flex-1 gap-1.5">
              <QrCodeIcon className="size-3.5" />
              Join Game
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1 gap-1.5">
              <TrophyIcon className="size-3.5" />
              Leaderboard
              {leaderboard.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {leaderboard.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Join Game ── */}
          <TabsContent value="join">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-primary/20 bg-card/95 shadow-lg backdrop-blur">
                <CardHeader className="pb-3">
                  <CardDescription>Share this code or QR for players to join</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="rounded-2xl border-2 border-primary/20 bg-white p-4 shadow-sm">
                      <QRCodeSVG
                        value={joinUrl}
                        size={200}
                        level="M"
                        marginSize={2}
                        className="h-auto w-full max-w-50"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <QrCodeIcon className="size-3.5" />
                      Scan to join instantly
                    </div>
                  </div>

                  {/* Join Code */}
                  <div className="space-y-2">
                    <p className="block text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Or enter this code
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 py-4 transition-colors hover:border-primary/50 hover:bg-primary/10"
                    >
                      <span className="font-mono text-4xl font-black tracking-[0.4em] text-primary">
                        {session.joinCode}
                      </span>
                      {copied ? (
                        <CheckIcon className="size-5 text-green-600" />
                      ) : (
                        <CopyIcon className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </button>
                    {copied && (
                      <p className="text-center text-xs text-green-600">Copied to clipboard!</p>
                    )}
                  </div>

                  {/* Direct link */}
                  <div className="rounded-lg border bg-muted/40 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Direct Link
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-foreground/80">{joinUrl}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── Tab 2: Leaderboard ── */}
          <TabsContent value="leaderboard">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-primary/20 bg-card/95 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrophyIcon className="size-4 text-primary" />
                    Leaderboard
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {leaderboard.length} joined
                    </Badge>
                  </CardTitle>
                  <CardDescription>Live rankings — updates as players trade.</CardDescription>
                </CardHeader>
                <CardContent>
                  {leaderboard.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                      <div className="rounded-full bg-muted p-3">
                        <UsersIcon className="size-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Waiting for players to join...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Share the QR code or join code on the Join Game tab
                      </p>
                    </div>
                  ) : (
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
                                  ··· {row.hiddenCount} more player
                                  {row.hiddenCount !== 1 ? "s" : ""} ···
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
                                "relative overflow-hidden rounded-lg border cursor-pointer transition-colors",
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
                              {/* Main row */}
                              <div className="relative flex items-center justify-between px-3 py-2.5">
                                {/* Progress fill background */}
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

                              {/* Expanded asset breakdown */}
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
                                              {/* Mini bar */}
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
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
