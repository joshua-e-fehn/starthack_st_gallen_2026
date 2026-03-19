"use client"

import { useMutation, useQuery } from "convex/react"
import { Info, LayoutGrid, PlusCircle, Trash2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { api } from "@/convex/_generated/api"

export default function ScenariosPage() {
  const router = useRouter()
  const scenarios = useQuery(api.game.listScenarios)
  const deleteScenario = useMutation(api.game.deleteScenario)

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this scenario?")) {
      // biome-ignore lint/suspicious/noExplicitAny: convex id type
      await deleteScenario({ scenarioId: id as any })
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-8 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scenario Configuration</h1>
          <p className="text-muted-foreground">Manage your game templates and world rules.</p>
        </div>
        <Button onClick={() => router.push("/dashboard/scenarios/create")}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Scenario
        </Button>
      </div>

      {!scenarios ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading scenarios...</p>
        </div>
      ) : scenarios.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <LayoutGrid className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>No scenarios yet</CardTitle>
          <CardDescription className="max-w-xs mt-2">
            Create your first scenario to start building your trading world.
          </CardDescription>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => router.push("/dashboard/scenarios/create")}
          >
            Create Scenario
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <Card key={scenario._id} className="overflow-hidden flex flex-col">
              <CardHeader className="flex flex-row items-start gap-4 pb-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted shadow-sm border">
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
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="truncate text-xl">{scenario.name}</CardTitle>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[10px] h-5 px-1.5 uppercase"
                    >
                      {scenario.mode ?? "live"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 text-xs leading-relaxed">
                    {scenario.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="flex flex-col border rounded-lg p-2 bg-muted/30">
                    <span className="text-muted-foreground mb-0.5">Start Capital</span>
                    <span className="font-bold">{scenario.startCapital} Taler</span>
                  </div>
                  <div className="flex flex-col border rounded-lg p-2 bg-muted/30">
                    <span className="text-muted-foreground mb-0.5">End Year</span>
                    <span className="font-bold">{scenario.endYear}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/5 flex justify-between gap-2 p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => router.push(`/dashboard/scenarios/edit/${scenario._id}`)}
                >
                  <Info className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(scenario._id)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
