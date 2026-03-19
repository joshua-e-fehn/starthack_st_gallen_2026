"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { formatTaler } from "@/lib/game/ui"

export function GameGoalProgress({
  goalProgressImageSrc,
  totalValue,
  goal,
  isFarmGuideStep,
  prefersReducedMotion,
  onTap,
}: {
  goalProgressImageSrc: string
  totalValue: number
  goal: number
  isFarmGuideStep: boolean
  prefersReducedMotion: boolean
  onTap: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onTap}
      className={`relative h-48 w-full overflow-hidden rounded-xl bg-muted/40 text-left ${isFarmGuideStep ? "cursor-pointer ring-2 ring-yellow-300/80" : "cursor-default"}`}
      animate={
        isFarmGuideStep && !prefersReducedMotion
          ? {
              scale: [1, 1.03, 1],
              boxShadow: [
                "0 0 0 0 rgba(255, 215, 0, 0)",
                "0 0 30px 0 rgba(255, 215, 0, 0.5)",
                "0 0 0 0 rgba(255, 215, 0, 0)",
              ],
            }
          : undefined
      }
      transition={
        isFarmGuideStep && !prefersReducedMotion
          ? {
              duration: 1.4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }
          : undefined
      }
      aria-label={isFarmGuideStep ? "Tap farm to continue onboarding" : "Farm progress"}
    >
      <Image
        src={goalProgressImageSrc}
        alt="Goal progress"
        fill
        className="absolute inset-0 object-contain object-center"
        unoptimized
        style={{ filter: "grayscale(100%)" }}
      />

      <Image
        src={goalProgressImageSrc}
        alt="Goal progress fill"
        fill
        className="absolute inset-0 object-contain object-center"
        unoptimized
        style={{
          clipPath: `inset(${Math.max(0, 100 - (totalValue / goal) * 100)}% 0 0 0)`,
          transition: "clip-path 0.3s ease-out",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-linear-to-t from-black/60 to-transparent py-3">
        <p className="font-mono text-sm font-bold text-white drop-shadow-md">
          {formatTaler(totalValue)} / {formatTaler(goal)} taler
        </p>
      </div>

      {isFarmGuideStep ? (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(45deg, transparent 15%, rgba(255, 215, 0, 0.34) 50%, transparent 85%)",
            backgroundSize: "220% 220%",
          }}
          animate={
            prefersReducedMotion ? undefined : { backgroundPosition: ["-120% 120%", "120% -120%"] }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : {
                  duration: 1.6,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }
          }
        />
      ) : null}
    </motion.button>
  )
}
