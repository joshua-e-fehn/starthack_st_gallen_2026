"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "game-session"

export type GameSessionInfo = {
  /** Convex session ID (the "event" the player joined) */
  sessionId: string
  /** Convex game ID assigned to the player within that event */
  gameId: string
  /** Player display name used when joining */
  playerName: string
  /** 4-char join code (for display / re-join) */
  joinCode?: string
  /** Timestamp when the player joined the event */
  joinedAt: number
}

function load(): GameSessionInfo | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GameSessionInfo
  } catch {
    return null
  }
}

function save(info: GameSessionInfo) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info))
}

function clear() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Track whether the current browser user has joined an event.
 *
 * An "event" is a single competitive session. Each user can only
 * participate in one event at a time — calling `joinEvent()` replaces
 * any previously stored event. Works for both authenticated and guest
 * (not-logged-in) users via localStorage.
 *
 * Future: support multiple concurrent events per user.
 */
export function useGameSession() {
  const [info, setInfo] = useState<GameSessionInfo | null>(null)

  useEffect(() => {
    setInfo(load())
  }, [])

  /** Record that the user has joined an event (replaces any previous) */
  const joinEvent = useCallback((data: Omit<GameSessionInfo, "joinedAt">) => {
    const entry: GameSessionInfo = { ...data, joinedAt: Date.now() }
    save(entry)
    setInfo(entry)
  }, [])

  /** Clear the stored event (e.g. when game ends or user leaves) */
  const leaveEvent = useCallback(() => {
    clear()
    setInfo(null)
  }, [])

  return {
    /** Whether the user is currently in an event */
    hasJoinedEvent: info !== null,
    /** Full event details (null if not joined) */
    gameSession: info,
    /** Store a new event join (one at a time) */
    joinEvent,
    /** Clear the stored event */
    leaveEvent,
  }
}

// ─── Non-hook utilities (for use outside React components) ────

/** Check if a game session is stored (synchronous, no hook needed) */
export function hasStoredGameSession(): boolean {
  return load() !== null
}

/** Read the stored game session (synchronous) */
export function getStoredGameSession(): GameSessionInfo | null {
  return load()
}

/** Store a game session (synchronous) */
export function storeGameSession(data: Omit<GameSessionInfo, "joinedAt">) {
  save({ ...data, joinedAt: Date.now() })
}

/** Clear the stored game session (synchronous) */
export function clearStoredGameSession() {
  clear()
}
