import { Hono } from "hono"
import { handle } from "hono/vercel"
import { authMiddleware } from "@/lib/auth-middleware"
import chat from "./chat"
import health from "./health"
import quote from "./quote"

export const runtime = "nodejs"

const app = new Hono().basePath("/api")

// Resolve Better Auth session for all routes
app.use("*", authMiddleware)

const routes = app.route("/health", health).route("/chat", chat).route("/quote", quote)

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)

export type AppType = typeof routes
