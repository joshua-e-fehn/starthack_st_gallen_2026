import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Check whether a string looks like a valid Convex document ID.
 * Convex IDs are URL-safe base64 strings, typically 20+ chars of [a-zA-Z0-9_-].
 * This prevents passing arbitrary path segments (e.g. "creats") to queries.
 */
export function isValidConvexId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{16,}$/.test(value)
}
