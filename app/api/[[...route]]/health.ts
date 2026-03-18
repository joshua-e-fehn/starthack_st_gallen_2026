import { Hono } from "hono"
import { requireAuth } from "@/lib/auth-middleware"

const app = new Hono()

// Public health check
app.get("/", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() })
})

// Auth-protected: returns current session info
app.get("/me", requireAuth, (c) => {
  const user = c.get("user")
  const session = c.get("session")
  return c.json({ user, session })
})

export default app
