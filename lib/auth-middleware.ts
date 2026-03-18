import { createMiddleware } from "hono/factory"

/**
 * Session type inferred from Better Auth's session response.
 * Since Better Auth runs inside Convex, we validate sessions by calling
 * the Better Auth session endpoint on the Convex site URL.
 */
export type SessionUser = {
  id: string
  name: string
  email: string
  image: string | null
  createdAt: string
  updatedAt: string
}

export type Session = {
  id: string
  userId: string
  expiresAt: string
  token: string
}

export type AuthSession = {
  user: SessionUser
  session: Session
}

type AuthEnv = {
  Variables: {
    user: SessionUser | null
    session: Session | null
  }
}

/**
 * Hono middleware that resolves the Better Auth session from cookies.
 * Sets `user` and `session` on the Hono context.
 *
 * Since Better Auth runs inside Convex, we validate by forwarding
 * the session cookie to the Better Auth `/api/auth/get-session` endpoint.
 */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  try {
    // Forward cookies to the Better Auth session endpoint
    const cookieHeader = c.req.header("cookie") ?? ""

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/api/auth/get-session`,
      {
        headers: {
          cookie: cookieHeader,
        },
      },
    )

    if (response.ok) {
      const data = (await response.json()) as AuthSession
      if (data?.user && data?.session) {
        c.set("user", data.user)
        c.set("session", data.session)
        await next()
        return
      }
    }
  } catch {
    // Session validation failed — continue as unauthenticated
  }

  c.set("user", null)
  c.set("session", null)
  await next()
})

/**
 * Hono middleware that requires a valid session.
 * Returns 401 if no session is found.
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const user = c.get("user")
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }
  await next()
})
