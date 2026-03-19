"use client"

import { motion } from "framer-motion"
import { ArrowLeftIcon, PartyPopperIcon, RotateCcwIcon, SparklesIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { PublicHeader } from "@/components/organisms/public-header"
import { Button } from "@/components/ui/button"
import { useLessonProgress } from "@/hooks/use-lesson-progress"
import { LESSONS } from "@/lib/lessons/data"

export default function LearnCompletePage() {
  const router = useRouter()
  const { allCompleted, progress, resetProgress } = useLessonProgress()

  // If not all completed, redirect back to learn path
  useEffect(() => {
    if (progress.completedLessons.length > 0 && !allCompleted) {
      router.replace("/learn")
    }
  }, [allCompleted, progress.completedLessons.length, router])

  // Don't render content until we confirm progress is loaded
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

      <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-12 text-center sm:px-6 sm:py-20">
        {/* Celebration animation */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.1 }}
          className="mb-6"
        >
          <span className="text-8xl">&#x1F381;</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="mb-4 flex items-center justify-center gap-2 text-primary">
            <SparklesIcon className="size-5" />
            <PartyPopperIcon className="size-5" />
            <SparklesIcon className="size-5" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">The Farm Is Yours!</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            You completed all {LESSONS.length} lessons and earned the wisdom to buy your farm. But
            the journey does not end here...
          </p>
        </motion.div>

        {/* PostFinance voucher surprise */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6, type: "spring", stiffness: 140 }}
          className="mt-8 w-full max-w-md overflow-hidden rounded-2xl border-2 border-primary bg-gradient-to-b from-primary/10 to-primary/5 p-8 text-center shadow-lg"
        >
          <motion.div
            initial={{ rotate: -10, scale: 0.5 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 1.4, type: "spring", stiffness: 200 }}
          >
            <SparklesIcon className="mx-auto size-10 text-primary" />
          </motion.div>
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
            className="mt-4 text-xl font-bold"
          >
            🎉 Your Real Reward
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="mt-3 text-base leading-relaxed text-foreground"
          >
            You proved you understand the fundamentals of investing. Now it is time to put knowledge
            into practice — <strong>for real.</strong>
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.0 }}
            className="mt-5 rounded-xl border border-primary/30 bg-card px-6 py-5 shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              PostFinance Voucher
            </p>
            <p className="mt-2 text-3xl font-bold text-primary">CHF 20</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Invest in one of the selected strategies on{" "}
              <a
                href="https://www.postfinance.ch"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
              >
                PostFinance.ch
              </a>
            </p>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.3 }}
            className="mt-4 text-xs text-muted-foreground/80"
          >
            Scan the QR code at the booth or ask a team member to redeem your voucher.
          </motion.p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Button variant="outline" asChild>
            <Link href="/learn">
              <ArrowLeftIcon className="mr-1 size-4" />
              Review Lessons
            </Link>
          </Button>
          <Button asChild>
            <Link href="/">Play the Full Game</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetProgress()
              router.push("/learn")
            }}
          >
            <RotateCcwIcon className="mr-1 size-4" />
            Start Over
          </Button>
        </motion.div>
      </main>
    </div>
  )
}
