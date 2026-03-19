"use client"

import { useMutation, useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { ScenarioForm } from "@/components/organisms/scenario-form"
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
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (scenario === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-bold">Scenario not found</h1>
        <p className="text-muted-foreground mt-2">
          The scenario you are trying to edit does not exist.
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard?focus=scenarios")}
          className="mt-4 text-primary hover:underline"
        >
          Back to Scenarios
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
      <ScenarioForm
        initialData={scenario}
        onSubmit={handleUpdate}
        isSubmitting={isUpdating}
        title={`Edit ${scenario.name}`}
        description="Update the parameters for this world."
        submitLabel="Save Changes"
      />
    </div>
  )
}
