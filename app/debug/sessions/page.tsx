"use client"

import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/convex/_generated/api"
import { DEBUG_SCENARIO } from "@/lib/game/debug-scenario"

export default function SessionsDebugPage() {
  const router = useRouter()
  const scenarios = useQuery(api.game.listScenarios)
  const createScenario = useMutation(api.game.createScenario)
  const createSession = useMutation(api.game.createSession)

  const [sessionName, setSessionName] = useState("")
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("")
  const [joinCode, setJoinCode] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [isMounted, setIsMounted] = useState(false)

  // Load name from localStorage on mount
  useEffect(() => {
    setIsMounted(true)
    const saved = localStorage.getItem("debug_playerName")
    if (saved) setPlayerName(saved)
  }, [])

  // Save name to localStorage when it changes
  const handleNameChange = (val: string) => {
    setPlayerName(val)
    if (typeof window !== "undefined") {
      localStorage.setItem("debug_playerName", val)
    }
  }

  const handleSeedDefault = async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...fields } = DEBUG_SCENARIO
    try {
      // biome-ignore lint/suspicious/noExplicitAny: debug-only
      await createScenario(fields as any)
      alert("Default scenario seeded!")
    } catch (_e) {
      alert("Error seeding scenario.")
    }
  }

  const handleCreateSession = async () => {
    if (!selectedScenarioId || !sessionName) return
    try {
      const sessionId = await createSession({
        // biome-ignore lint/suspicious/noExplicitAny: debug-only
        scenarioId: selectedScenarioId as any,
        name: sessionName,
      })
      alert(`Session created! ID: ${sessionId}`)
      setSessionName("")
    } catch (_e) {
      alert("Error creating session. Are you logged in?")
    }
  }

  // Simplified "Search" by join code
  const getSessionByCode = useQuery(api.game.getSessionByJoinCode, { joinCode })

  // biome-ignore lint/suspicious/noExplicitAny: debug-only
  const handleJoinSession = async (session: any) => {
    if (!playerName.trim()) {
      alert("Please enter your name first!")
      return
    }
    router.push(`/debug/sessions/${session._id}?name=${encodeURIComponent(playerName.trim())}`)
  }

  const activeSessions = useQuery(api.game.listSessions)

  if (!isMounted) return null // Prevent hydration flash

  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Multiplayer Sessions (Debug)</h1>
          <p className="text-muted-foreground">Create or join a competitive session.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/debug/scenarios/create")}>
            + Create New Scenario
          </Button>
          <div className="flex items-end gap-3 rounded-lg border bg-muted/50 p-4">
            <div className="space-y-1">
              <Label htmlFor="globalPlayerName">Your Player Name</Label>
              <Input
                id="globalPlayerName"
                placeholder="e.g. Alice"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-48 bg-background"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Create Session */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Session</CardTitle>
            <CardDescription>Start a new competition with a specific scenario.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Session Name</Label>
              <Input
                placeholder="Friday Night Market"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Scenario</Label>
              <div className="flex gap-2">
                <Select onValueChange={setSelectedScenarioId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios?.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSeedDefault}
                  title="Seed Default Scenario"
                >
                  🌱
                </Button>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleCreateSession}
              disabled={!selectedScenarioId || !sessionName}
            >
              Create Session
            </Button>
          </CardContent>
        </Card>

        {/* Join Session */}
        <Card>
          <CardHeader>
            <CardTitle>Join Session</CardTitle>
            <CardDescription>Enter a 4-character join code to enter a competition.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Join Code</Label>
              <Input
                placeholder="E.g. AX92"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                className="font-mono text-lg uppercase"
              />
            </div>

            {getSessionByCode && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{getSessionByCode.name}</h3>
                  <Badge>{getSessionByCode.joinCode}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Status: {getSessionByCode.status}</p>
                <Button className="w-full" onClick={() => handleJoinSession(getSessionByCode)}>
                  Join Now
                </Button>
              </div>
            )}

            {joinCode.length === 4 && !getSessionByCode && (
              <p className="text-sm text-destructive">No session found with that code.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Open Sessions</CardTitle>
          <CardDescription>All currently active multiplayer competitions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2 text-sm font-medium text-muted-foreground">
              <span>Session Name</span>
              <span>Code</span>
              <span>Mode</span>
              <span>Action</span>
            </div>
            {activeSessions?.map((s) => (
              <div
                key={s._id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex flex-col">
                  <span className="font-bold">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(s.createdAt).toLocaleString()}
                  </span>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {s.joinCode}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {s.mode ?? "live"}
                </Badge>
                <Button size="sm" onClick={() => handleJoinSession(s)}>
                  Join
                </Button>
              </div>
            ))}
            {activeSessions?.length === 0 && (
              <p className="text-center py-4 text-muted-foreground">No open sessions found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
