"use client"

import { useMutation } from "convex/react"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { PublicHeader } from "@/components/organisms/public-header"
import { ScenarioForm } from "@/components/organisms/scenario-form"
import { Button } from "@/components/ui/button"
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
            onSubmit={handleCreate}
            isSubmitting={isCreating}
            title="Create New Scenario"
            description="Configure the basic parameters for your new world."
            submitLabel="Create Scenario"
          />
        </div>
      </main>
    </div>
  )
}
