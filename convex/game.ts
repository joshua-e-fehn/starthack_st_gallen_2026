import { v } from "convex/values"
import { gameStep, initializeGame, isGameOver, portfolioValue } from "../lib/game/engine"
import type { PlayerAction } from "../lib/types/actions"
import type { Scenario } from "../lib/types/scenario"
import { mutation, query } from "./_generated/server"
import { playerActionValidator, scenarioFieldsValidator } from "./validators"

// ─── Queries ─────────────────────────────────────────────────────

/** Get current user identity */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.auth.getUserIdentity()
  },
})

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
    if (!game || !identity || game.userId !== identity.subject) return null

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

/** Create a new scenario (Debug helper) */
export const createScenario = mutation({
  args: scenarioFieldsValidator,
  handler: async (ctx, args) => {
    return await ctx.db.insert("scenarios", args)
  },
})

/** Delete a scenario */
export const deleteScenario = mutation({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.scenarioId)
  },
})

/** Update an existing scenario */
export const updateScenario = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    ...scenarioFieldsValidator,
  },
  handler: async (ctx, args) => {
    const { scenarioId, ...fields } = args
    await ctx.db.patch(scenarioId, fields)
  },
})

// ─── Sessions ────────────────────────────────────────────────────

/** Create a new competitive session */
export const createSession = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    // Generate a simple 4-character join code
    const joinCode = Math.random().toString(36).substring(2, 6).toUpperCase()

    return await ctx.db.insert("sessions", {
      scenarioId: args.scenarioId,
      hostId: identity.subject,
      name: args.name,
      joinCode,
      status: "active",
      createdAt: Date.now(),
    })
  },
})

/** Get a session by its join code */
export const getSessionByJoinCode = query({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .first()
  },
})

/** Get a session by ID */
export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId)
  },
})

/** Get session details + a real-time calculated leaderboard */
export const getSessionWithLeaderboard = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) return null

    const scenario = await ctx.db.get(session.scenarioId)

    const games = await ctx.db
      .query("games")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect()

    // For each game, find the latest step to get net worth and year
    const leaderboard = await Promise.all(
      games.map(async (game) => {
        const latestStep = await ctx.db
          .query("gameSteps")
          .withIndex("by_game_step", (q) => q.eq("gameId", game._id))
          .order("desc")
          .first()

        if (!latestStep) return null

        return {
          userId: game.userId,
          playerName: game.playerName ?? `Player ${game.userId.substring(0, 4)}`,
          gameId: game._id,
          currentStep: game.currentStep,
          date: latestStep.date,
          netWorth: portfolioValue(latestStep.portfolio, latestStep.market),
          status: game.status,
        }
      }),
    )

    return {
      session: {
        ...session,
        scenarioName: scenario?.name,
        scenarioIcon: scenario?.icon,
        playerCount: games.length,
      },
      leaderboard: leaderboard
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .sort((a, b) => b.netWorth - a.netWorth),
    }
  },
})

/** List all active sessions */
export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .collect()

    return await Promise.all(
      sessions.map(async (s) => {
        const scenario = await ctx.db.get(s.scenarioId)
        return {
          ...s,
          mode: scenario?.mode ?? "live",
        }
      }),
    )
  },
})

/** List all games in a specific session (for leaderboard) */
export const listSessionGames = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect()
  },
})

/** Get the authenticated user's game in a specific session */
export const getMyGameInSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    return await ctx.db
      .query("games")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first()
  },
})

/** Get leaderboard for a specific session at a specific step (year).
 *  Returns all players' scores at that step, sorted by score descending. */
export const getStepLeaderboard = query({
  args: {
    sessionId: v.id("sessions"),
    step: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) return null

    // Get all games in this session
    const games = await ctx.db
      .query("games")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect()

    // For each game, find the state at the requested step
    const entries = await Promise.all(
      games.map(async (game) => {
        const stepDoc = await ctx.db
          .query("gameSteps")
          .withIndex("by_game_step", (q) => q.eq("gameId", game._id).eq("step", args.step))
          .first()

        if (!stepDoc) return null

        const score = stepDoc.score ?? portfolioValue(stepDoc.portfolio, stepDoc.market)

        return {
          userId: game.userId,
          playerName: game.playerName ?? `Player ${game.userId.substring(0, 4)}`,
          gameId: game._id,
          step: stepDoc.step,
          date: stepDoc.date,
          score,
          goal: stepDoc.goal,
          goalReached: stepDoc.goalReached,
          status: game.status,
        }
      }),
    )

    const leaderboard = entries
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => b.score - a.score)

    // Compute scenario info for context
    const scenario = await ctx.db.get(session.scenarioId)

    return {
      session,
      scenarioName: scenario?.name ?? "Unknown",
      step: args.step,
      leaderboard,
    }
  },
})

// ─── Mutations ───────────────────────────────────────────────────

/** Start a new game from a scenario or session */
export const startGame = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    sessionId: v.optional(v.id("sessions")),
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    // If session is provided, ensure playerName is unique within that session
    if (args.sessionId) {
      const existing = await ctx.db
        .query("games")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect()

      const takenByOthers = existing.some(
        (g) =>
          g.playerName?.toLowerCase() === args.playerName.toLowerCase() &&
          g.userId !== identity.subject,
      )

      if (takenByOthers) {
        throw new Error(`The name "${args.playerName}" is already taken by another player.`)
      }
    }

    const scenarioDoc = await ctx.db.get(args.scenarioId)
    if (!scenarioDoc) throw new Error("Scenario not found")

    // Map Convex document → Scenario type
    const { _id, _creationTime, ...rest } = scenarioDoc
    const scenario: Scenario = { id: _id, mode: rest.mode ?? "live", ...rest }

    const initialState = initializeGame(scenario)

    // Create game record
    const gameId = await ctx.db.insert("games", {
      scenarioId: args.scenarioId,
      sessionId: args.sessionId,
      userId: identity.subject,
      playerName: args.playerName,
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
      goal: initialState.goal,
      goalReached: initialState.goalReached,
      score: portfolioValue(initialState.portfolio, initialState.market),
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
    const scenario: Scenario = { id: _id, mode: rest.mode ?? "live", ...rest }

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
      goal: latestStep.goal,
      goalReached: latestStep.goalReached,
    }

    // Cast validated actions to the PlayerAction type
    const actions = args.actions as PlayerAction[]

    // Run engine step
    const newState = await gameStep(scenario, prevState, actions)

    // Check if game is over
    const gameOver = isGameOver(scenario, newState)

    // Compute score
    const score = portfolioValue(newState.portfolio, newState.market)

    // Persist new state vector
    await ctx.db.insert("gameSteps", {
      gameId: args.gameId,
      step: newState.step,
      date: newState.date,
      portfolio: newState.portfolio,
      market: newState.market,
      events: newState.events,
      actions: newState.actions,
      goal: newState.goal,
      goalReached: newState.goalReached,
      score,
    })

    // Update game record
    await ctx.db.patch(args.gameId, {
      currentStep: newState.step,
      status: gameOver ? "finished" : "active",
    })

    return {
      state: newState,
      gameOver,
      portfolioValue: score,
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
