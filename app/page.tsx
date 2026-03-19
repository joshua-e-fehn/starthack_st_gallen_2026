"use client"

import { motion } from "framer-motion"
import { ArrowRightIcon, CrownIcon, ImageIcon, Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  fetchLandingQuote,
  getLeaderboardMock,
  type LeaderboardEntry,
  startGameMock,
} from "@/lib/api/landing"

const quoteTopic = "wise farmer strategy for long-term wealth"

function formatGold(value: number) {
  return `${new Intl.NumberFormat("de-CH").format(value)} gold`
}

export default function HomePage() {
  const router = useRouter()

  const [playerName, setPlayerName] = useState("")
  const [isStarting, setIsStarting] = useState(false)
  const [nameError, setNameError] = useState("")

  const [quote, setQuote] = useState("")
  const [quoteError, setQuoteError] = useState("")
  const [isQuoteLoading, setIsQuoteLoading] = useState(true)

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    async function loadLandingContent() {
      setIsQuoteLoading(true)
      setIsLeaderboardLoading(true)

      try {
        const [quoteResult, leaderboardResult] = await Promise.all([
          fetchLandingQuote(quoteTopic),
          getLeaderboardMock(),
        ])

        if (ignore) {
          return
        }

        setQuote(quoteResult)
        setLeaderboard(leaderboardResult)
      } catch (error) {
        if (ignore) {
          return
        }

        const message = error instanceof Error ? error.message : "Failed to load landing content"
        setQuoteError(message)
        setQuote("Plant patience before dawn, and your barn will outlast the storm.")
        setLeaderboard([
          { rank: 1, playerName: "Aldric", yearsPlayed: 12, netWorth: 28450 },
          { rank: 2, playerName: "Matilda", yearsPlayed: 10, netWorth: 24510 },
          { rank: 3, playerName: "Leofric", yearsPlayed: 11, netWorth: 22990 },
        ])
      } finally {
        if (!ignore) {
          setIsQuoteLoading(false)
          setIsLeaderboardLoading(false)
        }
      }
    }

    loadLandingContent()

    return () => {
      ignore = true
    }
  }, [])

  const isDisabled = useMemo(
    () => isStarting || isQuoteLoading || isLeaderboardLoading,
    [isStarting, isQuoteLoading, isLeaderboardLoading],
  )

  async function onStartGame() {
    const trimmedName = playerName.trim()

    if (!trimmedName) {
      setNameError("Please enter your player name.")
      return
    }

    setNameError("")
    setIsStarting(true)

    try {
      await startGameMock(trimmedName)
      router.push(`/dashboard/onboarding?player=${encodeURIComponent(trimmedName)}`)
    } catch {
      setNameError("Could not start game right now. Please try again.")
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(120%_80%_at_20%_0%,hsl(var(--primary)/0.22)_0%,transparent_50%),linear-gradient(180deg,hsl(var(--secondary)/0.14)_0%,hsl(var(--background))_55%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Card className="border-primary/20 bg-card/95 shadow-lg backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold tracking-tight">
                Wealth Manager Arena
              </CardTitle>
              <CardDescription>Learn to invest. Play to understand.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-16/10 w-full overflow-hidden rounded-xl border border-primary/20 bg-muted">
                <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-secondary/20 to-background" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-foreground/80">
                  <ImageIcon className="size-7 text-primary" />
                  <p className="text-base font-medium">Game screenshot preview</p>
                  <p className="text-xs text-muted-foreground">
                    Placeholder image until gameplay capture is ready
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                {isQuoteLoading ? (
                  <p className="text-sm text-muted-foreground">Summoning a wise farmer quote...</p>
                ) : (
                  <>
                    <p className="text-base leading-relaxed italic">{quote}</p>
                    {quoteError ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        LLM fallback active: {quoteError}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <Card className="border-primary/20 bg-card/95 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Begin your journey</CardTitle>
              <CardDescription>Enter your player name and head to onboarding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label htmlFor="player-name" className="mb-2 block text-sm font-medium">
                  Player name
                </label>
                <Input
                  id="player-name"
                  value={playerName}
                  placeholder="e.g. Elara of the Valley"
                  autoComplete="off"
                  onChange={(event) => {
                    setPlayerName(event.target.value)
                    if (nameError) {
                      setNameError("")
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void onStartGame()
                    }
                  }}
                  aria-invalid={Boolean(nameError)}
                />
                {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
              </div>

              <Button
                type="button"
                className="h-11 w-full text-base"
                onClick={() => {
                  void onStartGame()
                }}
                disabled={isDisabled}
              >
                {isStarting ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Starting game...
                  </>
                ) : (
                  <>
                    Start game
                    <ArrowRightIcon className="size-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
        >
          <Card className="border-primary/20 bg-card/95 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CrownIcon className="size-4 text-primary" />
                Leaderboard
              </CardTitle>
              <CardDescription>Top players who already took the farm challenge.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLeaderboardLoading ? (
                <div className="space-y-2">
                  <div className="h-10 rounded-md bg-muted" />
                  <div className="h-10 rounded-md bg-muted" />
                  <div className="h-10 rounded-md bg-muted" />
                </div>
              ) : (
                <ul className="space-y-2">
                  {leaderboard.map((entry) => (
                    <li
                      key={entry.rank}
                      className="flex items-center justify-between rounded-lg border border-border/70 bg-background/80 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          #{entry.rank} {entry.playerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.yearsPlayed} years played
                        </p>
                      </div>
                      <p className="font-mono text-sm font-semibold">
                        {formatGold(entry.netWorth)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </main>
  )
}
