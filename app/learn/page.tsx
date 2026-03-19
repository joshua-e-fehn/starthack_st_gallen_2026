"use client"

import { motion } from "framer-motion"
import { CheckIcon, LockIcon, SparklesIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { PublicHeader } from "@/components/organisms/public-header"
import { useLessonProgress } from "@/hooks/use-lesson-progress"
import { LESSONS } from "@/lib/lessons/data"
import { cn } from "@/lib/utils"

// ─── Layout ──────────────────────────────────────────────────────
// Top-to-bottom: lesson 1 at the top, castle at the bottom.
// Natural scroll direction, current lesson visible on load.
//
// X positions are percentages (scale with any width).
// Y positions are fixed px (consistent vertical rhythm).
// The SVG connector measures the container in real px so the bezier
// curves pass exactly through every node center — no scaling distortion.
//
// Zigzag pattern (% from left):
//   center(50) → right(70) → center(50) → left(30) → repeat

const NODE_GAP = 140 // vertical gap between node centers (px)
const NODE_R = 36 // node radius (px) — circle is 72px diameter
const GOAL_R = 42 // castle node radius
const TOP_PAD = 60 // first node top offset (px)

// 3D "puffy button" box-shadow per state (bottom edge extrusion + inner highlight)
const SHADOW_COMPLETED =
  "0 6px 0 0 oklch(0.50 0.17 145), inset 0 2px 4px oklch(1 0 0 / 25%), 0 2px 6px oklch(0 0 0 / 10%)"
const SHADOW_CURRENT =
  "0 6px 0 0 oklch(0.70 0.17 90), inset 0 2px 4px oklch(1 0 0 / 30%), 0 2px 8px oklch(0 0 0 / 12%)"
const SHADOW_LOCKED =
  "0 5px 0 0 oklch(0.78 0 0), inset 0 2px 3px oklch(1 0 0 / 20%), 0 2px 4px oklch(0 0 0 / 6%)"
const SHADOW_GOAL_LOCKED =
  "0 6px 0 0 oklch(0.75 0 0), inset 0 2px 4px oklch(1 0 0 / 18%), 0 2px 6px oklch(0 0 0 / 8%)"
const SHADOW_GOAL_DONE =
  "0 6px 0 0 oklch(0.70 0.17 90), inset 0 2px 4px oklch(1 0 0 / 30%), 0 2px 8px oklch(0 0 0 / 12%)"

const X_POSITIONS = [50, 70, 50, 30] // % from left, repeating

function getXPct(i: number): number {
  return X_POSITIONS[i % X_POSITIONS.length]
}
function getY(i: number): number {
  return TOP_PAD + i * NODE_GAP
}

export default function LearnPage() {
  const router = useRouter()
  const { isCompleted, isUnlocked, allCompleted, progress } = useLessonProgress()
  const characterRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(0)

  useEffect(() => {
    if (allCompleted) {
      router.push("/learn/complete")
    }
  }, [allCompleted, router])

  // Measure container width so SVG path uses real pixel coords
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const completedCount = progress.completedLessons.length
  const totalNodes = LESSONS.length + 1 // lessons + castle
  const pathHeight = TOP_PAD + (totalNodes - 1) * NODE_GAP + 100

  // Current lesson = first unlocked but incomplete
  const currentIdx = useMemo(
    () => LESSONS.findIndex((l) => isUnlocked(l.number) && !isCompleted(l.id)),
    [isUnlocked, isCompleted],
  )

  // Build SVG path in real pixel coordinates (computed from container width)
  const pathD = useMemo(() => {
    if (!containerW) return ""
    const pts = Array.from({ length: totalNodes }, (_, i) => ({
      x: (getXPct(i) / 100) * containerW,
      y: getY(i),
    }))
    if (pts.length < 2) return ""
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1]
      const c = pts[i]
      const midY = (p.y + c.y) / 2
      d += ` C ${p.x} ${midY}, ${c.x} ${midY}, ${c.x} ${c.y}`
    }
    return d
  }, [totalNodes, containerW])

  // Scroll character into view on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      characterRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />

      <main className="mx-auto max-w-md px-4 pb-12 pt-6 sm:max-w-lg sm:px-6 sm:pt-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-2 text-center"
        >
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Your Journey to the Farm
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Complete all 7 lessons to earn enough wisdom to buy your farm.
          </p>
          <div className="mx-auto mt-4 max-w-xs">
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>
                {completedCount}/{LESSONS.length}
              </span>
              <span>{Math.round((completedCount / LESSONS.length) * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / LESSONS.length) * 100}%` }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
          </div>
        </motion.div>

        {/* ── Winding Path (top → bottom) ─────────────── */}
        <div ref={containerRef} className="relative" style={{ height: pathHeight }}>
          {/*
           * SVG connector — no width/height attributes, sized purely by CSS.
           * viewBox matches container pixel dimensions → 1:1 coordinate mapping.
           * Path x-coords = (pct/100)*containerW, y-coords = getY(i).
           * Node CSS left:X% resolves to the same pixel values.
           */}
          {containerW > 0 && (
            <svg
              className="pointer-events-none absolute top-0 left-0 h-full w-full"
              viewBox={`0 0 ${containerW} ${pathHeight}`}
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <path
                d={pathD}
                fill="none"
                stroke="currentColor"
                className="text-primary/25"
                strokeWidth={3}
                strokeDasharray="12 10"
                strokeLinecap="round"
              />
            </svg>
          )}

          {/* ── Lesson nodes ── */}
          {LESSONS.map((lesson, i) => {
            const completed = isCompleted(lesson.id)
            const unlocked = isUnlocked(lesson.number)
            const isCurrent = i === currentIdx
            const xPct = getXPct(i)
            const yPx = getY(i)

            return (
              <motion.div
                key={lesson.id}
                ref={isCurrent ? characterRef : undefined}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.04 * i, duration: 0.3, type: "spring", stiffness: 220 }}
                className="absolute"
                style={{
                  left: `${xPct}%`,
                  top: yPx,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* wise_coini mascot next to current lesson */}
                {isCurrent && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35, type: "spring", stiffness: 180 }}
                    className={cn(
                      "absolute -top-1",
                      // Place mascot on the side with more room
                      xPct > 50 ? "-left-16 sm:-left-20" : "-right-16 sm:-right-20",
                    )}
                  >
                    <Image
                      src="/characters/wise_coini.webp"
                      alt="Wise Coini"
                      width={64}
                      height={64}
                      className="size-12 drop-shadow-lg sm:size-14"
                    />
                  </motion.div>
                )}

                <Link
                  href={unlocked ? `/learn/${lesson.id}` : "#"}
                  aria-disabled={!unlocked}
                  className={cn("flex flex-col items-center", !unlocked && "pointer-events-none")}
                >
                  {/* Circle — 3D puffy button */}
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full border-b-0 transition-transform active:translate-y-1 active:shadow-none hover:brightness-105",
                      completed && "border-4 border-success bg-success text-white",
                      isCurrent &&
                        "border-4 border-primary bg-primary text-primary-foreground ring-4 ring-primary/25",
                      !unlocked &&
                        !completed &&
                        !isCurrent &&
                        "border-4 border-muted bg-muted text-muted-foreground",
                    )}
                    style={{
                      width: NODE_R * 2,
                      height: NODE_R * 2,
                      boxShadow: completed
                        ? SHADOW_COMPLETED
                        : isCurrent
                          ? SHADOW_CURRENT
                          : SHADOW_LOCKED,
                    }}
                  >
                    {completed ? (
                      <CheckIcon className="size-7" strokeWidth={3} />
                    ) : !unlocked ? (
                      <LockIcon className="size-5 opacity-50" />
                    ) : (
                      <span className="text-xl">{lesson.icon}</span>
                    )}
                  </div>

                  {/* START badge */}
                  {isCurrent && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 rounded-md bg-primary px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-primary-foreground shadow"
                    >
                      Start
                    </motion.span>
                  )}

                  {/* Label */}
                  {(completed || isCurrent) && (
                    <span
                      className={cn(
                        "mt-1 max-w-24 text-center text-[11px] font-semibold leading-tight",
                        completed ? "text-success" : "text-foreground",
                      )}
                    >
                      {lesson.title}
                    </span>
                  )}
                </Link>
              </motion.div>
            )
          })}

          {/* ── Castle goal ── */}
          {(() => {
            const goalI = LESSONS.length
            const xPct = getXPct(goalI)
            const yPx = getY(goalI)
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.04 * goalI + 0.1, duration: 0.4, type: "spring" }}
                className="absolute"
                style={{
                  left: `${xPct}%`,
                  top: yPx,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <Link
                  href={allCompleted ? "/learn/complete" : "#"}
                  className={cn(
                    "flex flex-col items-center",
                    !allCompleted && "pointer-events-none",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full border-b-0 transition-transform active:translate-y-1 active:shadow-none hover:brightness-105",
                      allCompleted
                        ? "border-4 border-primary bg-primary/20 ring-4 ring-primary/25"
                        : "border-4 border-muted bg-muted/50",
                    )}
                    style={{
                      width: GOAL_R * 2,
                      height: GOAL_R * 2,
                      boxShadow: allCompleted ? SHADOW_GOAL_DONE : SHADOW_GOAL_LOCKED,
                    }}
                  >
                    <span className="text-3xl">�</span>
                  </div>
                  <span
                    className={cn(
                      "mt-1.5 text-sm font-bold",
                      allCompleted ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    The Farm
                  </span>
                  {allCompleted && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                      <SparklesIcon className="size-3" />
                      Claim reward
                    </span>
                  )}
                </Link>
              </motion.div>
            )
          })()}
        </div>
      </main>
    </div>
  )
}
