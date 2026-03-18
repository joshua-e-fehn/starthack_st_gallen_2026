import { Hono } from "hono"
import { handle } from "hono/vercel"
import { authMiddleware } from "@/lib/auth-middleware"
import health from "./health"

export const runtime = "nodejs"

const app = new Hono().basePath("/api")

// Resolve Better Auth session for all routes
app.use("*", authMiddleware)

const routes = app.route("/health", health)

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)

export type AppType = typeof routes
