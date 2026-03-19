"use client"

import { useConvex, useMutation, useQuery } from "convex/react"
import {
  Activity,
  ArrowRight,
  History,
  Info,
  LayoutGrid,
  Loader2,
  Medal,
  Play,
  PlusCircle,
  Ticket,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

function DashboardContent() {
  const router = useRouter()
  const convex = useConvex()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId") as Id<"sessions"> | null
  const [joinCode, setJoinCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)

  // Queries
  const sessionData = useQuery(
    api.game.getSessionWithLeaderboard,
    sessionId ? { sessionId } : "skip",
  )
  const myGameInSession = useQuery(api.game.getMyGameInSession, sessionId ? { sessionId } : "skip")
  const activeSessions = useQuery(api.game.listSessions)
  const myGames = useQuery(api.game.listMyGames)
  const startGame = useMutation(api.game.startGame)

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode || joinCode.length < 4) return

    setIsJoining(true)
    try {
      // Find session by join code
      const session = await convex.query(api.game.getSessionByJoinCode, {
        joinCode: joinCode.toUpperCase(),
      })
      if (session) {
        router.push(`/dashboard?sessionId=${session._id}`)
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

  const handleStartGame = async () => {
    // Check if player name exists, if not use a default or prompt
    let name = localStorage.getItem("debug_playerName")
    if (!name) {
      name = prompt("Enter your player name:")
      if (!name) return
      localStorage.setItem("debug_playerName", name)
    }

    if (sessionId && sessionData) {
      // If we already have a game in this session, just go there
      if (myGameInSession) {
        router.push(`/dashboard/game?sessionId=${sessionId}&gameId=${myGameInSession._id}`)
        return
      }

      try {
        const gameId = await startGame({
          scenarioId: sessionData.session.scenarioId,
          sessionId: sessionData.session._id,
          playerName: name,
        })
        router.push(`/dashboard/game?sessionId=${sessionData.session._id}&gameId=${gameId}`)
      } catch (error) {
        console.error("Error starting game:", error)
        alert(error instanceof Error ? error.message : "Failed to start game")
      }
    }
  }

  const isLoaded = !!sessionId && !!sessionData

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-8 pt-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isLoaded && sessionData ? `Session: ${sessionData.session.name}` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {isLoaded && sessionData
              ? `Join code: ${sessionData.session.joinCode}`
              : "Welcome back to your empire."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoaded && (
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 shadow-lg"
              onClick={handleStartGame}
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              Start Game
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/dashboard/sessions/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Session
            </Link>
          </Button>
        </div>
      </div>

      {isLoaded && sessionData ? (
        /* Loaded Game View */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Leaderboard */}
          <Card className="col-span-4 shadow-md border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Live Leaderboard
                </CardTitle>
                <CardDescription>
                  Real-time standing of all players in this session.
                </CardDescription>
              </div>
              <Badge variant="outline" className="h-6 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {sessionData.leaderboard.length} Players
              </Badge>
            </CardHeader>
            <CardContent>
              {sessionData.leaderboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Users className="h-12 w-12 opacity-10 mb-4" />
                  <p>No players have started their journey yet.</p>
                  <p className="text-xs">
                    Invite others using the join code:{" "}
                    <span className="font-mono font-bold text-primary">
                      {sessionData.session.joinCode}
                    </span>
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[60px]">Rank</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Net Worth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionData.leaderboard.map((player, index) => (
                      <TableRow
                        key={player.gameId}
                        className={cn(index === 0 && "bg-yellow-500/5")}
                      >
                        <TableCell className="font-medium">
                          {index === 0 ? (
                            <Medal className="h-5 w-5 text-yellow-500" />
                          ) : (
                            `#${index + 1}`
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">{player.playerName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={player.status === "active" ? "default" : "secondary"}
                            className="text-[10px] h-5"
                          >
                            {player.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                          {player.netWorth.toLocaleString()} T
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Session Details / Info */}
          <div className="col-span-3 flex flex-col gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Session Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <span className="text-sm text-muted-foreground">Join Code</span>
                  <span className="text-xl font-mono font-black tracking-widest text-primary">
                    {sessionData.session.joinCode}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border bg-card">
                    <span className="text-[10px] uppercase text-muted-foreground block mb-1">
                      Status
                    </span>
                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                      <Activity className="mr-1 h-3 w-3" />
                      {sessionData.session.status}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <span className="text-[10px] uppercase text-muted-foreground block mb-1">
                      Created
                    </span>
                    <span className="text-xs font-medium">
                      {new Date(sessionData.session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() => router.push("/dashboard")}
                >
                  Exit Session View
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm">Quick Invite</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Share the code above with your friends. They can enter it in the "Join Game" section
                on their dashboard to join this specific competition.
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Default Dashboard View */
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-md transition-shadow cursor-default group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Wealth</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1'200 T</div>
                <p className="text-[10px] text-muted-foreground mt-1 text-green-500 font-medium">
                  +12.5% from last session
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-default">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Games</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {myGames?.filter((g) => g.status === "active").length ?? 0}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Ready for your next move</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-default">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Global Rank</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">#42</div>
                <p className="text-[10px] text-muted-foreground mt-1">In the top 5% worldwide</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-default">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessions Hosted</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeSessions?.length ?? 0}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Multiplayer worlds created</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            {/* Recent Activities */}
            <Card className="col-span-4 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5" />
                  Recent Games
                </CardTitle>
                <CardDescription>Your last moves in the trading world.</CardDescription>
              </CardHeader>
              <CardContent>
                {!myGames ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : myGames.length === 0 ? (
                  <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                    <LayoutGrid className="h-8 w-8 opacity-20 mb-2" />
                    No game history yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myGames.slice(0, 5).map((game) => (
                      <div
                        key={game._id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold">{game.playerName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(game.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{game.status}</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/debug/sessions/${game.sessionId}`)}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Join Section */}
            <div className="col-span-3 flex flex-col gap-6">
              <Card className="border-primary/20 shadow-lg bg-primary/[0.02]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-primary" />
                    Join a Session
                  </CardTitle>
                  <CardDescription>Enter a code to join a friend's game.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleJoinByCode} className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="ENTER CODE"
                        className="font-mono text-center tracking-widest text-lg uppercase"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={4}
                      />
                      <Button type="submit" disabled={isJoining || joinCode.length < 4}>
                        {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center italic">
                      Ask the session host for their 4-character join code.
                    </p>
                  </form>
                </CardContent>
              </Card>

              {/* Active Sessions List */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Open Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!activeSessions ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : activeSessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4 italic">
                      No public sessions available.
                    </p>
                  ) : (
                    activeSessions.slice(0, 3).map((session) => (
                      <div
                        key={session._id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{session.name}</span>
                          <span className="text-[9px] text-muted-foreground capitalize">
                            {session.mode} Mode
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => router.push(`/dashboard?sessionId=${session._id}`)}
                        >
                          View
                        </Button>
                      </div>
                    ))
                  )}
                  <Button variant="default" className="w-full h-10 shadow-sm" asChild>
                    <Link href="/dashboard/scenarios">Manage Scenarios</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
