"use client"

import { useMutation, useQuery } from "convex/react"
import { ArrowRight, LayoutGrid, PlusCircle, Trash2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/convex/_generated/api"

export interface ScenarioViewerProps {
  variant?: "compact" | "full"
  onSelectScenario?: (scenarioId: string) => void
  editable?: boolean
}

export function ScenarioViewer({
  variant = "full",
  onSelectScenario,
  editable = false,
}: ScenarioViewerProps) {
  const router = useRouter()
  const scenarios = useQuery(api.game.listScenarios)
  const deleteScenario = useMutation(api.game.deleteScenario)

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this scenario?")) {
      // biome-ignore lint/suspicious/noExplicitAny: convex id type
      await deleteScenario({ scenarioId: id as any })
    }
  }

  if (!scenarios) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-muted-foreground">Loading scenarios...</p>
        </CardContent>
      </Card>
    )
  }

  if (scenarios.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center p-8 text-center md:col-span-1 lg:col-span-2">
          <div className="rounded-full bg-muted p-4 mb-4">
            <LayoutGrid className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>No scenarios found</CardTitle>
          <CardDescription className="max-w-xs mt-2">
            Create your first scenario to start building trading worlds.
          </CardDescription>
        </Card>

        {/* Create New Card */}
        <Card
          className="overflow-hidden flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
          onClick={() => router.push("/dashboard/scenarios/create")}
        >
          <div className="rounded-full bg-muted p-4 group-hover:bg-primary/10 transition-colors">
            <PlusCircle className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">Create New Scenario</p>
            <p className="text-xs text-muted-foreground">Add another game template</p>
          </div>
        </Card>
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <div className="space-y-3">
        {scenarios.slice(0, 3).map((scenario) => (
          <div
            key={scenario._id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              {scenario.icon && (
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={scenario.icon}
                    alt={scenario.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{scenario.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{scenario.mode} mode</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 shrink-0"
              onClick={() => router.push(`/dashboard/scenarios/edit/${scenario._id}`)}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    )
  }

  // Full grid view
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {scenarios.map((scenario) => (
        <Card
          key={scenario._id}
          className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow cursor-pointer group"
          onClick={() => onSelectScenario?.(scenario._id)}
        >
          {/* Scenario Image Header */}
          <div className="relative h-32 bg-muted overflow-hidden border-b flex items-center justify-center">
            {scenario.icon ? (
              <Image
                src={scenario.icon}
                alt={scenario.name}
                fill
                className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/10 to-primary/5">
                <LayoutGrid className="h-12 w-12 text-muted-foreground/20" />
              </div>
            )}
          </div>

          <CardHeader className="pb-3 pt-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1 min-w-0">
                <CardTitle className="text-base line-clamp-2">{scenario.name}</CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {scenario.description || "No description"}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[9px] h-5 px-1.5 uppercase">
                {scenario.mode}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="grow pb-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg p-2 bg-muted/50">
                <p className="text-muted-foreground">Duration</p>
                <p className="font-semibold">{scenario.endYear - scenario.startYear} years</p>
              </div>
              <div className="rounded-lg p-2 bg-muted/50">
                <p className="text-muted-foreground">Start Capital</p>
                <p className="font-semibold">{scenario.startCapital.toLocaleString()} T</p>
              </div>
            </div>
          </CardContent>

          <div className="flex gap-2 border-t p-3">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/dashboard/scenarios/edit/${scenario._id}`)
              }}
            >
              <ArrowRight className="mr-2 h-3.5 w-3.5" />
              Edit
            </Button>
            {editable && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(scenario._id)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      ))}

      {/* Create New Card */}
      <Card
        className="overflow-hidden flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
        onClick={() => router.push("/dashboard/scenarios/create")}
      >
        <div className="rounded-full bg-muted p-4 group-hover:bg-primary/10 transition-colors">
          <PlusCircle className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm">Create New Scenario</p>
          <p className="text-xs text-muted-foreground">Add another game template</p>
        </div>
      </Card>
    </div>
  )
}
