"use client"

import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { StoryNavigation } from "@/components/molecules/story-navigation"
import { StoryProgressBars } from "@/components/molecules/story-progress-bars"
import { Card, CardContent } from "@/components/ui/card"
import type { StorySlide } from "@/lib/types/onboarding"

type StoryPlayerProps = {
  slides: StorySlide[]
  autoAdvanceMs?: number
  loop?: boolean
  previousAtStartLabel?: string
  completeLabel?: string
  onPreviousAtStart: () => void
  onComplete: () => void
}

export function StoryPlayer({
  slides,
  autoAdvanceMs = 7000,
  loop = false,
  previousAtStartLabel = "Back",
  completeLabel = "Start Main Game",
  onPreviousAtStart,
  onComplete,
}: StoryPlayerProps) {
  const LONG_PRESS_MS = 260
  const playerShellClassName =
    "mx-auto flex h-[calc(100vh-3rem)] w-full max-w-[430px] flex-col p-4 sm:h-[calc(100vh-3rem)] sm:p-6"
  const storyCardClassName = "flex-1 overflow-hidden py-0"
  const storyImageClassName = "h-full w-full object-cover object-center"
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const activePressZoneRef = useRef<"left" | "middle" | "right" | null>(null)
  const longPressTimeoutRef = useRef<number | null>(null)
  const isLongPressRef = useRef(false)

  const hasSlides = slides.length > 0
  const safeIndex = hasSlides ? Math.min(currentIndex, slides.length - 1) : 0
  const currentSlide = hasSlides ? slides[safeIndex] : undefined
  const isLast = hasSlides ? safeIndex === slides.length - 1 : true

  const previousLabel = useMemo(() => {
    if (!hasSlides) {
      return previousAtStartLabel
    }
    if (safeIndex === 0) {
      return previousAtStartLabel
    }
    return slides[safeIndex - 1]?.shortName ?? "Previous"
  }, [hasSlides, previousAtStartLabel, safeIndex, slides])

  const nextLabel = useMemo(() => {
    if (!hasSlides) {
      return completeLabel
    }
    if (isLast) {
      return completeLabel
    }
    return slides[safeIndex + 1]?.shortName ?? "Next"
  }, [completeLabel, hasSlides, isLast, safeIndex, slides])

  useEffect(() => {
    if (!hasSlides || isPaused) {
      return
    }

    const interval = window.setInterval(() => {
      setProgress((value) => Math.min(value + 100 / autoAdvanceMs, 1))
    }, 100)

    return () => {
      window.clearInterval(interval)
    }
  }, [autoAdvanceMs, hasSlides, isPaused])

  useEffect(() => {
    if (progress < 1) {
      return
    }

    if (isLast) {
      if (loop) {
        setProgress(0)
        setCurrentIndex(0)
      }
      return
    }

    setProgress(0)
    setCurrentIndex((index) => Math.min(index + 1, slides.length - 1))
  }, [isLast, loop, progress, slides.length])

  const goPrevious = () => {
    if (!hasSlides || safeIndex === 0) {
      onPreviousAtStart()
      return
    }
    setProgress(0)
    setCurrentIndex((index) => Math.max(index - 1, 0))
  }

  const goNext = () => {
    if (!hasSlides || isLast) {
      onComplete()
      return
    }
    setProgress(0)
    setCurrentIndex((index) => Math.min(index + 1, slides.length - 1))
  }

  const clearLongPressTimeout = useCallback(() => {
    if (longPressTimeoutRef.current !== null) {
      window.clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
  }, [])

  const startPress = (zone: "left" | "middle" | "right") => {
    activePressZoneRef.current = zone
    isLongPressRef.current = false
    clearLongPressTimeout()

    if (zone === "middle") {
      setIsPaused(true)
    }

    longPressTimeoutRef.current = window.setTimeout(() => {
      isLongPressRef.current = true
      setIsPaused(true)
    }, LONG_PRESS_MS)
  }

  const endPress = (zone: "left" | "middle" | "right") => {
    const zoneChanged = activePressZoneRef.current !== zone
    const wasLongPress = isLongPressRef.current

    clearLongPressTimeout()
    activePressZoneRef.current = null

    if (zone === "middle") {
      setIsPaused(false)
      isLongPressRef.current = false
      return
    }

    if (wasLongPress) {
      setIsPaused(false)
      isLongPressRef.current = false
      return
    }

    if (zoneChanged) {
      return
    }

    if (zone === "left") {
      goPrevious()
      return
    }

    if (zone === "right") {
      goNext()
    }
  }

  useEffect(() => {
    return () => {
      clearLongPressTimeout()
    }
  }, [clearLongPressTimeout])

  if (!currentSlide) {
    return (
      <div className={playerShellClassName}>
        <Card className={storyCardClassName}>
          <CardContent className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
            No stories available yet.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={playerShellClassName}>
      <StoryProgressBars slides={slides} currentIndex={safeIndex} progress={progress} />

      <Card className={storyCardClassName}>
        <CardContent className="relative flex h-full flex-col gap-0 p-0">
          <AnimatePresence mode="wait">
            <motion.section
              key={currentSlide.id}
              className="flex h-full flex-col"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="h-[38%] min-h-[220px] w-full shrink-0 overflow-hidden sm:h-[40%]">
                {currentSlide.imageSrc ? (
                  <Image
                    src={currentSlide.imageSrc}
                    alt={currentSlide.title}
                    width={1600}
                    height={900}
                    sizes="(max-width: 640px) 100vw, 560px"
                    className={storyImageClassName}
                    priority={safeIndex === 0}
                  />
                ) : null}
              </div>

              <div className="flex min-h-0 flex-1 flex-col bg-secondary/20 px-4 py-4 sm:px-5 sm:py-5">
                <h1 className="mb-2 text-xl leading-tight font-bold tracking-tight text-foreground sm:text-2xl">
                  {safeIndex + 1}. {currentSlide.title}
                </h1>
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <p className="text-sm leading-6 text-foreground/85 sm:text-[15px]">
                    {currentSlide.body}
                  </p>
                </div>
                <p className="shrink-0 pt-3 text-[11px] leading-4 text-muted-foreground sm:text-xs">
                  {isLast
                    ? "You reached the final chapter. Press Start Main Game when you're ready."
                    : isPaused
                      ? "Paused while holding. Release to continue."
                      : "Tap left/right side for previous/next. Press and hold middle or long-press anywhere to pause."}
                </p>
              </div>
            </motion.section>
          </AnimatePresence>

          <div className="pointer-events-none absolute inset-0 z-20 grid grid-cols-3">
            <button
              type="button"
              aria-label="Previous slide"
              className="pointer-events-auto h-full w-full"
              onPointerDown={() => startPress("left")}
              onPointerUp={() => endPress("left")}
              onPointerCancel={() => {
                clearLongPressTimeout()
                activePressZoneRef.current = null
                setIsPaused(false)
              }}
              onPointerLeave={() => {
                clearLongPressTimeout()
                activePressZoneRef.current = null
                setIsPaused(false)
              }}
            />
            <button
              type="button"
              aria-label="Pause story"
              className="pointer-events-auto h-full w-full"
              onPointerDown={() => startPress("middle")}
              onPointerUp={() => endPress("middle")}
              onPointerCancel={() => {
                clearLongPressTimeout()
                activePressZoneRef.current = null
                setIsPaused(false)
              }}
              onPointerLeave={() => {
                clearLongPressTimeout()
                activePressZoneRef.current = null
                setIsPaused(false)
              }}
            />
            <button
              type="button"
              aria-label="Next slide"
              className="pointer-events-auto h-full w-full"
              onPointerDown={() => startPress("right")}
              onPointerUp={() => endPress("right")}
              onPointerCancel={() => {
                clearLongPressTimeout()
                activePressZoneRef.current = null
                setIsPaused(false)
              }}
              onPointerLeave={() => {
                clearLongPressTimeout()
                activePressZoneRef.current = null
                setIsPaused(false)
              }}
            />
          </div>
        </CardContent>
      </Card>

      <StoryNavigation
        previousLabel={previousLabel}
        nextLabel={nextLabel}
        isLast={isLast}
        onPrevious={goPrevious}
        onNext={goNext}
      />
    </div>
  )
}
