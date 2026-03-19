"use client"

import { useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ScenarioForm } from "@/components/organisms/scenario-form"
import { api } from "@/convex/_generated/api"
import type { Scenario } from "@/lib/types/scenario"

export default function CreateScenarioPage() {
  const router = useRouter()
  const createScenario = useMutation(api.game.createScenario)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async (formattedData: Omit<Scenario, "id">) => {
    setIsCreating(true)
    try {
      await createScenario(formattedData)
      router.push("/dashboard?focus=scenarios")
    } catch (error) {
      console.error("Error creating scenario:", error)
      alert("Failed to create scenario.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
      <ScenarioForm
        onSubmit={handleCreate}
        isSubmitting={isCreating}
        title="Create New Scenario"
        description="Configure the basic parameters for your new world."
        submitLabel="Create Scenario"
      />
    </div>
  )
}
