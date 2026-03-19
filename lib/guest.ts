/**
 * Guest player ID management.
 *
 * Unauthenticated users receive a random UUID stored in localStorage.
 * On the Convex side the player ID is stored as `guest:<uuid>` in the
 * `userId` field so that the same indexes / queries work for both
 * authenticated and guest players.
 */

const GUEST_ID_KEY = "guest_player_id"

/** Return (or create) a stable guest identifier for this browser. */
export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return ""
  let id = localStorage.getItem(GUEST_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(GUEST_ID_KEY, id)
  }
  return id
}

/** Check whether a userId was assigned to a guest player. */
export function isGuestPlayerId(userId: string): boolean {
  return userId.startsWith("guest:")
}
