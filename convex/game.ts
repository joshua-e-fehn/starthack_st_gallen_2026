import { v } from "convex/values"
import { gameStep, initializeGame, isGameOver, portfolioValue } from "../lib/game/engine"
import type { PlayerAction } from "../lib/types/actions"
import type { Scenario } from "../lib/types/scenario"
import { mutation, query } from "./_generated/server"
import { playerActionValidator } from "./validators"

// ─── Queries ─────────────────────────────────────────────────────

/** Get all games for the authenticated user */
export const listMyGames = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    return ctx.db
      .query("games")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect()
  },
})

/** Get a single game by ID (with auth check) */
export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) return null

    const identity = await ctx.auth.getUserIdentity()
    if (!identity || game.userId !== identity.subject) return null

    return game
  },
})

/** Get the full time series of state vectors for a game */
export const getGameTimeSeries = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const game = await ctx.db.get(args.gameId)
    if (!game || game.userId !== identity.subject) return []

    return ctx.db
      .query("gameSteps")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect()
  },
})

/** Get the latest state vector for a game */
export const getLatestState = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const game = await ctx.db.get(args.gameId)
    if (!game || game.userId !== identity.subject) return null

    const steps = await ctx.db
      .query("gameSteps")
      .withIndex("by_game_step", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .first()

    return steps
  },
})

/** Get a specific scenario by ID */
export const getScenario = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.scenarioId)
  },
})

/** List all available scenarios */
export const listScenarios = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("scenarios").collect()
  },
})

// ─── Mutations ───────────────────────────────────────────────────

/** Start a new game from a scenario */
export const startGame = mutation({
  args: {
    scenarioId: v.id("scenarios"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const scenarioDoc = await ctx.db.get(args.scenarioId)
    if (!scenarioDoc) throw new Error("Scenario not found")

    // Map Convex document → Scenario type
    const { _id, _creationTime, ...rest } = scenarioDoc
    const scenario: Scenario = { id: _id, ...rest }

    const initialState = initializeGame(scenario)

    // Create game record
    const gameId = await ctx.db.insert("games", {
      scenarioId: args.scenarioId,
      userId: identity.subject,
      status: "active",
      currentStep: 0,
      createdAt: Date.now(),
    })

    // Persist initial state vector (step 0)
    await ctx.db.insert("gameSteps", {
      gameId,
      step: initialState.step,
      date: initialState.date,
      portfolio: initialState.portfolio,
      market: initialState.market,
      events: initialState.events,
      actions: initialState.actions,
    })

    return gameId
  },
})

/** Submit player actions and advance the game by one step */
export const submitStep = mutation({
  args: {
    gameId: v.id("games"),
    actions: v.array(playerActionValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    // Load game
    const game = await ctx.db.get(args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.userId !== identity.subject) throw new Error("Not your game")
    if (game.status !== "active") throw new Error("Game is not active")

    // Load scenario
    const scenarioDoc = await ctx.db.get(game.scenarioId)
    if (!scenarioDoc) throw new Error("Scenario not found")
    const { _id, _creationTime, ...rest } = scenarioDoc
    const scenario: Scenario = { id: _id, ...rest }

    // Load latest state
    const latestStep = await ctx.db
      .query("gameSteps")
      .withIndex("by_game_step", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .first()
    if (!latestStep) throw new Error("No game state found")

    const prevState = {
      step: latestStep.step,
      date: latestStep.date,
      portfolio: latestStep.portfolio,
      market: latestStep.market,
      events: latestStep.events,
      actions: latestStep.actions,
    }

    // Cast validated actions to the PlayerAction type
    const actions = args.actions as PlayerAction[]

    // Run engine step
    const newState = gameStep(scenario, prevState, actions)

    // Check if game is over
    const gameOver = isGameOver(scenario, newState)

    // Persist new state vector
    await ctx.db.insert("gameSteps", {
      gameId: args.gameId,
      step: newState.step,
      date: newState.date,
      portfolio: newState.portfolio,
      market: newState.market,
      events: newState.events,
      actions: newState.actions,
    })

    // Update game record
    await ctx.db.patch(args.gameId, {
      currentStep: newState.step,
      status: gameOver ? "finished" : "active",
    })

    return {
      state: newState,
      gameOver,
      portfolioValue: portfolioValue(newState.portfolio, newState.market),
    }
  },
})

/** Abandon a game (mark as abandoned) */
export const abandonGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const game = await ctx.db.get(args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.userId !== identity.subject) throw new Error("Not your game")

    await ctx.db.patch(args.gameId, { status: "abandoned" })
  },
})
