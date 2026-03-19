"use client"

import { motion } from "framer-motion"
import { Loader2, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"

export function GameSubmitAction({
  gameOver,
  gameId,
  sessionId,
  isSubmitting,
  isSubmitGuideStep,
  prefersReducedMotion,
  submitButtonRef,
  onViewResults,
  onSubmit,
}: {
  gameOver: boolean
  gameId: string
  sessionId: string | null
  isSubmitting: boolean
  isSubmitGuideStep: boolean
  prefersReducedMotion: boolean
  submitButtonRef: React.RefObject<HTMLButtonElement | null>
  onViewResults: (path: string) => void
  onSubmit: () => void
}) {
  if (gameOver) {
    return (
      <Button
        type="button"
        className="h-12 w-full bg-green-600 text-base hover:bg-green-700"
        onClick={() =>
          onViewResults(
            `/dashboard/game/results?gameId=${gameId}${sessionId ? `&sessionId=${sessionId}` : ""}`,
          )
        }
      >
        <Trophy className="mr-2 size-4" />
        View Results
      </Button>
    )
  }

  return (
    <Button
      ref={submitButtonRef}
      type="button"
      className="relative h-12 w-full overflow-hidden text-base"
      onClick={onSubmit}
      disabled={isSubmitting}
    >
      <motion.span
        className="relative z-10 inline-flex items-center"
        animate={
          isSubmitGuideStep && !prefersReducedMotion
            ? {
                scale: [1, 1.04, 1],
              }
            : undefined
        }
        transition={
          isSubmitGuideStep && !prefersReducedMotion
            ? {
                duration: 1.3,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }
            : undefined
        }
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Done trading & roll events"
        )}
      </motion.span>
      {isSubmitGuideStep ? (
        <motion.span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent 15%, rgba(255, 215, 0, 0.38) 50%, transparent 85%)",
            backgroundSize: "240% 100%",
          }}
          animate={
            prefersReducedMotion ? undefined : { backgroundPosition: ["-140% 0%", "140% 0%"] }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : {
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }
          }
        />
      ) : null}
    </Button>
  )
}
