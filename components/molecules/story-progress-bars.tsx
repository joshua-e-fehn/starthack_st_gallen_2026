"use client"

import { motion } from "framer-motion"

import type { StorySlide } from "@/lib/types/onboarding"

type StoryProgressBarsProps = {
  slides: StorySlide[]
  currentIndex: number
  progress: number
}

export function StoryProgressBars({ slides, currentIndex, progress }: StoryProgressBarsProps) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {slides.map((slide, index) => {
        const activeProgress = index < currentIndex ? 1 : index === currentIndex ? progress : 0

        return (
          <div
            key={slide.id}
            className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ scaleX: activeProgress }}
              initial={false}
              style={{ transformOrigin: "left" }}
              transition={{ duration: 0.12, ease: "linear" }}
            />
          </div>
        )
      })}
    </div>
  )
}
