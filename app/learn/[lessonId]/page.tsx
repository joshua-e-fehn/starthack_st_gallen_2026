"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, SparklesIcon } from "lucide-react"
import Link from "next/link"
import { notFound, useParams } from "next/navigation"
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
          <XAxis dataKey={chart.xKey} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
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
  const { completeLesson, isCompleted, isUnlocked, allCompleted } = useLessonProgress()

  const lesson = LESSONS.find((l) => l.id === params.lessonId)
  if (!lesson) notFound()

  const unlocked = isUnlocked(lesson.number)
  const completed = isCompleted(lesson.id)

  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(1)
  const [justCompleted, setJustCompleted] = useState(false)

  const totalSlides = lesson.slides.length
  const isLastSlide = currentSlide === totalSlides - 1
  const slide = lesson.slides[currentSlide]

  const goNext = useCallback(() => {
    if (isLastSlide) {
      // Complete the lesson
      completeLesson(lesson.id)
      setJustCompleted(true)
    } else {
      setDirection(1)
      setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1))
    }
  }, [isLastSlide, completeLesson, lesson.id, totalSlides])

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

  // Completion state after finishing the lesson
  if (justCompleted || (completed && currentSlide === 0 && !justCompleted)) {
    if (justCompleted) {
      return (
        <div className="min-h-svh bg-background">
          <PublicHeader />
          <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="flex size-20 items-center justify-center rounded-full bg-success/10"
            >
              <CheckIcon className="size-10 text-success" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 text-2xl font-bold"
            >
              Lesson Complete!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-muted-foreground"
            >
              {lesson.icon} {lesson.title} — well done!
            </motion.p>

            {allCompleted ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8"
              >
                <p className="mb-4 text-lg font-semibold text-primary">
                  � All lessons complete! A surprise awaits...
                </p>
                <Button asChild size="lg">
                  <Link href="/learn/complete">
                    <SparklesIcon className="mr-2 size-4" />
                    See Your Reward
                  </Link>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-8"
              >
                <Button asChild>
                  <Link href="/learn">
                    Continue Your Journey
                    <ArrowRightIcon className="ml-1 size-4" />
                  </Link>
                </Button>
              </motion.div>
            )}
          </main>
        </div>
      )
    }
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
          {lesson.slides.map((slide, i) => (
            <button
              type="button"
              key={slide.title}
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
              <h2 className="text-xl font-semibold sm:text-2xl">{slide.title}</h2>
              <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">{slide.content}</p>
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
                Complete
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
