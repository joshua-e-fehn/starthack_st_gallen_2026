"use client"

import { useMutation, useQuery } from "convex/react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeftIcon,
  ArrowRight,
  CheckCircle2Icon,
  GlobeIcon,
  LayoutGrid,
  Loader2,
  PlusCircle,
  RocketIcon,
  Trash2,
  UserIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { PublicHeader } from "@/components/organisms/public-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"

/* ─── Animation presets ─────────────────────────────────────── */
const ease = [0.25, 0.1, 0.25, 1] as const

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease },
})

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const childFade = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
}

type ScenarioTab = "mine" | "global"

export default function CreateCompetitionPage() {
  const router = useRouter()
  const myScenarios = useQuery(api.game.listMyScenarios)
  const globalScenarios = useQuery(api.game.listGlobalScenarios)
  const createSession = useMutation(api.game.createSession)
  const deleteScenario = useMutation(api.game.deleteScenario)

  const [competitionName, setCompetitionName] = useState("")
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<ScenarioTab>("mine")

  const allScenarios = activeTab === "mine" ? myScenarios : globalScenarios
  const selectedScenario =
    myScenarios?.find((s) => s._id === selectedScenarioId) ??
    globalScenarios?.find((s) => s._id === selectedScenarioId)

  const handleCreate = async () => {
    if (!selectedScenarioId || !competitionName.trim()) return

    setIsCreating(true)
    try {
      const sessionId = await createSession({
        // biome-ignore lint/suspicious/noExplicitAny: convex id type
        scenarioId: selectedScenarioId as any,
        name: competitionName.trim(),
      })
      router.push(`/dashboard/competitions/${sessionId}`)
    } catch (error) {
      console.error("Error creating competition:", error)
      alert("Failed to create competition. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this scenario?")) {
      // biome-ignore lint/suspicious/noExplicitAny: convex id type
      await deleteScenario({ scenarioId: id as any })
      if (selectedScenarioId === id) setSelectedScenarioId("")
    }
  }

  const isOwn = activeTab === "mine"

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        {/* Back + Page Header */}
        <motion.div {...fadeUp()} className="mb-8">
          <Button variant="ghost" size="sm" className="-ml-2 mb-3 w-fit" asChild>
            <Link href="/dashboard">
              <ArrowLeftIcon className="mr-1 size-4" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Create Competition</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Name your competition and pick a scenario template to get started.
          </p>
        </motion.div>

        <div className="space-y-10">
          {/* ─── Step 1: Competition Name ───────────────── */}
          <motion.section {...fadeUp(0.05)}>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </span>
              <h2 className="text-lg font-bold tracking-tight">Competition Name</h2>
            </div>
            <div className="max-w-xl">
              <Input
                placeholder="e.g. The Great Harvest"
                value={competitionName}
                onChange={(e) => setCompetitionName(e.target.value)}
                disabled={isCreating}
                className="h-12 text-lg"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                This is visible to all players who join.
              </p>
            </div>
          </motion.section>

          {/* ─── Step 2: Select Scenario ────────────────── */}
          <motion.section {...fadeUp(0.1)}>
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                  selectedScenarioId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                2
              </span>
              <h2 className="text-lg font-bold tracking-tight">Choose a Scenario</h2>
              {selectedScenario && (
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-600 dark:text-green-400">
                  <CheckCircle2Icon className="size-3.5" />
                  {selectedScenario.name}
                </span>
              )}
            </div>

            {/* Tab switch */}
            <div className="mb-5 inline-flex rounded-lg border bg-muted/40 p-1">
              {(
                [
                  { key: "mine", label: "My Scenarios", icon: UserIcon },
                  { key: "global", label: "Global", icon: GlobeIcon },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
                    activeTab === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                  {key === "mine" && myScenarios && (
                    <span className="ml-0.5 rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                      {myScenarios.length}
                    </span>
                  )}
                  {key === "global" && globalScenarios && (
                    <span className="ml-0.5 rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                      {globalScenarios.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Scenario grid */}
            <AnimatePresence mode="wait">
              {!allScenarios ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-40 items-center justify-center rounded-2xl border border-dashed"
                >
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </motion.div>
              ) : allScenarios.length === 0 ? (
                <motion.div
                  key={`empty-${activeTab}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/20 p-10 text-center"
                >
                  <LayoutGrid className="size-10 text-muted-foreground/25 mb-3" />
                  <p className="font-semibold text-sm">
                    {isOwn ? "No scenarios yet" : "No global scenarios available"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    {isOwn
                      ? "Create your first scenario template to start hosting competitions."
                      : "Global scenarios will appear here when others share them."}
                  </p>
                  {isOwn && (
                    <Button size="sm" className="mt-4" asChild>
                      <Link href="/dashboard/scenarios/create">
                        <PlusCircle className="mr-1.5 size-4" />
                        Create Scenario
                      </Link>
                    </Button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key={`grid-${activeTab}`}
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0 }}
                  className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {allScenarios.map((scenario) => (
                    <motion.div key={scenario._id} variants={childFade}>
                      {/* biome-ignore lint/a11y/useSemanticElements: card wraps nested buttons */}
                      <div
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "group relative overflow-hidden rounded-2xl border bg-card text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer",
                          selectedScenarioId === scenario._id
                            ? "ring-2 ring-primary border-primary/40 shadow-lg"
                            : "hover:border-primary/30",
                        )}
                        onClick={() => setSelectedScenarioId(scenario._id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setSelectedScenarioId(scenario._id)
                          }
                        }}
                      >
                        {/* Selected check */}
                        {selectedScenarioId === scenario._id && (
                          <div className="absolute top-2.5 left-2.5 z-10">
                            <span className="flex size-6 items-center justify-center rounded-full bg-primary shadow-md">
                              <CheckCircle2Icon className="size-4 text-primary-foreground" />
                            </span>
                          </div>
                        )}

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
                          <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent" />

                          {/* Mode pill */}
                          <div className="absolute top-2.5 right-2.5">
                            <span className="inline-flex items-center rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-md">
                              {scenario.mode}
                            </span>
                          </div>

                          {/* Name overlay */}
                          <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
                            <h3 className="text-lg font-bold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] line-clamp-1">
                              {scenario.name}
                            </h3>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="px-4 py-3 space-y-2.5">
                          <p className="text-[13px] text-muted-foreground line-clamp-2">
                            {scenario.description || "No description"}
                          </p>

                          {/* Stats */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5">
                              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                Duration
                              </span>
                              <span className="text-xs font-bold">
                                {scenario.endYear - scenario.startYear}y
                              </span>
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

                          {/* Actions — only show edit/delete for own scenarios */}
                          {isOwn && (
                            <div className="flex gap-2 pt-0.5">
                              <Button
                                variant="outline"
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
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Create New Scenario card — only in "mine" tab */}
                  {isOwn && (
                    <motion.div variants={childFade}>
                      <Link href="/dashboard/scenarios/create" className="block group h-full">
                        <div className="flex h-full min-h-36 sm:min-h-70 flex-col items-center justify-center gap-2 sm:gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/15 bg-muted/10 p-4 sm:p-6 text-center transition-all hover:border-primary/30 hover:bg-primary/5 group-hover:scale-[1.01]">
                          <div className="rounded-full bg-muted p-3 sm:p-4 group-hover:bg-primary/10 transition-colors">
                            <PlusCircle className="size-6 sm:size-7 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                              Create New Scenario
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-0.5 hidden sm:block">
                              Add another game template
                            </p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* ─── Step 3: Launch ─────────────────────────── */}
          <motion.section {...fadeUp(0.15)}>
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                  selectedScenarioId && competitionName.trim()
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                3
              </span>
              <h2 className="text-lg font-bold tracking-tight">Launch</h2>
            </div>

            <div className="max-w-xl space-y-4">
              {/* Summary */}
              {(competitionName.trim() || selectedScenario) && (
                <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-1.5">
                  {competitionName.trim() && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground shrink-0">Name:</span>
                      <span className="font-semibold truncate">{competitionName.trim()}</span>
                    </div>
                  )}
                  {selectedScenario && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground shrink-0">Scenario:</span>
                      <span className="font-semibold truncate">{selectedScenario.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {selectedScenario.endYear - selectedScenario.startYear}y &middot;{" "}
                        {selectedScenario.startCapital.toLocaleString()} T
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="h-12 w-full text-base font-semibold"
                onClick={handleCreate}
                disabled={!selectedScenarioId || !competitionName.trim() || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 size-5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <RocketIcon className="mr-2 size-5" />
                    Launch Competition
                  </>
                )}
              </Button>

              {(!competitionName.trim() || !selectedScenarioId) && (
                <p className="text-center text-xs text-muted-foreground">
                  {!competitionName.trim() && !selectedScenarioId
                    ? "Enter a name and select a scenario to continue"
                    : !competitionName.trim()
                      ? "Enter a competition name above"
                      : "Select a scenario template above"}
                </p>
              )}
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  )
}
