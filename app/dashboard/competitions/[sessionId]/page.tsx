"use client"

import { useQuery } from "convex/react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ActivityIcon,
  ArrowLeftIcon,
  BarChart3Icon,
  CheckIcon,
  ChevronDown,
  CopyIcon,
  Loader2,
  PresentationIcon,
  QrCodeIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { PublicHeader } from "@/components/organisms/public-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const rawSessionId = params.sessionId as string
  const sessionId = rawSessionId as Id<"sessions">
  const validId = isValidConvexId(rawSessionId)
  const { data: authSession } = authClient.useSession()

  const sessionData = useQuery(api.game.getSessionWithLeaderboard, validId ? { sessionId } : "skip")
  const _analyticsData = useQuery(
    api.game.getCompetitionAnalytics,
    validId ? { sessionId } : "skip",
  )

  const [copied, setCopied] = useState(false)
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null)

  // Host-only gate: redirect non-hosts to the dashboard
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
      // Fallback: copy the full URL
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [sessionData, joinUrl])

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  if (!validId) {
    return (
      <div className="min-h-dvh bg-background">
        <PublicHeader />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-lg text-muted-foreground">Competition not found.</p>
          <Button variant="outline" onClick={() => router.replace("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (!sessionData || isHost === null) {
    return (
      <div className="min-h-dvh bg-background">
        <PublicHeader />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (isHost === false) {
    return null
  }

  const { session, leaderboard } = sessionData

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={handleBack}>
            <ArrowLeftIcon className="mr-1 size-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between gap-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{session.name}</h1>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/dashboard/slideshow/${sessionId}`)}
              >
                <PresentationIcon className="size-4" />
                Open Slideshow
              </Button>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your competition — share the join code and track player progress.
          </p>
        </motion.div>

        {/* Content — centered max-w-xl for the tabs */}
        <div className="mx-auto max-w-xl">
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
              <TabsTrigger value="analytics" className="flex-1 gap-1.5">
                <BarChart3Icon className="size-3.5" />
                Analytics
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
                        className={cn(
                          "group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed py-4 transition-all duration-200 active:scale-[0.98]",
                          copied
                            ? "border-green-500/40 bg-green-500/5"
                            : "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10",
                        )}
                      >
                        <span className="font-mono text-4xl font-black tracking-[0.4em] text-primary">
                          {session.joinCode}
                        </span>
                        {copied ? (
                          <CheckIcon className="size-5 text-green-600" />
                        ) : (
                          <CopyIcon className="size-5 text-muted-foreground" />
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
                      <p className="mt-1 break-all font-mono text-xs text-foreground/80">
                        {joinUrl}
                      </p>
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

            {/* ── Tab 3: Analytics ── */}
            <TabsContent value="analytics">
              <AnalyticsFunnel sessionId={sessionId} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

// ─── Analytics Funnel Component ──────────────────────────────────

function FunnelBar({
  label,
  count,
  maxCount,
  index,
  color,
  trackColor,
  prevCount,
}: {
  label: string
  count: number
  maxCount: number
  index: number
  color: string
  trackColor: string
  prevCount?: number
}) {
  const pct = Math.round((count / maxCount) * 100)
  const dropoff =
    prevCount !== undefined && prevCount > 0
      ? Math.round(((prevCount - count) / prevCount) * 100)
      : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
    >
      {dropoff !== null && dropoff > 0 && (
        <div className="mb-1.5 flex items-center gap-2 pl-1">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] text-muted-foreground">−{dropoff}% drop-off</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
      <div className="flex items-center gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-xs font-medium">{label}</span>
            <span className="shrink-0 font-mono text-sm font-black text-foreground">
              {count}
              <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">({pct}%)</span>
            </span>
          </div>
          <div className={cn("h-2.5 w-full overflow-hidden rounded-full", trackColor)}>
            <motion.div
              className={cn("h-full rounded-full", color)}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(pct, 2)}%` }}
              transition={{ delay: index * 0.06 + 0.15, duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function AnalyticsFunnel({ sessionId }: { sessionId: Id<"sessions"> }) {
  const analytics = useQuery(api.game.getCompetitionAnalytics, { sessionId })
  const [stepsOpen, setStepsOpen] = useState(false)

  if (!analytics) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="border-primary/20 bg-card/95 shadow-lg">
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const { funnel, stepFunnel, lessons, accountCreated, total } = analytics
  const maxCount = Math.max(total, 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Game Funnel */}
      <Card className="border-primary/20 bg-card/95 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3Icon className="size-4 text-primary" />
            Game Funnel
          </CardTitle>
          <CardDescription>
            How many players joined, started, and finished the game.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <div className="rounded-full bg-muted p-3">
                <BarChart3Icon className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No data yet</p>
              <p className="text-xs text-muted-foreground">
                Analytics will appear once players join
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Joined */}
              <FunnelBar
                label={funnel[0].label}
                count={funnel[0].count}
                maxCount={maxCount}
                index={0}
                color="bg-blue-500"
                trackColor="bg-blue-500/15"
              />

              {/* Started Game — collapsible with step funnel */}
              <Collapsible open={stepsOpen} onOpenChange={setStepsOpen}>
                <CollapsibleTrigger asChild>
                  <button type="button" className="w-full text-left">
                    <FunnelBar
                      label={funnel[1].label}
                      count={funnel[1].count}
                      maxCount={maxCount}
                      index={1}
                      color="bg-blue-500"
                      trackColor="bg-blue-500/15"
                      prevCount={funnel[0].count}
                    />
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <ChevronDown
                        className={cn(
                          "size-3.5 text-muted-foreground transition-transform duration-200",
                          stepsOpen && "rotate-180",
                        )}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {stepsOpen ? "Hide" : "Show"} step progress
                        {stepFunnel.length > 0 && ` (${stepFunnel.length} steps)`}
                      </span>
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <AnimatePresence>
                    {stepsOpen && stepFunnel.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ScrollArea className="mt-2 max-h-65 overflow-y-auto rounded-lg border border-border/50 bg-muted/30 p-3">
                          <div className="space-y-2.5">
                            {stepFunnel.map((step, i) => (
                              <FunnelBar
                                key={step.step}
                                label={step.label}
                                count={step.count}
                                maxCount={maxCount}
                                index={i}
                                color="bg-blue-400"
                                trackColor="bg-blue-400/10"
                                prevCount={i === 0 ? funnel[1].count : stepFunnel[i - 1].count}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {stepsOpen && stepFunnel.length === 0 && (
                    <div className="mt-2 rounded-lg border border-border/50 bg-muted/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        No steps completed yet — players are still on the starting step.
                      </p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Finished Game */}
              <FunnelBar
                label={funnel[2].label}
                count={funnel[2].count}
                maxCount={maxCount}
                index={2}
                color="bg-blue-500"
                trackColor="bg-blue-500/15"
                prevCount={funnel[1].count}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lesson Progress */}
      <Card className="border-primary/20 bg-card/95 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3Icon className="size-4 text-amber-500" />
            Lesson Completion
          </CardTitle>
          <CardDescription>How far players progressed through the 7 lessons.</CardDescription>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson, i) => (
                <FunnelBar
                  key={lesson.label}
                  label={lesson.label}
                  count={lesson.count}
                  maxCount={maxCount}
                  index={i}
                  color="bg-amber-500"
                  trackColor="bg-amber-500/15"
                  prevCount={i > 0 ? lessons[i - 1].count : undefined}
                />
              ))}

              {/* Account Created — separate from lessons */}
              <div className="mt-2 border-t border-border/50 pt-3">
                <FunnelBar
                  label="Opened Account"
                  count={accountCreated}
                  maxCount={maxCount}
                  index={7}
                  color="bg-emerald-500"
                  trackColor="bg-emerald-500/15"
                  prevCount={lessons[6]?.count}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
