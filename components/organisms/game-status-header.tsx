"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Compass } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { StateVector } from "@/lib/types/state_vector"

export function GameStatusHeader({
  current,
  gameOver,
  goalAnimation,
  onStartGuide,
}: {
  current: StateVector
  gameOver: boolean
  goalAnimation: "reached" | "lost" | null
  onStartGuide: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">Year {current.date}</h1>
        <Badge
          variant={current.market.regime === "bull" ? "default" : "destructive"}
          className="text-[10px]"
        >
          {current.market.regime === "bull" ? "🐂 Bull" : "🐻 Bear"}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onStartGuide}>
          <Compass className="mr-1.5 size-3.5" />
          Guide
        </Button>
        <div className="text-right">
          <AnimatePresence mode="wait">
            {current.goalReached ? (
              <motion.div
                key="goal-reached"
                initial={{ opacity: 0, scale: 0.5, y: 4 }}
                animate={
                  goalAnimation === "reached"
                    ? { opacity: 1, scale: [1, 1.25, 1], y: 0 }
                    : { opacity: 1, scale: 1, y: 0 }
                }
                exit={{ opacity: 0, scale: 0.5, y: 4 }}
                transition={
                  goalAnimation === "reached"
                    ? { duration: 0.5, ease: "easeInOut" }
                    : { type: "spring", stiffness: 400, damping: 20 }
                }
              >
                <Badge variant="default" className="bg-green-600 text-[10px]">
                  🎯 Goal Reached
                </Badge>
              </motion.div>
            ) : goalAnimation === "lost" ? (
              <motion.div
                key="goal-lost"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: [1, 1, 0], y: [0, 0, 8], scale: [1, 1, 0.8] }}
                transition={{ duration: 1.5, times: [0, 0.6, 1] }}
              >
                <Badge variant="destructive" className="text-[10px]">
                  📉 Goal Lost
                </Badge>
              </motion.div>
            ) : null}
          </AnimatePresence>
          {gameOver && (
            <Badge variant="outline" className="ml-1 text-[10px]">
              Game Over
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
