"use client"
import { useConvex, useMutation, useQuery } from "convex/react"
import { motion } from "framer-motion"
import {
  ActivityIcon,
  ArrowRightIcon,
  InfoIcon,
  Loader2Icon,
  PlayIcon,
  PlusCircleIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { authClient } from "@/lib/auth-client"
import { getOrCreateGuestId } from "@/lib/guest"
import { cn } from "@/lib/utils"

function formatTaler(value: number) {
  return `${new Intl.NumberFormat("de-CH").format(Math.round(value))} taler`
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const convex = useConvex()
  const { data: session } = authClient.useSession()
  const sessionId = searchParams.get("sessionId") as Id<"sessions"> | null
  const activeSessions = useQuery(api.game.listSessions)

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
  const hasHostedActiveSessions =
    !!session?.user?.id &&
    !!activeSessions?.some((activeSession) => activeSession.hostId === session.user.id)

  // --- Existing Logic ---
  const [playerName, setPlayerName] = useState("")
  const [nameError, setNameError] = useState("")

  // --- Multiplayer Logic ---
  const [joinCode, setJoinCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem("debug_playerName")
    if (savedName) setPlayerName(savedName)
  }, [])

  useEffect(() => {
    // If a logged-in host already has active sessions, take them directly to dashboard.
    if (session?.user && !sessionId && hasHostedActiveSessions) {
      router.replace("/dashboard")
    }
  }, [session?.user, sessionId, hasHostedActiveSessions, router])

  const startGame = useMutation(api.game.startGame)

  async function onStartGame() {
    const trimmedName = playerName.trim()
    if (!trimmedName) {
      setNameError("Please enter your name to start.")
      return
    }
    localStorage.setItem("debug_playerName", trimmedName)

    if (isLoaded && sessionData) {
      // If we already have a game in this session, just go there
      if (myGameInSession) {
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
        router.push(`/dashboard/game?sessionId=${sessionData.session._id}&gameId=${gameId}`)
      } catch (error) {
        console.error("Error starting game:", error)
        alert(error instanceof Error ? error.message : "Failed to start game")
      }
      return
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

  return (
    <main className="relative min-h-dvh flex flex-col justify-center overflow-hidden px-4 py-6 sm:px-6 sm:py-8 bg-background">
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-6">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center text-center space-y-4 pt-4 pb-2"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-primary drop-shadow-2xl">
              Wealth Manager
            </h1>
            <p className="text-foreground/90 font-medium text-base md:text-lg mt-1 tracking-wide drop-shadow-md">
              Master the markets. Build your empire.
            </p>
          </div>

          <div className="relative aspect-video w-[60%] overflow-hidden drop-shadow-2xl">
            <Image
              src="/logo.png"
              alt="Wealth Manager Logo"
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
        </motion.section>

        {/* Action Section: Start / Join */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Card className="border-primary/20 bg-card/70 backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-primary/10">
            {isLoadingSession ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2Icon className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">
                  Loading session details...
                </p>
              </div>
            ) : isLoaded && sessionData ? (
              /* Session Ready State */
              <div className="flex flex-col">
                <div className="bg-primary/10 px-6 py-4 border-b border-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {sessionData.session.scenarioIcon && (
                        <div className="relative size-10 overflow-hidden rounded-lg border border-primary/20 bg-background shadow-sm">
                          <Image
                            src={sessionData.session.scenarioIcon}
                            alt={sessionData.session.scenarioName || "Scenario Icon"}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-primary leading-tight">
                          {sessionData.session.name}
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                          Scenario: {sessionData.session.scenarioName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Join code:{" "}
                          <span className="font-mono font-bold text-foreground">
                            {sessionData.session.joinCode}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className="bg-background/50 border-primary/20 text-primary font-bold"
                      >
                        <UsersIcon className="mr-1.5 size-3" />
                        {sessionData.session.playerCount} Joined
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="player-name-loaded"
                      className="block text-[10px] uppercase font-bold text-muted-foreground tracking-widest ml-1"
                    >
                      Your Player Name
                    </label>
                    <Input
                      id="player-name-loaded"
                      value={playerName}
                      placeholder="e.g. Master Trader"
                      onChange={(e) => {
                        setPlayerName(e.target.value)
                        if (nameError) setNameError("")
                      }}
                      className="h-11"
                    />
                    {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                  </div>
                  <Button
                    type="button"
                    className="h-12 w-full text-base bg-primary shadow-lg shadow-primary/20"
                    onClick={() => {
                      void onStartGame()
                    }}
                    disabled={!playerName.trim()}
                  >
                    <PlayIcon className="mr-2 size-5 fill-current" />
                    Start Game
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => router.push("/")}
                  >
                    Exit Session
                  </Button>
                </CardContent>
              </div>
            ) : (
              /* Default Start / Join State */
              <>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-center">Multiplayer Arena</CardTitle>
                  <CardDescription className="text-center text-xs">
                    Compete with others in real-time. Join an existing game or host your own.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  <div className="flex flex-col gap-3">
                    <div className="space-y-2">
                      <label
                        htmlFor="join-session-code"
                        className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest ml-1"
                      >
                        Join existing session
                      </label>
                      <form onSubmit={handleJoinByCode} className="flex gap-2">
                        <Input
                          id="join-session-code"
                          placeholder="ENTER 4-CHAR CODE"
                          className="h-12 text-sm font-mono text-center tracking-[0.3em] uppercase border-2 focus-visible:ring-primary/20"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          maxLength={4}
                        />
                        <Button
                          type="submit"
                          size="lg"
                          className="px-6 h-12"
                          disabled={isJoining || joinCode.length < 4}
                        >
                          {isJoining ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            <ArrowRightIcon className="size-5" />
                          )}
                        </Button>
                      </form>
                    </div>

                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase">
                        <span className="bg-card px-2 text-muted-foreground tracking-widest font-medium">
                          Or create new world
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="h-12 w-full text-sm group hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => {
                        if (session?.user) {
                          router.push("/dashboard")
                        } else {
                          router.push("/sign-in?callbackUrl=/dashboard/sessions/create")
                        }
                      }}
                    >
                      <PlusCircleIcon className="mr-2 size-4 text-primary group-hover:scale-110 transition-transform" />
                      {session?.user ? "Dashboard" : "Host New Multiplayer Session"}
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </motion.section>

        {/* Leaderboard Section - Only visible if session is loaded */}
        {isLoaded && sessionData && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Card className="border-primary/40 bg-card/70 backdrop-blur-xl shadow-2xl ring-1 ring-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrophyIcon className="size-4 text-yellow-500" />
                  Session Leaderboard
                </CardTitle>
                <CardDescription>Active players in {sessionData.session.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sessionData.leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground italic">
                      No players have started this session yet.
                    </div>
                  ) : (
                    sessionData.leaderboard.map((entry, index) => (
                      <div
                        key={entry.gameId}
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-3 py-2 transition-colors",
                          index === 0
                            ? "bg-yellow-500/5 border-yellow-500/20"
                            : "bg-background/80 border-border/70",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex size-6 items-center justify-center rounded-full text-[10px] font-bold",
                              index === 0
                                ? "bg-yellow-500 text-yellow-950"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-bold">{entry.playerName}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <ActivityIcon className="size-2" /> {entry.status}
                            </p>
                          </div>
                        </div>
                        <p className="font-mono text-sm font-black text-primary">
                          {formatTaler(entry.netWorth)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 justify-center">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <InfoIcon className="size-3" />
                  Live updates enabled
                </div>
              </CardFooter>
            </Card>
          </motion.section>
        )}
      </div>
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
