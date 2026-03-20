"use client"
import { useMutation, useQuery } from "convex/react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ActivityIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDown,
  CopyIcon,
  GraduationCapIcon,
  Loader2Icon,
  PlayIcon,
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { PublicHeader } from "@/components/organisms/public-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useGameSession } from "@/hooks/use-game-session"
import { getOrCreateGuestId } from "@/lib/guest"
import { cn, isValidConvexId } from "@/lib/utils"

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

/* ─── Animation presets ─────────────────────────────────────── */
const ease = [0.25, 0.1, 0.25, 1] as const

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease },
})

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const childFade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
}

function LobbyContent() {
  const router = useRouter()
  const params = useParams()
  const rawSessionId = params.sessionId as string
  const sessionId = rawSessionId as Id<"sessions">
  const validId = isValidConvexId(rawSessionId)

  const guestId = getOrCreateGuestId()
  const sessionData = useQuery(api.game.getSessionWithLeaderboard, validId ? { sessionId } : "skip")
  const myGameInSession = useQuery(
    api.game.getMyGameInSession,
    validId ? { sessionId, guestId } : "skip",
  )
  const startGame = useMutation(api.game.startGame)
  const { joinEvent } = useGameSession()
  const hasFinishedGame = myGameInSession?.status === "finished"

  const isLoaded = !!sessionData
  const [playerName, setPlayerName] = useState("")
  const [nameError, setNameError] = useState("")
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem("debug_playerName")
    if (savedName) setPlayerName(savedName)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally omit joinEvent and playerName to avoid re-triggering on every render
  useEffect(() => {
    if (!isLoaded || !sessionData) return
    joinEvent({
      sessionId: sessionId as string,
      gameId: myGameInSession?._id ?? "",
      playerName: playerName || localStorage.getItem("debug_playerName") || "",
      joinCode: sessionData.session.joinCode,
    })
  }, [isLoaded, sessionData, sessionId, myGameInSession])

  async function onStartGame() {
    const trimmedName = playerName.trim()
    if (!trimmedName) {
      setNameError("Please enter your name to start.")
      return
    }
    localStorage.setItem("debug_playerName", trimmedName)

    if (isLoaded && sessionData) {
      if (myGameInSession) {
        joinEvent({
          sessionId: sessionId as string,
          gameId: myGameInSession._id,
          playerName: trimmedName,
          joinCode: sessionData.session.joinCode,
        })
        router.push(`/game?sessionId=${sessionId}&gameId=${myGameInSession._id}`)
        return
      }
      try {
        const gameId = await startGame({
          scenarioId: sessionData.session.scenarioId,
          sessionId: sessionData.session._id,
          playerName: trimmedName,
          guestId,
        })
        joinEvent({
          sessionId: sessionData.session._id,
          gameId,
          playerName: trimmedName,
          joinCode: sessionData.session.joinCode,
        })
        router.push(`/game?sessionId=${sessionData.session._id}&gameId=${gameId}`)
      } catch (error) {
        console.error("Error starting game:", error)
        alert(error instanceof Error ? error.message : "Failed to start game")
      }
    }
  }

  if (!validId) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-lg text-muted-foreground">Session not found.</p>
        <Button variant="outline" onClick={() => router.replace("/")}>
          Go Home
        </Button>
      </main>
    )
  }

  if (!isLoaded) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2Icon className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading session…</p>
        </div>
      </main>
    )
  }

  if (!sessionData) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">Session not found.</p>
          <Button onClick={() => router.push("/")}>Go Home</Button>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />
      <main className="relative flex flex-col items-center overflow-hidden px-4 pt-1 pb-6 sm:px-6">
        <div className="w-full max-w-sm flex flex-col items-center gap-4">
          {/* Hero */}
          <motion.div {...fadeUp()} className="flex flex-col items-center text-center">
            {sessionData.session.scenarioIcon && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] as const }}
                className="relative w-72 h-44 sm:w-80 sm:h-48"
              >
                <Image
                  src={sessionData.session.scenarioIcon}
                  alt={sessionData.session.scenarioName || "Scenario"}
                  fill
                  className="object-contain drop-shadow-xl"
                  unoptimized
                />
              </motion.div>
            )}
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase italic text-primary -mt-1">
              {sessionData.session.name}
            </h1>
            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(sessionData.session.joinCode)
                  setCodeCopied(true)
                  setTimeout(() => setCodeCopied(false), 1500)
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-base font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer active:scale-95",
                  codeCopied
                    ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted/80",
                )}
              >
                {codeCopied ? (
                  <CheckIcon className="size-4 text-green-600 dark:text-green-400" />
                ) : (
                  <CopyIcon className="size-4 opacity-50" />
                )}
                {sessionData.session.joinCode}
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-base text-muted-foreground">
                <UsersIcon className="size-5" />
                {sessionData.session.playerCount}
              </span>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="w-full flex flex-col gap-3 mt-1"
          >
            {/* Entry action */}
            <motion.div variants={childFade} className="w-full space-y-2">
              {hasFinishedGame && myGameInSession ? (
                <Button
                  className="h-11 w-full text-sm font-semibold shadow-lg"
                  onClick={() =>
                    router.push(
                      `/game/results?sessionId=${sessionId}&gameId=${myGameInSession._id}`,
                    )
                  }
                >
                  Your Results
                </Button>
              ) : (
                <>
                  <Input
                    id="player-name-loaded"
                    value={playerName}
                    placeholder="Your player name"
                    onChange={(e) => {
                      setPlayerName(e.target.value)
                      if (nameError) setNameError("")
                    }}
                    className="h-11 text-sm text-center border-2 focus-visible:ring-primary/20"
                  />
                  {nameError && <p className="text-xs text-destructive text-center">{nameError}</p>}
                  <Button
                    className="h-11 w-full text-sm font-semibold shadow-lg"
                    onClick={() => void onStartGame()}
                    disabled={!playerName.trim()}
                  >
                    <PlayIcon className="mr-2 size-4 fill-current" />
                    Start Game
                  </Button>
                </>
              )}
            </motion.div>

            {/* Learn */}
            <motion.div variants={childFade}>
              <Link href="/learn" className="block group">
                <Card className="border-transparent bg-linear-to-r from-primary/8 to-primary/4 hover:from-primary/14 hover:to-primary/8 shadow-md transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-0.5">
                  <CardContent className="px-4 py-3 flex items-center gap-3">
                    <div className="flex items-center justify-center size-10 rounded-xl bg-primary/15 shadow-sm group-hover:scale-105 transition-transform shrink-0">
                      <GraduationCapIcon className="size-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold flex items-center gap-1.5">
                        Sharpen Your Wisdom First {"\uD83E\uDDE0"}
                        <SparklesIcon className="size-3.5 text-primary" />
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Master the ancient arts of markets, risk & strategy
                      </p>
                    </div>
                    <ArrowRightIcon className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* Leaderboard — top 3, host style */}
            {sessionData.leaderboard.length > 0 && (
              <motion.div variants={childFade} className="space-y-2">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  <TrophyIcon className="size-3.5 text-yellow-500" />
                  Leaderboard
                  {sessionData.leaderboard.length > 3 && (
                    <span className="ml-auto font-mono text-[10px] font-normal tracking-normal opacity-60">
                      {sessionData.leaderboard.length} players
                    </span>
                  )}
                </p>
                <div className="space-y-1.5">
                  {(() => {
                    const top3 = sessionData.leaderboard.slice(0, 3)
                    const maxNetWorth = top3[0]?.netWorth || 1
                    return top3.map((entry, i) => {
                      const rank = i
                      const isGold = rank === 0
                      const isSilver = rank === 1
                      const isBronze = rank === 2
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
                                        : "bg-muted text-muted-foreground",
                                )}
                              >
                                {rank + 1}
                              </span>
                              <div>
                                <p className="text-sm font-bold">{entry.playerName}</p>
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
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Footer tagline */}
        <motion.footer
          {...fadeUp(0.4)}
          className="mt-6 pb-3 text-center text-[10px] text-muted-foreground/50"
        >
          Trade Tales — The Investing Game
        </motion.footer>
      </main>
    </div>
  )
}

export default function GameLobbyPage() {
  return <LobbyContent />
}
