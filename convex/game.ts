import { v } from "convex/values"
import { gameStep, initializeGame, isGameOver, portfolioValue } from "../lib/game/engine"
import type { PlayerAction } from "../lib/types/actions"
import { sellPrice } from "../lib/types/market"
import type { Scenario } from "../lib/types/scenario"
import { mutation, query } from "./_generated/server"
import { playerActionValidator, scenarioFieldsValidator } from "./validators"

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Resolve the player identifier from either an authenticated identity
 * or a guest ID supplied by the client.
 *
 * Authenticated users → identity.subject
 * Guests             → "guest:<uuid>"
 */
function resolvePlayerId(identity: { subject: string } | null, guestId?: string): string {
  if (identity) return identity.subject
  if (guestId) return `guest:${guestId}`
  throw new Error("Must be authenticated or provide a guestId")
}

function computeAssetBreakdown(step: {
  portfolio: { gold: number; wood: number; potatoes: number; fish: number }
  market: {
    inflation: number
    prices: {
      wood: { basePrice: number; buyFactor: number; sellFactor: number }
      potatoes: { basePrice: number; buyFactor: number; sellFactor: number }
      fish: { basePrice: number; buyFactor: number; sellFactor: number }
    }
  }
}) {
  const inflation = step.market.inflation
  const gold = Math.max(0, step.portfolio.gold)
  const wood = Math.max(0, step.portfolio.wood * sellPrice(step.market.prices.wood, inflation))
  const potatoes = Math.max(
    0,
    step.portfolio.potatoes * sellPrice(step.market.prices.potatoes, inflation),
  )
  const fish = Math.max(0, step.portfolio.fish * sellPrice(step.market.prices.fish, inflation))
  const total = gold + wood + potatoes + fish

  return {
    gold,
    wood,
    potatoes,
    fish,
    total,
  }
}

// ─── Queries ─────────────────────────────────────────────────────

/** Get current user identity */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.auth.getUserIdentity()
  },
})

/** Get all games for the authenticated user or guest */
export const listMyGames = query({
  args: { guestId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity && !args.guestId) return []

    const playerId = resolvePlayerId(identity, args.guestId)

    return ctx.db
      .query("games")
      .withIndex("by_user", (q) => q.eq("userId", playerId))
      .collect()
  },
})

/** Get a single game by ID (auth or guest) */
export const getGame = query({
  args: { gameId: v.id("games"), guestId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) return null

    const identity = await ctx.auth.getUserIdentity()
    if (!identity && !args.guestId) return null

    const playerId = resolvePlayerId(identity, args.guestId)
    if (game.userId !== playerId) return null

    return game
  },
})

/** Get the full time series of state vectors for a game */
export const getGameTimeSeries = query({
  args: { gameId: v.id("games"), guestId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity && !args.guestId) return []

    const playerId = resolvePlayerId(identity, args.guestId)

    const game = await ctx.db.get(args.gameId)
    if (!game || game.userId !== playerId) return []

    return ctx.db
      .query("gameSteps")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect()
  },
})

/** Get the latest state vector for a game */
export const getLatestState = query({
  args: { gameId: v.id("games"), guestId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity && !args.guestId) return null

    const playerId = resolvePlayerId(identity, args.guestId)

    const game = await ctx.db.get(args.gameId)
    if (!game || game.userId !== playerId) return null

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
          assetBreakdown: computeAssetBreakdown(latestStep),
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

/** Get the current player's game in a specific session (auth or guest) */
export const getMyGameInSession = query({
  args: { sessionId: v.id("sessions"), guestId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity && !args.guestId) return null

    const playerId = resolvePlayerId(identity, args.guestId)

    return await ctx.db
      .query("games")
      .withIndex("by_user", (q) => q.eq("userId", playerId))
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

        const latestStep = await ctx.db
          .query("gameSteps")
          .withIndex("by_game_step", (q) => q.eq("gameId", game._id))
          .order("desc")
          .first()

        return {
          userId: game.userId,
          playerName: game.playerName ?? `Player ${game.userId.substring(0, 4)}`,
          gameId: game._id,
          step: stepDoc.step,
          date: stepDoc.date,
          latestDate: latestStep?.date,
          score,
          assetBreakdown: computeAssetBreakdown(stepDoc),
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

/** Get the full leaderboard history for a session — net worth per player per step.
 *  Used for the animated year-by-year leaderboard race on the results screen. */
export const getSessionLeaderboardHistory = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) return null

    const games = await ctx.db
      .query("games")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect()

    // Build { playerName, gameId, steps: [{ step, date, score, goalReached }] } per player
    const players = await Promise.all(
      games.map(async (game) => {
        const allSteps = await ctx.db
          .query("gameSteps")
          .withIndex("by_game", (q) => q.eq("gameId", game._id))
          .collect()

        return {
          playerName: game.playerName ?? `Player ${game.userId.substring(0, 4)}`,
          gameId: game._id as string,
          userId: game.userId,
          status: game.status,
          steps: allSteps.map((s) => ({
            step: s.step,
            date: s.date,
            score: s.score ?? portfolioValue(s.portfolio, s.market),
            assetBreakdown: computeAssetBreakdown(s),
            goalReached: s.goalReached,
          })),
        }
      }),
    )

    const scenario = await ctx.db.get(session.scenarioId)

    return {
      session,
      scenarioName: scenario?.name ?? "Unknown",
      players,
    }
  },
})

// ─── Mutations (continued) ───────────────────────────────────────

/** Start a new game from a scenario or session.
 *  Authenticated users use their identity; guests pass a guestId. */
export const startGame = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    sessionId: v.optional(v.id("sessions")),
    playerName: v.string(),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    // Creating a game outside a session requires authentication
    if (!args.sessionId && !identity) {
      throw new Error("Not authenticated")
    }
    // Inside a session, either auth or guestId is acceptable
    if (!identity && !args.guestId) {
      throw new Error("Must be authenticated or provide a guestId")
    }

    const playerId = resolvePlayerId(identity, args.guestId)

    // If session is provided, ensure playerName is unique within that session
    if (args.sessionId) {
      const existing = await ctx.db
        .query("games")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect()

      const takenByOthers = existing.some(
        (g) =>
          g.playerName?.toLowerCase() === args.playerName.toLowerCase() && g.userId !== playerId,
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
      userId: playerId,
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
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity && !args.guestId) throw new Error("Must be authenticated or provide a guestId")

    const playerId = resolvePlayerId(identity, args.guestId)

    // Load game
    const game = await ctx.db.get(args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.userId !== playerId) throw new Error("Not your game")
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
  args: { gameId: v.id("games"), guestId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity && !args.guestId) throw new Error("Must be authenticated or provide a guestId")

    const playerId = resolvePlayerId(identity, args.guestId)

    const game = await ctx.db.get(args.gameId)
    if (!game) throw new Error("Game not found")
    if (game.userId !== playerId) throw new Error("Not your game")

    await ctx.db.patch(args.gameId, { status: "abandoned" })
  },
})
