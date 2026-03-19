export type LeaderboardEntry = {
  rank: number
  playerName: string
  yearsPlayed: number
  netWorth: number
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

const leaderboardSeed: LeaderboardEntry[] = [
  { rank: 1, playerName: "Aldric", yearsPlayed: 12, netWorth: 28450 },
  { rank: 2, playerName: "Matilda", yearsPlayed: 10, netWorth: 24510 },
  { rank: 3, playerName: "Leofric", yearsPlayed: 11, netWorth: 22990 },
  { rank: 4, playerName: "Ysabeau", yearsPlayed: 9, netWorth: 20140 },
  { rank: 5, playerName: "Cedric", yearsPlayed: 8, netWorth: 18880 },
]

export async function fetchLandingQuote(topic: string): Promise<string> {
  const response = await fetch("/api/quote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ topic }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch quote: ${response.status} ${errorText}`)
  }

  const data = (await response.json()) as { quote?: string }

  if (!data.quote) {
    throw new Error("Quote response missing quote field")
  }

  return data.quote
}

export async function getLeaderboardMock(): Promise<LeaderboardEntry[]> {
  // Convex guidance:
  // Replace with useQuery(api.game.getLeaderboard, { limit: 10 }) in a hook.
  await sleep(350)
  return leaderboardSeed
}

export async function startGameMock(playerName: string): Promise<{ playerId: string }> {
  // Convex guidance:
  // Replace with useMutation(api.game.startSession) and persist to DB.
  await sleep(250)

  const safeName = playerName.trim().toLowerCase().replace(/\s+/g, "-")
  return { playerId: `player-${safeName || "new"}-${Date.now()}` }
}
