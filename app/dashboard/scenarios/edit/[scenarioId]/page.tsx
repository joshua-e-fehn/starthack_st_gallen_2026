"use client"

import { useMutation, useQuery } from "convex/react"
import { ArrowLeftIcon, Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { PublicHeader } from "@/components/organisms/public-header"
import { ScenarioForm } from "@/components/organisms/scenario-form"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Scenario } from "@/lib/types/scenario"

export default function EditScenarioPage() {
  const params = useParams()
  const scenarioId = params.scenarioId as Id<"scenarios">
  const router = useRouter()

  const scenario = useQuery(api.game.getScenario, { scenarioId })
  const updateScenario = useMutation(api.game.updateScenario)

  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async (formattedData: Omit<Scenario, "id">) => {
    setIsUpdating(true)
    try {
      await updateScenario({
        scenarioId,
        ...formattedData,
      })
      router.push("/dashboard?focus=scenarios")
    } catch (error) {
      console.error("Error updating scenario:", error)
      alert("Failed to update scenario.")
    } finally {
      setIsUpdating(false)
    }
  }

  if (scenario === undefined) {
    return (
      <div className="min-h-dvh bg-background">
        <PublicHeader />
        <main className="mx-auto max-w-4xl px-4 pb-16 pt-4 sm:px-6">
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    )
  }

  if (scenario === null) {
    return (
      <div className="min-h-dvh bg-background">
        <PublicHeader />
        <main className="mx-auto max-w-4xl px-4 pb-16 pt-4 sm:px-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h1 className="text-2xl font-bold">Scenario not found</h1>
            <p className="text-muted-foreground mt-2">
              The scenario you are trying to edit does not exist.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/dashboard?focus=scenarios">Back to Scenarios</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-4 sm:px-6">
        <Button variant="ghost" size="sm" className="-ml-2 mb-6 w-fit" asChild>
          <Link href="/dashboard">
            <ArrowLeftIcon className="mr-1 size-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="flex flex-col items-center">
          <ScenarioForm
            initialData={scenario}
            onSubmit={handleUpdate}
            isSubmitting={isUpdating}
            title={`Edit ${scenario.name}`}
            description="Update the parameters for this world."
            submitLabel="Save Changes"
          />
        </div>
      </main>
    </div>
  )
}
