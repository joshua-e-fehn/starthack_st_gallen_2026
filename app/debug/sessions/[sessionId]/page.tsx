"use client"

import { useMutation, useQuery } from "convex/react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export default function SessionDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = params.sessionId as Id<"sessions">

  const data = useQuery(api.game.getSessionWithLeaderboard, { sessionId })
  const me = useQuery(api.game.getMe)
  const startGame = useMutation(api.game.startGame)

  const [playerName, setPlayerName] = useState("")

  // Pre-fill name from URL or LocalStorage
  useEffect(() => {
    const fromUrl = searchParams.get("name")
    const fromStorage = localStorage.getItem("debug_playerName")
    if (fromUrl) {
      setPlayerName(fromUrl)
      localStorage.setItem("debug_playerName", fromUrl)
    } else if (fromStorage) {
      setPlayerName(fromStorage)
    }
  }, [searchParams])

  if (data === undefined || me === undefined) return <div className="p-8">Loading session...</div>
  if (data === null) return <div className="p-8">Session not found.</div>

  const { session, leaderboard } = data

  // Find my current game in this session
  const myGames = leaderboard.filter((entry) => entry.userId === me?.subject)
  const activeGame = myGames.find((g) => g.status === "active")

  const handleStartGame = async () => {
    if (!playerName.trim()) {
      alert("No player name found. Please go back and set your name.")
      router.push("/debug/sessions")
      return
    }
    try {
      const gameId = await startGame({
        scenarioId: session.scenarioId,
        sessionId: session._id,
        playerName: playerName.trim(),
      })
      router.push(`/dashboard/game?sessionId=${session._id}&gameId=${gameId}`)
    } catch (e) {
      const error = e as Error
      alert(error.message || "Error starting game.")
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{session.name}</h1>
            <Badge variant="secondary" className="text-lg font-mono">
              {session.joinCode}
            </Badge>
          </div>
          <p className="text-muted-foreground">Scenario: {session.scenarioId}</p>
        </div>

        <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-bold">
              Playing as
            </span>
            <span className="font-bold text-lg">{playerName || "Anonymous"}</span>
          </div>

          <div className="flex gap-2 ml-4">
            {activeGame ? (
              <>
                <Button
                  size="lg"
                  onClick={() =>
                    router.push(
                      `/dashboard/game?sessionId=${session._id}&gameId=${activeGame.gameId}`,
                    )
                  }
                >
                  Continue Attempt
                </Button>
                <Button size="lg" variant="outline" onClick={handleStartGame}>
                  Try Again (New Game)
                </Button>
              </>
            ) : (
              <Button size="lg" onClick={handleStartGame}>
                {myGames.length > 0 ? "Try Again (New Attempt)" : "Start My Attempt"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Leaderboard</CardTitle>
          <CardDescription>Real-time rankings based on current net worth.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 text-sm font-medium text-muted-foreground">
              <span className="w-12 text-center">Rank</span>
              <span className="flex-1 px-4">Player Name</span>
              <span className="w-24 text-center">Status</span>
              <span className="w-24 text-center">Current Year</span>
              <span className="w-32 text-right">Net Worth</span>
            </div>

            {leaderboard.map((entry, index) => (
              <div
                key={entry.gameId}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="w-12 text-center">
                  <Badge variant={index === 0 ? "default" : "outline"}>{index + 1}</Badge>
                </div>
                <div className="flex-1 px-4 truncate font-semibold">{entry.playerName}</div>
                <div className="w-24 text-center">
                  <Badge
                    variant={entry.status === "active" ? "secondary" : "outline"}
                    className="text-[10px] uppercase"
                  >
                    {entry.status}
                  </Badge>
                </div>
                <div className="w-24 text-center font-mono text-sm">{entry.date}</div>
                <div className="w-32 text-right font-mono font-bold text-green-600">
                  {entry.netWorth.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            ))}

            {leaderboard.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                No players have started this session yet. Be the first!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-start">
        <Button variant="outline" onClick={() => router.push("/debug/sessions")}>
          ← Back to Sessions
        </Button>
      </div>
    </div>
  )
}
