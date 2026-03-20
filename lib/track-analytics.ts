/**
 * Fire-and-forget analytics tracking for the competition funnel.
 *
 * Uses ConvexHttpClient so it can be called from any client code
 * without needing React hooks or the ConvexReactClient context.
 */
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { getAnalyticsSessionId } from "@/hooks/use-game-session"
import { getOrCreateGuestId } from "@/lib/guest"

let _client: ConvexHttpClient | null = null

function getClient(): ConvexHttpClient {
  if (!_client) {
    _client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  }
  return _client
}

type LessonEvent =
  | "lesson_1_completed"
  | "lesson_2_completed"
  | "lesson_3_completed"
  | "lesson_4_completed"
  | "lesson_5_completed"
  | "lesson_6_completed"
  | "lesson_7_completed"

type AnalyticsEvent = LessonEvent | "account_created"

/**
 * Track an analytics event for the current session.
 * Silently no-ops if no session is stored (user not in a competition).
 */
export function trackAnalyticsEvent(event: AnalyticsEvent): void {
  const sessionId = getAnalyticsSessionId()
  if (!sessionId) return

  const guestId = getOrCreateGuestId()
  const client = getClient()

  client
    .mutation(api.game.trackAnalyticsEvent, {
      sessionId: sessionId as Id<"sessions">,
      event,
      guestId: guestId || undefined,
    })
    .catch(() => {}) // fire-and-forget
}

/**
 * Track a lesson completion by lesson number (1-7).
 */
export function trackLessonCompletion(lessonNumber: number): void {
  if (lessonNumber < 1 || lessonNumber > 7) return
  trackAnalyticsEvent(`lesson_${lessonNumber}_completed` as LessonEvent)
}

/**
 * Track the "Open Your Account" button click.
 */
export function trackAccountCreated(): void {
  trackAnalyticsEvent("account_created")
}
