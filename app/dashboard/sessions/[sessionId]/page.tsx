"use client"

import { useQuery } from "convex/react"
import { motion } from "framer-motion"
import {
  ActivityIcon,
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  Loader2,
  QrCodeIcon,
  UsersIcon,
} from "lucide-react"
import { useParams } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { useCallback, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

function formatTaler(value: number) {
  return `${new Intl.NumberFormat("de-CH").format(Math.round(value))} taler`
}

export default function SessionLobbyPage() {
  const params = useParams()
  const sessionId = params.sessionId as Id<"sessions">

  const sessionData = useQuery(api.game.getSessionWithLeaderboard, { sessionId })

  const [copied, setCopied] = useState(false)

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
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
            <a href="/dashboard">
              <ArrowLeftIcon className="mr-1 size-4" />
              Back
            </a>
          </Button>

          <Card className="border-primary/20 bg-card/95 shadow-lg backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">{session.name}</CardTitle>
                  <CardDescription>Share this code or QR for players to join</CardDescription>
                </div>
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
                    className="h-auto w-full max-w-[200px]"
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

        {/* Live Players */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-primary/20 bg-card/95 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <UsersIcon className="size-4 text-primary" />
                Players
                <Badge variant="secondary" className="ml-auto text-xs">
                  {leaderboard.length} joined
                </Badge>
              </CardTitle>
              <CardDescription>Players appear here as they join the session.</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <UsersIcon className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Waiting for players to join...</p>
                  <p className="text-xs text-muted-foreground">
                    Share the QR code or join code above
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => (
                    <motion.div
                      key={entry.gameId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2.5",
                        index === 0
                          ? "border-yellow-500/20 bg-yellow-500/5"
                          : "border-border/70 bg-background/80",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                            index === 0
                              ? "bg-yellow-500 text-yellow-950"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold">{entry.playerName}</p>
                          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <ActivityIcon className="size-2" />
                            {entry.status}
                          </p>
                        </div>
                      </div>
                      <p className="font-mono text-sm font-black text-primary">
                        {formatTaler(entry.netWorth)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
