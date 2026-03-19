"use client"

import { ArrowRight } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { GameEvent } from "@/lib/types/events"

type EventWithEffects = GameEvent & {
  baseEventId?: string
  effects?: {
    quantityMultiplier?: number
    goldDelta?: number
    priceMultiplier?: number
    targetAsset?: string
  }
}

interface EventPopupProps {
  event: EventWithEffects | null
  open: boolean
  onClose: () => void
}

/**
 * Format effect as human-readable text with color coding
 */
function formatEffect(
  type: "quantity" | "gold" | "price",
  value: number,
  asset?: string,
): { text: string; color: string } {
  if (type === "quantity") {
    const percentChange = ((value - 1) * 100).toFixed(0)
    const sign = value > 1 ? "+" : ""
    const assetName = asset ? ` ${asset.charAt(0).toUpperCase() + asset.slice(1)}` : " All Goods"
    return {
      text: `${sign}${percentChange}%${assetName}`,
      color: value > 1 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
    }
  }

  if (type === "gold") {
    const sign = value > 0 ? "+" : ""
    return {
      text: `${sign}${value} Gold`,
      color: value > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400",
    }
  }

  if (type === "price") {
    const percentChange = ((value - 1) * 100).toFixed(0)
    const sign = value > 1 ? "+" : ""
    const assetName = asset ? ` ${asset.charAt(0).toUpperCase() + asset.slice(1)}` : " All"
    return {
      text: `${sign}${percentChange}% Price${assetName}`,
      color:
        value > 1 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400",
    }
  }

  return { text: "", color: "" }
}

/**
 * Get image path for an event based on its baseEventId
 */
function getEventImage(event: EventWithEffects): string {
  const eventId = event.baseEventId || "default"
  return `/events/${eventId}.webp`
}

export function EventPopup({ event, open, onClose }: EventPopupProps) {
  if (!event) return null

  const effects = event.effects || {}
  const imagePath = getEventImage(event)

  // Build impact list
  const impacts: Array<{ text: string; color: string }> = []

  if (effects.quantityMultiplier !== undefined) {
    impacts.push(formatEffect("quantity", effects.quantityMultiplier, effects.targetAsset))
  }

  if (effects.goldDelta !== undefined) {
    impacts.push(formatEffect("gold", effects.goldDelta))
  }

  if (effects.priceMultiplier !== undefined) {
    impacts.push(formatEffect("price", effects.priceMultiplier, effects.targetAsset))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{event.name}</DialogTitle>
          <DialogDescription className="text-base">{event.description}</DialogDescription>
        </DialogHeader>

        {/* Event Image */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          <Image
            src={imagePath}
            alt={event.name}
            fill
            className="object-cover"
            unoptimized
            priority
            onError={(e) => {
              // Fallback to placeholder if image not found
              const target = e.target as HTMLImageElement
              target.src = "/placeholder.svg"
            }}
          />
        </div>

        {/* Impact Display */}
        {impacts.length > 0 && (
          <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Impact:</h4>
            <div className="flex flex-wrap gap-2">
              {impacts.map((impact) => (
                <div
                  key={impact.text}
                  className={`rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow-sm ${impact.color}`}
                >
                  {impact.text}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto" size="lg">
            Continue
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
