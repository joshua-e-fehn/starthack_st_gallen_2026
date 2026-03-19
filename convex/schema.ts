import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import {
  gameEventValidator,
  marketStateValidator,
  playerActionValidator,
  portfolioValidator,
  scenarioFieldsValidator,
} from "./validators"

const schema = defineSchema({
  // ─── Scenario: game configuration template ───
  scenarios: defineTable({
    ...scenarioFieldsValidator,
    mode: v.optional(v.union(v.literal("live"), v.literal("precomputed"))),
  }),

  // ─── Games: a single play-through ───
  games: defineTable({
    scenarioId: v.id("scenarios"),
    sessionId: v.optional(v.id("sessions")),
    userId: v.string(),
    playerName: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("finished"), v.literal("abandoned")),
    currentStep: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_scenario", ["scenarioId"])
    .index("by_session", ["sessionId"])
    .index("by_user_status", ["userId", "status"]),

  // ─── Sessions: Multiplayer competitive lobby ───
  sessions: defineTable({
    scenarioId: v.id("scenarios"),
    hostId: v.string(),
    name: v.string(),
    joinCode: v.string(),
    status: v.union(v.literal("waiting"), v.literal("active"), v.literal("completed")),
    createdAt: v.number(),
  })
    .index("by_joinCode", ["joinCode"])
    .index("by_status", ["status"]),

  // ─── Game Steps: time-series of state vectors ───
  gameSteps: defineTable({
    gameId: v.id("games"),
    step: v.number(),
    date: v.number(),
    portfolio: portfolioValidator,
    market: marketStateValidator,
    events: v.array(gameEventValidator),
    actions: v.array(playerActionValidator),
    goal: v.number(),
    goalReached: v.boolean(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_step", ["gameId", "step"]),
})

export default schema
