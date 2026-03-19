"use client"

import { motion } from "framer-motion"
import { ArrowRight, CheckIcon, LockIcon, SparklesIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef } from "react"
import { PublicHeader } from "@/components/organisms/public-header"
import { Button } from "@/components/ui/button"
import { useGameSession } from "@/hooks/use-game-session"
import { useLessonProgress } from "@/hooks/use-lesson-progress"
import { LESSONS } from "@/lib/lessons/data"
import { cn } from "@/lib/utils"

// ─── 3D puffy shadows ───────────────────────────────────────────
const SHADOW_COMPLETED =
  "0 6px 0 0 oklch(0.50 0.17 145), inset 0 2px 4px oklch(1 0 0 / 25%), 0 2px 6px oklch(0 0 0 / 10%)"
const SHADOW_CURRENT =
  "0 6px 0 0 oklch(0.70 0.17 90), inset 0 2px 4px oklch(1 0 0 / 30%), 0 2px 8px oklch(0 0 0 / 12%)"
const SHADOW_LOCKED =
  "0 5px 0 0 oklch(0.78 0 0), inset 0 2px 3px oklch(1 0 0 / 20%), 0 2px 4px oklch(0 0 0 / 6%)"

// S-curve offsets for 7 nodes (one per lesson — lesson 7 is the farm)
// Smooth sine wave: center → right → far-right → center → far-left → left → center
const PATH_OFFSETS = [0, 55, 70, 30, -30, -70, -55]

const NODE_SIZE = 72

export default function LearnPage() {
  const { isCompleted, isUnlocked, progress } = useLessonProgress()
  const { hasJoinedEvent, gameSession } = useGameSession()
  const currentRef = useRef<HTMLDivElement>(null)

  const completedCount = progress.completedLessons.length

  const currentIdx = useMemo(
    () => LESSONS.findIndex((l) => isUnlocked(l.number) && !isCompleted(l.id)),
    [isUnlocked, isCompleted],
  )

  // Scroll current lesson into view on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 350)
    return () => clearTimeout(timer)
  }, [])

  const isLastLesson = (i: number) => i === LESSONS.length - 1

  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />

      <main className="mx-auto max-w-sm px-4 pb-16 pt-3 sm:max-w-md sm:px-6 sm:pt-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className="mb-1 inline-block"
          >
            <Image
              src="/asset-classes/farm.webp"
              alt="The Farm"
              width={120}
              height={120}
              className="h-32 w-auto drop-shadow-md sm:h-36"
            />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Your Journey to your Farm
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Complete all 7 lessons to claim your reward!
          </p>

          <div className="mx-auto mt-8 max-w-xs">
            <div className="relative h-4 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary via-primary/90 to-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / LESSONS.length) * 100}%` }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-wide text-foreground/70">
                {completedCount} / {LESSONS.length}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Progression Stack ─────────────────────────── */}
        <div className="relative flex flex-col items-center gap-6">
          {LESSONS.map((lesson, i) => {
            const completed = isCompleted(lesson.id)
            const unlocked = isUnlocked(lesson.number)
            const isCurrent = i === currentIdx
            const isFarm = isLastLesson(i)
            const offset = PATH_OFFSETS[i] ?? 0
            // Mascot goes to whichever side has more space (opposite of offset)
            const mascotOnLeft = offset > 0

            return (
              <motion.div
                key={lesson.id}
                ref={isCurrent ? currentRef : undefined}
                initial={{ opacity: 0, y: 20, x: offset }}
                animate={{ opacity: 1, y: 0, x: offset }}
                transition={{ delay: 0.04 * i, duration: 0.35 }}
                className="relative z-10 flex flex-col items-center"
              >
                {/* Floating tooltip above current node */}
                {isCurrent && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                    className="mb-2 flex flex-col items-center"
                  >
                    <span className="rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-md">
                      {lesson.title}
                    </span>
                    {/* Caret */}
                    <div className="size-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-primary" />
                  </motion.div>
                )}

                {/* Mascot — positioned on the side with more space */}
                {isCurrent && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 180 }}
                    className={cn(
                      "absolute top-1/2 z-20 -translate-y-1/2",
                      mascotOnLeft ? "-left-24 sm:-left-28" : "-right-24 sm:-right-28",
                    )}
                  >
                    <Image
                      src={
                        mascotOnLeft
                          ? "/characters/main_character_walking_left_to_right.webp"
                          : "/characters/main_character_walking_right_to_left.webp"
                      }
                      alt="Main Character"
                      width={120}
                      height={120}
                      className="h-40 w-auto drop-shadow-lg sm:h-44"
                    />
                  </motion.div>
                )}

                <Link
                  href={unlocked ? `/learn/${lesson.id}` : "#"}
                  aria-disabled={!unlocked}
                  className={cn("flex flex-col items-center", !unlocked && "pointer-events-none")}
                >
                  {/* 3D puffy circle */}
                  <motion.div
                    animate={isCurrent ? { scale: [1, 1.24, 1] } : undefined}
                    transition={
                      isCurrent
                        ? { duration: 1.0, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                        : undefined
                    }
                    className={cn(
                      "flex items-center justify-center rounded-full transition-transform active:translate-y-1 active:shadow-none hover:brightness-105",
                      completed && "border-4 border-success bg-success text-white",
                      isCurrent &&
                        "border-4 border-primary bg-primary text-primary-foreground ring-[6px] ring-primary/30",
                      !unlocked &&
                        !completed &&
                        !isCurrent &&
                        "border-4 border-muted bg-muted text-muted-foreground",
                    )}
                    style={{
                      width: NODE_SIZE,
                      height: NODE_SIZE,
                      boxShadow: completed
                        ? SHADOW_COMPLETED
                        : isCurrent
                          ? SHADOW_CURRENT
                          : SHADOW_LOCKED,
                    }}
                  >
                    {completed ? (
                      <CheckIcon className="size-7" strokeWidth={3} />
                    ) : isFarm ? (
                      <span className="text-2xl">{"\uD83C\uDFC6"}</span>
                    ) : !unlocked ? (
                      <LockIcon className="size-5 opacity-50" />
                    ) : (
                      <span className="text-2xl">{lesson.icon}</span>
                    )}
                  </motion.div>

                  {/* Farm label (always visible for last node) */}
                  {isFarm && !isCurrent && (
                    <span
                      className={cn(
                        "mt-2 text-sm font-bold",
                        completed ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      The Farm
                    </span>
                  )}
                  {isFarm && completed && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                      <SparklesIcon className="size-3" />
                      Claim reward
                    </span>
                  )}
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Dojo Trainingscamp */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mx-auto mt-12 max-w-sm"
        >
          <Link href="/game?mode=training">
            <div className="group relative overflow-hidden rounded-2xl border-4 border-amber-900/20 bg-linear-to-br from-amber-50 to-orange-100 p-6 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]">
              {/* Background Pattern */}
              <div className="absolute -right-4 -top-4 opacity-10 transition-transform group-hover:rotate-12 group-hover:scale-110">
                <span className="text-8xl">{"\uD83C\uDFEF"}</span>
              </div>

              <div className="relative z-10 flex items-center gap-5">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-amber-900/10 text-4xl shadow-inner">
                  {"\uD83C\uDFEF"}
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-black tracking-tight text-amber-900">
                    Dojo Trainingscamp
                  </h2>
                  <p className="text-sm font-medium text-amber-800/70">
                    Practice investing like a master. No competition, pure practice.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end">
                <span className="flex items-center gap-2 rounded-full bg-amber-900 px-4 py-1.5 text-xs font-bold text-amber-50 shadow-md transition-colors group-hover:bg-amber-800">
                  Enter Dojo <ArrowRight className="size-3" />
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      </main>

      {/* Floating "Back to Game" button when player has an active session */}
      {hasJoinedEvent && gameSession && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 22 }}
          className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4"
        >
          <Link href={`/?sessionId=${gameSession.sessionId}`}>
            <Button
              size="lg"
              className="gap-2.5 rounded-full px-7 py-3 text-base font-bold shadow-[0_4px_20px_oklch(0.75_0.18_90/0.45)] hover:shadow-[0_6px_28px_oklch(0.75_0.18_90/0.55)] transition-shadow"
            >
              {"\uD83C\uDFEF"} Back to Arena
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  )
}
