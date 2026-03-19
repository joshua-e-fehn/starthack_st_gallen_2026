"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "learn-progress"

export type LessonProgress = {
  completedLessons: string[]
}

function loadProgress(): LessonProgress {
  if (typeof window === "undefined") return { completedLessons: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { completedLessons: [] }
    const parsed = JSON.parse(raw) as LessonProgress
    return {
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
    }
  } catch {
    return { completedLessons: [] }
  }
}

function saveProgress(progress: LessonProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function useLessonProgress() {
  const [progress, setProgress] = useState<LessonProgress>({ completedLessons: [] })

  useEffect(() => {
    setProgress(loadProgress())
  }, [])

  const completeLesson = useCallback((lessonId: string) => {
    setProgress((prev) => {
      if (prev.completedLessons.includes(lessonId)) return prev
      const next = { completedLessons: [...prev.completedLessons, lessonId] }
      saveProgress(next)
      return next
    })
  }, [])

  const isCompleted = useCallback(
    (lessonId: string) => progress.completedLessons.includes(lessonId),
    [progress.completedLessons],
  )

  const isUnlocked = useCallback(
    (lessonNumber: number) => {
      // Lesson 1 is always unlocked; others need the previous lesson completed
      if (lessonNumber <= 1) return true
      // Import dynamically avoided — just check count
      return progress.completedLessons.length >= lessonNumber - 1
    },
    [progress.completedLessons],
  )

  const allCompleted = progress.completedLessons.length >= 7

  const resetProgress = useCallback(() => {
    const empty: LessonProgress = { completedLessons: [] }
    saveProgress(empty)
    setProgress(empty)
  }, [])

  return { progress, completeLesson, isCompleted, isUnlocked, allCompleted, resetProgress }
}
