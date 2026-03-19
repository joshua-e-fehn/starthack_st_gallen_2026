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

export async function fetchLandingQuoteStream(
  topic: string,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const response = await fetch(`/api/quote/stream?topic=${encodeURIComponent(topic)}`)

  if (!response.ok || !response.body) {
    const errorText = await response.text()
    throw new Error(`Failed to stream quote: ${response.status} ${errorText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split("\n\n")
    buffer = events.pop() ?? ""

    for (const event of events) {
      const dataLine = event.split("\n").find((line) => line.startsWith("data: "))

      if (!dataLine) {
        continue
      }

      const payload = JSON.parse(dataLine.slice(6)) as {
        type?: "chunk" | "done" | "error"
        chunk?: string
        error?: string
      }

      if (payload.type === "chunk" && payload.chunk) {
        onChunk(payload.chunk)
      }

      if (payload.type === "error") {
        throw new Error(payload.error ?? "Unknown streaming error")
      }
    }
  }
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
