"use client"

import { useMutation, useQuery } from "convex/react"
import { ArrowRight, LayoutGrid, PlusCircle, Trash2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
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
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                  <Image
                    src={scenario.icon}
                    alt={scenario.name}
                    fill
                    className="object-contain p-1"
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {scenarios.map((scenario) => (
        // biome-ignore lint/a11y/useSemanticElements: card wraps nested buttons, can't be <button>
        <div
          key={scenario._id}
          role="button"
          tabIndex={0}
          className="group relative overflow-hidden rounded-2xl border bg-card text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 cursor-pointer"
          onClick={() => onSelectScenario?.(scenario._id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onSelectScenario?.(scenario._id)
            }
          }}
        >
          {/* Image banner */}
          <div className="relative h-36 w-full overflow-hidden bg-muted">
            {scenario.icon ? (
              <Image
                src={scenario.icon}
                alt={scenario.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/10 to-primary/5">
                <LayoutGrid className="size-10 text-primary/20" />
              </div>
            )}
            {/* Gradient scrim */}
            <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent" />

            {/* Mode pill — top right */}
            <div className="absolute top-2.5 right-2.5">
              <span className="inline-flex items-center rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-md">
                {scenario.mode}
              </span>
            </div>

            {/* Name overlay on image — bottom */}
            <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
              <h3 className="text-lg font-bold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] line-clamp-1">
                {scenario.name}
              </h3>
            </div>
          </div>

          {/* Content area */}
          <div className="px-4 py-3 space-y-2.5">
            <p className="text-[13px] text-muted-foreground line-clamp-2">
              {scenario.description || "No description"}
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Duration
                </span>
                <span className="text-xs font-bold">{scenario.endYear - scenario.startYear}y</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Capital
                </span>
                <span className="text-xs font-bold">
                  {scenario.startCapital.toLocaleString()} T
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-0.5">
              <Button
                variant="default"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/dashboard/scenarios/edit/${scenario._id}`)
                }}
              >
                <ArrowRight className="mr-1.5 size-3.5" />
                Edit
              </Button>
              {editable && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(scenario._id)
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Create New Card */}
      <button
        type="button"
        className="group flex min-h-70 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/15 bg-muted/10 p-6 text-center transition-all hover:border-primary/30 hover:bg-primary/5 hover:scale-[1.01]"
        onClick={() => router.push("/dashboard/scenarios/create")}
      >
        <div className="rounded-full bg-muted p-4 group-hover:bg-primary/10 transition-colors">
          <PlusCircle className="size-7 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
            Create New Scenario
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Add another game template</p>
        </div>
      </button>
    </div>
  )
}
