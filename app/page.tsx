"use client"
import { useConvex, useMutation, useQuery } from "convex/react"
import { motion } from "framer-motion"
import {
  ArrowRightIcon,
  GraduationCapIcon,
  LayoutGridIcon,
  Loader2Icon,
  PlayIcon,
  RocketIcon,
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { AssetDistributionBar } from "@/components/molecules/asset-distribution-bar"
import { PublicHeader } from "@/components/organisms/public-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useGameSession } from "@/hooks/use-game-session"
import { authClient } from "@/lib/auth-client"
import { getOrCreateGuestId } from "@/lib/guest"
import { cn } from "@/lib/utils"

function formatTaler(value: number) {
  return `${new Intl.NumberFormat("de-CH").format(Math.round(value))} taler`
}

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

/* ─── Leaderboard row ───────────────────────────────────────── */
function LeaderboardRow({
  entry,
  rank,
  total,
  scalePercent,
}: {
  entry: {
    gameId: string
    playerName: string
    status: string
    netWorth: number
    assetBreakdown: { gold: number; wood: number; potatoes: number; fish: number; total: number }
  }
  rank: number
  total: number
  scalePercent: number
}) {
  const isFirst = rank === 1
  const isSecond = rank === 2
  const isThird = rank === 3
  const isLast = rank === total

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border px-3 py-2.5",
        isFirst
          ? "bg-yellow-500/8 border-yellow-500/25"
          : isSecond
            ? "bg-zinc-300/10 border-zinc-400/20"
            : isThird
              ? "bg-amber-700/5 border-amber-700/15"
              : isLast
                ? "bg-muted/30 border-dashed"
                : "bg-card",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-[10px] font-bold",
            isFirst
              ? "bg-yellow-500 text-yellow-950"
              : isSecond
                ? "bg-zinc-400 text-white"
                : isThird
                  ? "bg-amber-700 text-amber-100"
                  : "bg-muted text-muted-foreground",
          )}
        >
          {rank}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{entry.playerName}</p>
          <p className="text-[10px] text-muted-foreground">{entry.status}</p>
          <AssetDistributionBar
            breakdown={entry.assetBreakdown}
            scalePercent={scalePercent}
            showDetails={rank <= 3}
            className="mt-1"
          />
        </div>
      </div>
      <p className="font-mono text-sm font-black text-primary">{formatTaler(entry.netWorth)}</p>
    </div>
  )
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const convex = useConvex()
  const { data: session } = authClient.useSession()
  const sessionId = searchParams.get("sessionId") as Id<"sessions"> | null

  // --- Session Queries ---
  const guestId = getOrCreateGuestId()
  const sessionData = useQuery(
    api.game.getSessionWithLeaderboard,
    sessionId ? { sessionId } : "skip",
  )
  const myGameInSession = useQuery(
    api.game.getMyGameInSession,
    sessionId ? { sessionId, guestId } : "skip",
  )
  const isLoaded = !!sessionId && !!sessionData
  const isLoadingSession = !!sessionId && sessionData === undefined

  const [playerName, setPlayerName] = useState("")
  const [nameError, setNameError] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)

  // Host-an-event state (must be before any early returns)
  const scenarios = useQuery(api.game.listScenarios)
  const createSession = useMutation(api.game.createSession)
  const [sessionName, setSessionName] = useState("")
  const [selectedScenarioId, setSelectedScenarioId] = useState("")
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const { joinEvent, hasJoinedEvent, gameSession } = useGameSession()

  useEffect(() => {
    const savedName = localStorage.getItem("debug_playerName")
    if (savedName) setPlayerName(savedName)
  }, [])

  const startGame = useMutation(api.game.startGame)

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally omit joinEvent and playerName to avoid re-triggering on every render
  useEffect(() => {
    if (!isLoaded || !sessionData || !sessionId) return
    // Only store once we have session data
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
        router.push(`/dashboard/game?sessionId=${sessionId}&gameId=${myGameInSession._id}`)
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
        router.push(`/dashboard/game?sessionId=${sessionData.session._id}&gameId=${gameId}`)
      } catch (error) {
        console.error("Error starting game:", error)
        alert(error instanceof Error ? error.message : "Failed to start game")
      }
    }
  }

  async function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault()
    if (!joinCode || joinCode.length < 4) return
    setIsJoining(true)
    try {
      const session = await convex.query(api.game.getSessionByJoinCode, {
        joinCode: joinCode.toUpperCase(),
      })
      if (session) {
        router.push(`/?sessionId=${session._id}`)
        setJoinCode("")
      } else {
        alert("Session not found. Please check the code.")
      }
    } catch (error) {
      console.error("Error joining session:", error)
      alert("Failed to join session.")
    } finally {
      setIsJoining(false)
    }
  }

  /* ─── Session-specific view (loaded via ?sessionId=…) ────── */
  if (isLoadingSession) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2Icon className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading session…</p>
        </div>
      </main>
    )
  }

  if (isLoaded && sessionData) {
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
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {sessionData.session.scenarioName}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[14px] font-mono font-bold tracking-wider text-primary">
                  CODE: {sessionData.session.joinCode}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[14px] text-muted-foreground">
                  <UsersIcon className="size-4" />
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
              {/* Name + Start Game */}
              <motion.div variants={childFade} className="w-full space-y-2">
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

              {/* Leaderboard — top 3 only */}
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
                    {sessionData.leaderboard.slice(0, 3).map((entry, i) => (
                      <LeaderboardRow
                        key={entry.gameId}
                        entry={entry}
                        rank={i + 1}
                        total={sessionData.leaderboard.length}
                        scalePercent={
                          (entry.netWorth / (sessionData.leaderboard[0]?.netWorth || 1)) * 100
                        }
                      />
                    ))}
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

  /* ─── Default home view ──────────────────────────────────── */
  async function handleCreateSession() {
    if (!selectedScenarioId || !sessionName.trim()) return
    setIsCreatingSession(true)
    try {
      const newSessionId = await createSession({
        // biome-ignore lint/suspicious/noExplicitAny: convex id type
        scenarioId: selectedScenarioId as any,
        name: sessionName.trim(),
      })
      router.push(`/dashboard/sessions/${newSessionId}`)
    } catch (error) {
      console.error("Error creating session:", error)
      alert("Failed to create session.")
    } finally {
      setIsCreatingSession(false)
    }
  }

  return (
    <main className="relative min-h-dvh flex flex-col items-center justify-center overflow-hidden bg-background px-4 py-6 sm:px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        {/* Hero */}
        <motion.div {...fadeUp()} className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] as const }}
            className="relative w-72 h-44 sm:w-80 sm:h-48"
          >
            <Image
              src="/logo.png"
              alt="Trade Tales"
              fill
              className="object-contain drop-shadow-xl"
              priority
              unoptimized
            />
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase italic text-primary -mt-1">
            Trade Tales
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Learn to invest. Play to understand.
          </p>
        </motion.div>

        {/* Main actions */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="w-full flex flex-col gap-3 mt-1"
        >
          {/* Join Game / Enter Arena */}
          <motion.div variants={childFade}>
            {hasJoinedEvent && gameSession ? (
              <Button
                className="h-12 w-full text-base font-semibold shadow-lg"
                onClick={() =>
                  router.push(
                    `/dashboard/game?sessionId=${gameSession.sessionId}&gameId=${gameSession.gameId}`,
                  )
                }
              >
                <span className="mr-2">{"\u2694\uFE0F"}</span>
                Enter the Arena
                <ArrowRightIcon className="ml-2 size-4" />
              </Button>
            ) : (
              <Card className="border-primary/20 bg-card/80 backdrop-blur shadow-lg overflow-hidden">
                <CardContent className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center size-7 rounded-full bg-primary/10 shrink-0">
                      <UsersIcon className="size-3.5 text-primary" />
                    </div>
                    <p className="text-sm font-semibold leading-tight">Join a Game</p>
                  </div>
                  <form onSubmit={handleJoinByCode} className="flex gap-2">
                    <Input
                      placeholder="CODE"
                      className="h-10 text-sm font-mono text-center tracking-[0.3em] uppercase border-2 focus-visible:ring-primary/20"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={4}
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="px-5 h-10 shrink-0"
                      disabled={isJoining || joinCode.length < 4}
                    >
                      {isJoining ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <ArrowRightIcon className="size-5" />
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Host an Event — compact single-line when collapsed */}
          <motion.div variants={childFade}>
            {!session?.user ? (
              <Button
                variant="outline"
                className="h-10 w-full text-sm group hover:border-primary/40 hover:bg-primary/5 transition-all"
                onClick={() => router.push("/sign-in?callbackUrl=/")}
              >
                <RocketIcon className="mr-2 size-4 text-primary" />
                Sign in to host an event
              </Button>
            ) : !showCreate ? (
              <div className="flex gap-2">
                <Button className="h-10 flex-1 text-sm" onClick={() => setShowCreate(true)}>
                  <RocketIcon className="mr-2 size-4" />
                  Host an Event
                </Button>
                <Button
                  variant="outline"
                  className="h-10 text-xs px-3 shrink-0"
                  onClick={() => router.push("/dashboard")}
                >
                  Dashboard
                </Button>
              </div>
            ) : (
              <Card className="border-primary/20 bg-card/80 backdrop-blur shadow-lg overflow-hidden">
                <CardContent className="px-4 py-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center size-7 rounded-full bg-primary/10 shrink-0">
                      <RocketIcon className="size-3.5 text-primary" />
                    </div>
                    <p className="text-sm font-semibold leading-tight">Host an Event</p>
                  </div>

                  <Input
                    placeholder="Session name, e.g. The Great Harvest"
                    className="h-9 text-sm"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    disabled={isCreatingSession}
                  />

                  {/* Scenario picker */}
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                      Scenario
                    </p>
                    {!scenarios ? (
                      <div className="flex h-16 items-center justify-center rounded-lg border border-dashed">
                        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : scenarios.length === 0 ? (
                      <div className="flex h-16 flex-col items-center justify-center rounded-lg border border-dashed text-center p-2">
                        <p className="text-[11px] text-muted-foreground">No scenarios yet.</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-[11px] h-auto p-0"
                          onClick={() => router.push("/dashboard/scenarios/create")}
                        >
                          Create one
                        </Button>
                      </div>
                    ) : (
                      <ScrollArea className="w-full whitespace-nowrap rounded-lg border bg-muted/20 p-1.5">
                        <div className="flex w-max gap-1.5">
                          {scenarios.map((scenario) => (
                            <button
                              key={scenario._id}
                              type="button"
                              onClick={() => setSelectedScenarioId(scenario._id)}
                              className={cn(
                                "flex flex-col items-center gap-0.5 rounded-md p-1 transition-all",
                                selectedScenarioId === scenario._id
                                  ? "ring-2 ring-primary bg-background shadow-sm"
                                  : "opacity-60 hover:opacity-100 hover:bg-background/50",
                              )}
                            >
                              <div className="relative size-12 overflow-hidden rounded bg-muted">
                                {scenario.icon ? (
                                  <Image
                                    src={scenario.icon}
                                    alt={scenario.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <LayoutGridIcon className="size-4 text-muted-foreground/20" />
                                  </div>
                                )}
                              </div>
                              <span className="max-w-14 truncate text-[9px] font-medium">
                                {scenario.name}
                              </span>
                            </button>
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 flex-1 text-xs"
                      onClick={() => {
                        setShowCreate(false)
                        setSessionName("")
                        setSelectedScenarioId("")
                      }}
                      disabled={isCreatingSession}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 flex-1 text-xs"
                      onClick={handleCreateSession}
                      disabled={!selectedScenarioId || !sessionName.trim() || isCreatingSession}
                    >
                      {isCreatingSession ? (
                        <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                      ) : (
                        <RocketIcon className="mr-1.5 size-3.5" />
                      )}
                      {isCreatingSession ? "Creating…" : "Launch"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
                      Sharpen Your Wisdom {"\uD83E\uDDE0"}
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
  )
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2Icon className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
