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
  scenarios: defineTable(scenarioFieldsValidator),

  // ─── Game: a single play-through of a scenario ───
  games: defineTable({
    scenarioId: v.id("scenarios"),
    userId: v.string(),
    status: v.union(v.literal("active"), v.literal("finished"), v.literal("abandoned")),
    currentStep: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_scenario", ["scenarioId"])
    .index("by_user_status", ["userId", "status"]),

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
