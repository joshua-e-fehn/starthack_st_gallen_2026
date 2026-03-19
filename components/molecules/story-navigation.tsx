"use client"

import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

type StoryNavigationProps = {
  previousLabel: string
  nextLabel: string
  isLast: boolean
  onPrevious: () => void
  onNext: () => void
}

export function StoryNavigation({
  previousLabel,
  nextLabel,
  isLast,
  onPrevious,
  onNext,
}: StoryNavigationProps) {
  return (
    <div className="mt-4">
      {isLast ? (
        <p className="mb-2 text-center text-xs font-semibold tracking-wide text-primary/90 uppercase">
          Final story complete. Press Start Main Game to begin.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onPrevious}
          className="h-12 justify-start gap-2 rounded-xl font-semibold"
        >
          <ChevronLeft className="size-4" />
          {previousLabel}
        </Button>

        <Button
          type="button"
          onClick={onNext}
          className={
            isLast
              ? "relative h-12 justify-end gap-2 overflow-hidden rounded-xl border border-primary/60 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.45),transparent_40%),linear-gradient(110deg,oklch(0.8_0.15_88)_0%,oklch(0.88_0.17_90)_40%,oklch(0.95_0.18_95)_52%,oklch(0.88_0.17_90)_64%,oklch(0.8_0.15_88)_100%)] text-primary-foreground font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-10px_18px_rgba(166,108,0,0.2),0_14px_34px_rgba(239,173,0,0.42)]"
              : "h-12 justify-end gap-2 rounded-xl font-semibold"
          }
        >
          {isLast ? (
            <>
              <motion.span
                className="pointer-events-none absolute -inset-y-6 -left-1/2 w-1/2 rotate-14 bg-linear-to-r from-transparent via-white/85 to-transparent blur-xs"
                initial={{ x: "-180%", opacity: 0.35 }}
                animate={{ x: ["-180%", "420%"], opacity: [0.2, 0.9, 0.2] }}
                transition={{
                  duration: 1.85,
                  ease: [0.22, 1, 0.36, 1],
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 1.4,
                }}
              />
              <motion.span
                className="pointer-events-none absolute inset-0 rounded-xl border border-white/45"
                animate={{ opacity: [0.35, 0.8, 0.35] }}
                transition={{ duration: 2.2, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
              />
            </>
          ) : null}

          <span className="relative z-10">{nextLabel}</span>
          {!isLast ? <ChevronRight className="size-4" /> : null}
        </Button>
      </div>
    </div>
  )
}
