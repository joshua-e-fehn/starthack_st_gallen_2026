"use client"

import { useMutation, useQuery } from "convex/react"
import { LayoutGrid, Loader2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"

export default function CreateSessionPage() {
  const router = useRouter()
  const scenarios = useQuery(api.game.listScenarios)
  const createSession = useMutation(api.game.createSession)

  const [sessionName, setSessionName] = useState("")
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateSession = async () => {
    if (!selectedScenarioId || !sessionName) return

    setIsCreating(true)
    try {
      const sessionId = await createSession({
        // biome-ignore lint/suspicious/noExplicitAny: convex id type
        scenarioId: selectedScenarioId as any,
        name: sessionName,
      })

      // Navigate to admin lobby with QR code + join code
      router.push(`/dashboard/sessions/${sessionId}`)
    } catch (error) {
      console.error("Error creating session:", error)
      alert("Failed to create session. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Game</CardTitle>
          <CardDescription>Start a new session and invite others to compete.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-2">
            <Label htmlFor="session-name">Game Name</Label>
            <Input
              id="session-name"
              placeholder="e.g. The Great Harvest"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              disabled={isCreating}
              className="text-lg h-12"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Select Scenario</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] uppercase tracking-wider text-muted-foreground"
                  onClick={() => router.push("/dashboard/scenarios")}
                >
                  Manage
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">Scroll to see more</span>
            </div>

            {!scenarios ? (
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : scenarios.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed text-center p-4">
                <p className="text-sm text-muted-foreground">No scenarios available.</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => router.push("/dashboard/scenarios/create")}
                >
                  Create your first scenario
                </Button>
              </div>
            ) : (
              <ScrollArea className="w-full whitespace-nowrap rounded-xl border bg-muted/30 p-4">
                <div className="flex w-max space-x-4">
                  {scenarios.map((scenario) => (
                    <button
                      key={scenario._id}
                      type="button"
                      onClick={() => setSelectedScenarioId(scenario._id)}
                      className={cn(
                        "group relative flex flex-col items-center space-y-2 rounded-lg p-2 transition-all hover:bg-background/50",
                        selectedScenarioId === scenario._id
                          ? "ring-2 ring-primary bg-background shadow-md"
                          : "opacity-70 hover:opacity-100",
                      )}
                    >
                      <div className="relative size-24 overflow-hidden rounded-md bg-muted shadow-sm">
                        {scenario.icon ? (
                          <Image
                            src={scenario.icon}
                            alt={scenario.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <LayoutGrid className="h-8 w-8 text-muted-foreground/20" />
                          </div>
                        )}
                        {selectedScenarioId === scenario._id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                            <div className="rounded-full bg-primary p-1 text-primary-foreground">
                              <Loader2 className="size-4 opacity-0" /> {/* Spacer */}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="max-w-[100px] truncate text-xs font-medium">
                        {scenario.name}
                      </span>
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t">
            <Button
              className="w-full h-12 text-lg"
              onClick={handleCreateSession}
              disabled={!selectedScenarioId || !sessionName || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Launch Session"
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.back()}
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
