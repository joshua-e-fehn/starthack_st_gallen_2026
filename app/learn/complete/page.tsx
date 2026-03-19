"use client"

import { motion } from "framer-motion"
import { ArrowLeftIcon, ArrowRightIcon, SparklesIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { PublicHeader } from "@/components/organisms/public-header"
import { Button } from "@/components/ui/button"
import { useGameSession } from "@/hooks/use-game-session"
import { useLessonProgress } from "@/hooks/use-lesson-progress"
import { cn } from "@/lib/utils"

const STRATEGIES = [
  {
    id: "safe",
    icon: "🛡️",
    label: "Safe & Steady",
    risk: "Low risk",
    ret: "Low return",
    desc: "Mostly bonds & cash",
  },
  {
    id: "balanced",
    icon: "⚖️",
    label: "Balanced Mix",
    risk: "Medium risk",
    ret: "Medium return",
    desc: "Stocks & bonds blend",
  },
  {
    id: "growth",
    icon: "🚀",
    label: "Growth Focus",
    risk: "High risk",
    ret: "High return",
    desc: "Mostly stocks & crypto",
  },
] as const

export default function LearnCompletePage() {
  const router = useRouter()
  const { allCompleted, progress } = useLessonProgress()
  const { hasJoinedEvent, gameSession } = useGameSession()
  const [strategy, setStrategy] = useState<string | null>(null)

  useEffect(() => {
    if (progress.completedLessons.length > 0 && !allCompleted) {
      router.replace("/learn")
    }
  }, [allCompleted, progress.completedLessons.length, router])

  if (!allCompleted) {
    return (
      <div className="min-h-svh bg-background">
        <PublicHeader />
        <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />

      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-6 text-center sm:px-6 sm:py-10">
        {/* Celebration */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.1 }}
        >
          <span className="text-6xl">🎁</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-3"
        >
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">The Farm Is Yours!</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Congratulations! PostFinance gifts you money to start investing for real.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-primary bg-primary/10 px-5 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              PostFinance gifts you:{" "}
            </span>
            <span className="text-xl font-bold text-primary">CHF 20</span>
          </div>
        </motion.div>

        {/* Strategy picker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-5 w-full"
        >
          <p className="mb-3 text-sm font-medium">Choose your strategy:</p>
          <div className="grid grid-cols-3 gap-2">
            {STRATEGIES.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setStrategy(s.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all",
                  strategy === s.id
                    ? "border-primary bg-primary/10 shadow-md"
                    : "border-muted hover:border-primary/40",
                )}
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs font-semibold leading-tight">{s.label}</span>
                <span className="text-xs text-muted-foreground">{s.risk}</span>
                <span className="text-xs text-muted-foreground">{s.ret}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Open account CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="mt-5 w-full"
        >
          <Button asChild size="lg" className="w-full text-base" disabled={!strategy}>
            <a
              href="https://www.postfinance.ch"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(!strategy && "pointer-events-none opacity-50")}
            >
              <SparklesIcon className="mr-2 size-4" />
              Open Your Account
              <ArrowRightIcon className="ml-2 size-4" />
            </a>
          </Button>
          {!strategy && (
            <p className="mt-1.5 text-xs text-muted-foreground">Select a strategy to continue</p>
          )}
        </motion.div>

        {/* Bottom actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-6 flex items-center justify-center gap-3"
        >
          <Button variant="outline" size="sm" asChild>
            <Link href="/learn">
              <ArrowLeftIcon className="mr-1 size-3" />
              Review Lessons
            </Link>
          </Button>
          {hasJoinedEvent && gameSession ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/dashboard/game?sessionId=${gameSession.sessionId}&gameId=${gameSession.gameId}`,
                )
              }
            >
              {"\u2694\uFE0F"} Enter the Arena
              <ArrowRightIcon className="ml-1 size-3" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <ArrowLeftIcon className="mr-1 size-3" />
                Homepage
              </Link>
            </Button>
          )}
        </motion.div>
      </main>
    </div>
  )
}
