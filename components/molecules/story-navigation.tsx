"use client"

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
    <div className="mt-4 grid grid-cols-2 gap-3">
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
        className="h-12 justify-end gap-2 rounded-xl font-semibold"
      >
        {nextLabel}
        {!isLast ? <ChevronRight className="size-4" /> : null}
      </Button>
    </div>
  )
}
