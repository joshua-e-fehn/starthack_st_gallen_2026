"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { notFound, useParams, useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { Line, LineChart, XAxis, YAxis } from "recharts"
import { PublicHeader } from "@/components/organisms/public-header"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useLessonProgress } from "@/hooks/use-lesson-progress"
import type { SlideChart } from "@/lib/lessons/data"
import { LESSONS } from "@/lib/lessons/data"
import { cn } from "@/lib/utils"

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
  }),
}

/** Renders a simple recharts LineChart from slide chart data */
function SlideLineChart({ chart }: { chart: SlideChart }) {
  const config = Object.fromEntries(
    chart.lines.map((line) => [line.key, { label: line.label, color: line.color }]),
  )

  return (
    <div className="mt-3 w-full">
      <ChartContainer config={config} className="aspect-[5/2] max-h-32 w-full">
        <LineChart data={chart.data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey={chart.xKey}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={chart.xInterval ?? "preserveStartEnd"}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={40}
            domain={chart.yDomain ?? ["auto", "auto"]}
            tickFormatter={(v: number) => `${v}${chart.ySuffix ?? ""}`}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {chart.lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={2.5}
              strokeDasharray={line.dashed ? "6 3" : undefined}
              dot={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      {/* Simple inline legend */}
      <div className="mt-1 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        {chart.lines.map((line) => (
          <span key={line.key} className="flex items-center gap-1">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: line.color }}
            />
            {line.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function LessonPage() {
  const params = useParams<{ lessonId: string }>()
  const router = useRouter()
  const { completeLesson, isCompleted, isUnlocked, progress } = useLessonProgress()

  const lesson = LESSONS.find((l) => l.id === params.lessonId)
  if (!lesson) notFound()

  const unlocked = isUnlocked(lesson.number)
  const completed = isCompleted(lesson.id)

  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(1)

  const totalSlides = lesson.slides.length
  const isLastSlide = currentSlide === totalSlides - 1
  const slide = lesson.slides[currentSlide]

  const goNext = useCallback(() => {
    if (isLastSlide) {
      completeLesson(lesson.id)
      // Check if completing this lesson finishes all of them
      const completedAfter = new Set(progress.completedLessons)
      completedAfter.add(lesson.id)
      if (completedAfter.size >= LESSONS.length) {
        router.push("/learn/complete")
      } else {
        router.push("/learn")
      }
    } else {
      setDirection(1)
      setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1))
    }
  }, [isLastSlide, completeLesson, lesson.id, totalSlides, progress.completedLessons, router])

  const goPrev = useCallback(() => {
    setDirection(-1)
    setCurrentSlide((prev) => Math.max(prev - 1, 0))
  }, [])

  // If lesson is locked, redirect back
  if (!unlocked) {
    return (
      <div className="min-h-svh bg-background">
        <PublicHeader />
        <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
          <span className="text-5xl">🔒</span>
          <h1 className="mt-4 text-2xl font-bold">Lesson Locked</h1>
          <p className="mt-2 text-muted-foreground">
            Complete the previous lessons to unlock this one.
          </p>
          <Button asChild className="mt-6">
            <Link href="/learn">Back to Path</Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />

      <main className="mx-auto flex max-w-2xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        {/* Lesson header */}
        <div className="mb-2 flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/learn">
              <ArrowLeftIcon className="mr-1 size-4" />
              Path
            </Link>
          </Button>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Lesson {lesson.number}
          </span>
        </div>

        <h1 className="mb-1 text-2xl font-bold">
          {lesson.icon} {lesson.title}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">{lesson.description}</p>

        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {lesson.slides.map((s, i) => (
            <button
              type="button"
              key={s.title}
              onClick={() => {
                setDirection(i > currentSlide ? 1 : -1)
                setCurrentSlide(i)
              }}
              className={cn(
                "h-2 rounded-full transition-all duration-200",
                i === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30",
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Slide content */}
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border bg-card p-6 sm:p-8",
            slide.chart ? "min-h-0" : "min-h-70 sm:min-h-60",
            isLastSlide && "border-primary/40 shadow-[0_0_20px_rgba(255,215,0,0.15)]",
          )}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col items-center text-center"
            >
              {isLastSlide ? (
                <>
                  <motion.div
                    className="flex size-14 items-center justify-center rounded-full bg-success/10"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="size-8 text-success"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <motion.path
                        d="M5 13l4 4L19 7"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
                      />
                    </svg>
                  </motion.div>
                  <motion.h2
                    className="mt-3 text-xl font-semibold sm:text-2xl"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    {slide.title}
                  </motion.h2>
                </>
              ) : (
                <>
                  {slide.emoji && <span className="text-4xl">{slide.emoji}</span>}
                  <h2 className={cn("text-xl font-semibold sm:text-2xl", slide.emoji && "mt-1")}>
                    {slide.title}
                  </h2>
                </>
              )}
              {slide.image && (
                <div
                  className={cn("mt-2 overflow-hidden rounded-lg", slide.chart ? "mt-1" : "mt-3")}
                >
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    width={320}
                    height={180}
                    className={cn(
                      "h-auto w-auto rounded-lg object-cover",
                      slide.chart ? "max-h-16" : "max-h-36",
                    )}
                  />
                </div>
              )}
              {isLastSlide ? (
                <motion.p
                  className="mt-4 max-w-lg leading-relaxed text-muted-foreground"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                >
                  {slide.content}
                </motion.p>
              ) : (
                <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
                  {slide.content}
                </p>
              )}
              {slide.chart && <SlideLineChart chart={slide.chart} />}
              {slide.tip && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-left">
                  <span className="mt-0.5 shrink-0 text-sm">💡</span>
                  <p className="text-sm leading-relaxed text-foreground/80">{slide.tip}</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" disabled={currentSlide === 0} onClick={goPrev}>
            <ArrowLeftIcon className="mr-1 size-4" />
            Back
          </Button>

          <span className="text-sm text-muted-foreground">
            {currentSlide + 1} / {totalSlides}
          </span>

          <Button onClick={goNext}>
            {isLastSlide ? (
              <>
                <CheckIcon className="mr-1 size-4" />
                {lesson.number === LESSONS.length ? "Claim Your Reward" : "Complete"}
              </>
            ) : (
              <>
                Next
                <ArrowRightIcon className="ml-1 size-4" />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}
