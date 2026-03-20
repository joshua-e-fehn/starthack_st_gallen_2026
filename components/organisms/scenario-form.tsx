"use client"

import {
  ArrowLeft,
  ArrowRight,
  ChartLineIcon,
  Check,
  ChevronDownIcon,
  Database,
  Loader2,
  RefreshCcw,
  RefreshCw,
  SlidersHorizontalIcon,
  Zap,
} from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DEBUG_SCENARIO } from "@/lib/game/debug-scenario"
import { generateTrajectories } from "@/lib/game/engine"
import type { PrecomputedStep, Scenario } from "@/lib/types/scenario"
import { cn } from "@/lib/utils"

const SCENARIO_ICONS = [
  "/farm.webp",
  "/onboarding/story1.webp",
  "/onboarding/story2.webp",
  "/onboarding/story3.webp",
  "/onboarding/story4.webp",
  "/onboarding/story5.webp",
  "/characters/fish_seller.webp",
  "/characters/potato_seller.webp",
  "/characters/wood_seller.webp",
]

interface ScenarioFormProps {
  initialData?: Partial<Scenario>
  onSubmit: (data: Omit<Scenario, "id">) => Promise<void>
  isSubmitting: boolean
  title: string
  description: string
  submitLabel: string
}

export function ScenarioForm({
  initialData,
  onSubmit,
  isSubmitting,
  title,
  description,
  submitLabel,
}: ScenarioFormProps) {
  const [step, setStep] = useState(initialData ? 2 : 1)

  const [formData, setFormData] = useState({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    icon: initialData?.icon ?? SCENARIO_ICONS[Math.floor(Math.random() * SCENARIO_ICONS.length)],
    mode: initialData?.mode ?? ("" as "live" | "precomputed" | ""),
    precomputedTrajectories: initialData?.precomputedTrajectories ?? ([] as PrecomputedStep[]),
    startCapital: initialData?.startCapital ?? DEBUG_SCENARIO.startCapital,
    recurringRevenue: initialData?.recurringRevenue ?? DEBUG_SCENARIO.recurringRevenue,
    startYear: initialData?.startYear ?? DEBUG_SCENARIO.startYear,
    endYear: initialData?.endYear ?? DEBUG_SCENARIO.endYear,
    goalAmount: initialData?.goalAmount ?? DEBUG_SCENARIO.goalAmount,
    buyFactor: initialData?.buyFactor ?? DEBUG_SCENARIO.buyFactor,
    sellFactor: initialData?.sellFactor ?? DEBUG_SCENARIO.sellFactor,

    // Advanced settings - Market
    inflationReturn: initialData?.inflationReturn ?? DEBUG_SCENARIO.inflationReturn,
    inflationVolatility: initialData?.inflationVolatility ?? DEBUG_SCENARIO.inflationVolatility,
    warToPeaceProbability:
      initialData?.market?.warToPeaceProbability ?? DEBUG_SCENARIO.market.warToPeaceProbability,
    peaceToWarProbability:
      initialData?.market?.peaceToWarProbability ?? DEBUG_SCENARIO.market.peaceToWarProbability,
    peaceReturn: initialData?.market?.peaceReturn ?? DEBUG_SCENARIO.market.peaceReturn,
    warReturn: initialData?.market?.warReturn ?? DEBUG_SCENARIO.market.warReturn,
    peaceVolatility: initialData?.market?.peaceVolatility ?? DEBUG_SCENARIO.market.peaceVolatility,
    warVolatility: initialData?.market?.warVolatility ?? DEBUG_SCENARIO.market.warVolatility,

    // Advanced settings - Assets
    woodStartPrice: initialData?.assets?.wood?.startPrice ?? DEBUG_SCENARIO.assets.wood.startPrice,
    woodReturn: initialData?.assets?.wood?.priceReturn ?? DEBUG_SCENARIO.assets.wood.priceReturn,
    woodVolatility:
      initialData?.assets?.wood?.priceVolatility ?? DEBUG_SCENARIO.assets.wood.priceVolatility,

    potatoStartPrice:
      initialData?.assets?.potatoes?.startPrice ?? DEBUG_SCENARIO.assets.potatoes.startPrice,
    potatoReturn:
      initialData?.assets?.potatoes?.priceReturn ?? DEBUG_SCENARIO.assets.potatoes.priceReturn,
    potatoVolatility:
      initialData?.assets?.potatoes?.priceVolatility ??
      DEBUG_SCENARIO.assets.potatoes.priceVolatility,

    fishStartPrice: initialData?.assets?.fish?.startPrice ?? DEBUG_SCENARIO.assets.fish.startPrice,
    fishReturn: initialData?.assets?.fish?.priceReturn ?? DEBUG_SCENARIO.assets.fish.priceReturn,
    fishVolatility:
      initialData?.assets?.fish?.priceVolatility ?? DEBUG_SCENARIO.assets.fish.priceVolatility,
  })

  const rerollIcon = useCallback(() => {
    const otherIcons = SCENARIO_ICONS.filter((i) => i !== formData.icon)
    const next = otherIcons[Math.floor(Math.random() * otherIcons.length)]
    setFormData((prev) => ({ ...prev, icon: next }))
  }, [formData.icon])

  const handleGenerateTrajectories = async () => {
    // Create a temporary scenario object to pass to generateTrajectories
    const tempScenario: Scenario = {
      id: "temp",
      name: formData.name,
      description: formData.description,
      icon: formData.icon,
      mode: "precomputed",
      startCapital: formData.startCapital,
      recurringRevenue: formData.recurringRevenue,
      startYear: formData.startYear,
      endYear: formData.endYear,
      buyFactor: formData.buyFactor,
      sellFactor: formData.sellFactor,
      inflationReturn: formData.inflationReturn,
      inflationVolatility: formData.inflationVolatility,
      market: {
        warToPeaceProbability: formData.warToPeaceProbability,
        peaceToWarProbability: formData.peaceToWarProbability,
        peaceReturn: formData.peaceReturn,
        warReturn: formData.warReturn,
        peaceVolatility: formData.peaceVolatility,
        warVolatility: formData.warVolatility,
      },
      assets: {
        wood: {
          ...DEBUG_SCENARIO.assets.wood,
          startPrice: formData.woodStartPrice,
          priceReturn: formData.woodReturn,
          priceVolatility: formData.woodVolatility,
        },
        potatoes: {
          ...DEBUG_SCENARIO.assets.potatoes,
          startPrice: formData.potatoStartPrice,
          priceReturn: formData.potatoReturn,
          priceVolatility: formData.potatoVolatility,
        },
        fish: {
          ...DEBUG_SCENARIO.assets.fish,
          startPrice: formData.fishStartPrice,
          priceReturn: formData.fishReturn,
          priceVolatility: formData.fishVolatility,
        },
      },
      globalEvents: DEBUG_SCENARIO.globalEvents,
      goalAmount: formData.goalAmount,
    }

    const trajectories = await generateTrajectories(tempScenario)
    setFormData((prev) => ({ ...prev, precomputedTrajectories: trajectories }))
  }

  // Auto-generate trajectories when entering step 2 with precomputed mode
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only trigger on step/mode change
  useEffect(() => {
    if (
      step === 2 &&
      formData.mode === "precomputed" &&
      formData.precomputedTrajectories.length === 0
    ) {
      handleGenerateTrajectories()
    }
  }, [step, formData.mode])

  const chartData = useMemo(() => {
    if (!formData.precomputedTrajectories.length) return []

    return formData.precomputedTrajectories.map((step, index) => {
      const year = formData.startYear + index + 1
      return {
        year,
        wood: step.market.prices.wood.basePrice * step.market.inflation,
        potatoes: step.market.prices.potatoes.basePrice * step.market.inflation,
        fish: step.market.prices.fish.basePrice * step.market.inflation,
        regime: step.market.regime,
      }
    })
  }, [formData.precomputedTrajectories, formData.startYear])

  const regimeAreas = useMemo(() => {
    if (!chartData.length) return []
    const areas = []
    let currentRegime = chartData[0].regime
    let startYear = chartData[0].year

    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].regime !== currentRegime) {
        areas.push({
          id: `regime-${i}`,
          x1: startYear,
          x2: chartData[i].year,
          regime: currentRegime,
        })
        currentRegime = chartData[i].regime
        startYear = chartData[i].year
      }
    }
    // Add final block
    areas.push({
      id: "regime-final",
      x1: startYear,
      x2: chartData[chartData.length - 1].year,
      regime: currentRegime,
    })
    return areas
  }, [chartData])

  const handleSubmit = async () => {
    const formattedData = {
      name: formData.name,
      description: formData.description,
      icon: formData.icon,
      mode: formData.mode as "live" | "precomputed",
      precomputedTrajectories:
        formData.mode === "precomputed" ? formData.precomputedTrajectories : undefined,
      startCapital: formData.startCapital,
      recurringRevenue: formData.recurringRevenue,
      startYear: formData.startYear,
      endYear: formData.endYear,
      goalAmount: formData.goalAmount,
      buyFactor: formData.buyFactor,
      sellFactor: formData.sellFactor,
      inflationReturn: formData.inflationReturn,
      inflationVolatility: formData.inflationVolatility,
      market: {
        warToPeaceProbability: formData.warToPeaceProbability,
        peaceToWarProbability: formData.peaceToWarProbability,
        peaceReturn: formData.peaceReturn,
        warReturn: formData.warReturn,
        peaceVolatility: formData.peaceVolatility,
        warVolatility: formData.warVolatility,
      },
      assets: {
        wood: {
          ...DEBUG_SCENARIO.assets.wood,
          startPrice: formData.woodStartPrice,
          priceReturn: formData.woodReturn,
          priceVolatility: formData.woodVolatility,
        },
        potatoes: {
          ...DEBUG_SCENARIO.assets.potatoes,
          startPrice: formData.potatoStartPrice,
          priceReturn: formData.potatoReturn,
          priceVolatility: formData.potatoVolatility,
        },
        fish: {
          ...DEBUG_SCENARIO.assets.fish,
          startPrice: formData.fishStartPrice,
          priceReturn: formData.fishReturn,
          priceVolatility: formData.fishVolatility,
        },
      },
      globalEvents: initialData?.globalEvents ?? DEBUG_SCENARIO.globalEvents,
    }
    await onSubmit(formattedData)
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "size-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
              step >= 1
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground",
            )}
          >
            {step > 1 ? <Check className="size-4" /> : "1"}
          </div>
          <div
            className={cn(
              "h-0.5 w-10 rounded-full transition-colors",
              step > 1 ? "bg-primary" : "bg-muted",
            )}
          />
          <div
            className={cn(
              "size-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
              step >= 2
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground",
            )}
          >
            2
          </div>
        </div>
        <span className="text-sm font-medium text-muted-foreground">Step {step} of 2</span>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Choose Mode</h1>
            <p className="text-muted-foreground">
              How should the asset prices be calculated during the game?
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, mode: "live" }))
                setStep(2)
              }}
              className={cn(
                "group relative flex flex-col items-start p-6 text-left rounded-2xl border-2 transition-all hover:border-primary/50 hover:bg-primary/5",
                formData.mode === "live"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card",
              )}
            >
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="size-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Live Computed</h3>
              <p className="text-sm text-muted-foreground">
                Prices are generated in real-time based on volatility and random events. Every game
                is unique.
              </p>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="size-5 text-primary" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, mode: "precomputed" }))
                setStep(2)
              }}
              className={cn(
                "group relative flex flex-col items-start p-6 text-left rounded-2xl border-2 transition-all hover:border-primary/50 hover:bg-primary/5",
                formData.mode === "precomputed"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card",
              )}
            >
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Database className="size-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Precomputed</h3>
              <p className="text-sm text-muted-foreground">
                Uses a fixed set of price trajectories. Ideal for balanced competitions where
                everyone sees the same market.
              </p>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="size-5 text-primary" />
              </div>
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          {/* Hero banner with background image */}
          <div className="relative w-full overflow-hidden rounded-2xl bg-muted/30">
            {/* Background image */}
            <div className="relative h-48 w-full sm:h-56">
              <Image
                src={formData.icon}
                alt="Scenario Icon"
                fill
                className="object-contain"
                unoptimized
              />
              <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />

              {/* Action buttons — top right */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={rerollIcon}
                  className="size-9 rounded-full bg-background/80 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-background"
                  title="Re-roll image"
                >
                  <RefreshCcw className="size-4 text-foreground" />
                </Button>
              </div>
            </div>

            {/* Text overlay at bottom */}
            <div className="px-5 pb-5 -mt-10 relative z-10">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-md">{description}</p>
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                {formData.mode === "live" ? (
                  <>
                    <Zap className="size-3" /> Live Computed
                  </>
                ) : (
                  <>
                    <Database className="size-3" /> Precomputed
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Scenario Name</Label>
              <Input
                id="name"
                placeholder="The Golden Age"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {formData.mode === "precomputed" && (
              <Collapsible className="rounded-xl border bg-muted/30">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <ChartLineIcon className="size-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">Market Trajectories</h4>
                        <p className="text-xs text-muted-foreground">
                          {formData.precomputedTrajectories.length > 0
                            ? `${formData.precomputedTrajectories.length} years generated`
                            : "Generating price courses…"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground shadow-xs hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleGenerateTrajectories()
                        }}
                        title="Re-generate trajectories"
                      >
                        <RefreshCw className="size-3.5" />
                      </button>
                      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 in-data-[state=open]:rotate-180" />
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  {formData.precomputedTrajectories.length > 0 ? (
                    <div className="border-t px-4 pb-4 pt-3">
                      <ChartContainer
                        config={{
                          wood: { label: "Wood", color: "#78350f" },
                          potatoes: { label: "Potatoes", color: "#B8860B" },
                          fish: { label: "Fish", color: "#60a5fa" },
                        }}
                        className="h-64 w-full"
                      >
                        <LineChart
                          data={chartData}
                          margin={{ top: 8, right: 16, left: -6, bottom: 0 }}
                        >
                          <CartesianGrid vertical={false} />
                          <XAxis
                            dataKey="year"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(v) => `Y${v}`}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={52}
                            tickFormatter={(value) => `${value}T`}
                          />
                          <ChartTooltip
                            cursor={{ strokeDasharray: "5 5" }}
                            content={
                              <ChartTooltipContent
                                indicator="line"
                                labelFormatter={(_, payload) => {
                                  const year = payload?.[0]?.payload?.year
                                  return `Year ${typeof year === "number" ? year : "-"}`
                                }}
                                formatter={(value, name) => (
                                  <span className="font-mono tabular-nums">
                                    {name}: {Number(value).toFixed(1)}T
                                  </span>
                                )}
                              />
                            }
                          />

                          {regimeAreas.map((area) => (
                            <ReferenceArea
                              key={area.id}
                              x1={area.x1}
                              x2={area.x2}
                              fill={
                                area.regime === "peace"
                                  ? "rgba(34, 197, 94, 0.08)"
                                  : "rgba(239, 68, 68, 0.08)"
                              }
                              stroke="none"
                            />
                          ))}

                          <Line
                            type="monotone"
                            dataKey="wood"
                            name="Wood"
                            stroke="var(--color-wood)"
                            strokeWidth={2.5}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="potatoes"
                            name="Potatoes"
                            stroke="var(--color-potatoes)"
                            strokeWidth={2.5}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="fish"
                            name="Fish"
                            stroke="var(--color-fish)"
                            strokeWidth={2.5}
                            dot={false}
                          />
                        </LineChart>
                      </ChartContainer>
                    </div>
                  ) : (
                    <div className="border-t px-4 py-6 flex items-center justify-center">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startCapital">Start Capital</Label>
                <Input
                  id="startCapital"
                  type="number"
                  value={formData.startCapital}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, startCapital: parseInt(e.target.value, 10) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goalAmount">Goal Amount (Taler)</Label>
                <Input
                  id="goalAmount"
                  type="number"
                  value={formData.goalAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, goalAmount: parseInt(e.target.value, 10) }))
                  }
                />
              </div>
            </div>

            <Collapsible className="rounded-xl border bg-muted/30">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                      <SlidersHorizontalIcon className="size-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">Advanced Economic Settings</h4>
                      <p className="text-xs text-muted-foreground">
                        Fine-tune market dynamics, assets, and regime parameters
                      </p>
                    </div>
                  </div>
                  <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 in-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-6 border-t px-4 pb-4 pt-3">
                  {/* Time & Revenue */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Time & Basic Revenue
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="startYear" className="text-[10px]">
                          Start Year
                        </Label>
                        <Input
                          id="startYear"
                          type="number"
                          value={formData.startYear}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              startYear: parseInt(e.target.value, 10),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="endYear" className="text-[10px]">
                          End Year
                        </Label>
                        <Input
                          id="endYear"
                          type="number"
                          value={formData.endYear}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              endYear: parseInt(e.target.value, 10),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="recurringRevenue" className="text-[10px]">
                          Annual Income
                        </Label>
                        <Input
                          id="recurringRevenue"
                          type="number"
                          value={formData.recurringRevenue}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              recurringRevenue: parseInt(e.target.value, 10),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Trade Factors */}
                  <div className="space-y-4 pt-2 border-t">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Trade Margins
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="buyFactor" className="text-[10px]">
                          Buy Factor
                        </Label>
                        <Input
                          id="buyFactor"
                          type="number"
                          step="0.01"
                          value={formData.buyFactor}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              buyFactor: parseFloat(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sellFactor" className="text-[10px]">
                          Sell Factor
                        </Label>
                        <Input
                          id="sellFactor"
                          type="number"
                          step="0.01"
                          value={formData.sellFactor}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              sellFactor: parseFloat(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Inflation */}
                  <div className="space-y-4 pt-2 border-t">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Inflation
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="inflationReturn" className="text-[10px]">
                          Inflation Rate
                        </Label>
                        <Input
                          id="inflationReturn"
                          type="number"
                          step="0.001"
                          value={formData.inflationReturn}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              inflationReturn: parseFloat(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="inflationVolatility" className="text-[10px]">
                          Volatility
                        </Label>
                        <Input
                          id="inflationVolatility"
                          type="number"
                          step="0.001"
                          value={formData.inflationVolatility}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              inflationVolatility: parseFloat(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Market Regimes */}
                  <div className="space-y-4 pt-2 border-t">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Market Regime Returns & Volatility
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] text-primary">Peace Time</Label>
                        <div className="grid gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="peaceReturn" className="text-[9px]">
                              Return Rate
                            </Label>
                            <Input
                              id="peaceReturn"
                              type="number"
                              step="0.01"
                              value={formData.peaceReturn}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  peaceReturn: parseFloat(e.target.value),
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="peaceVolatility" className="text-[9px]">
                              Volatility
                            </Label>
                            <Input
                              id="peaceVolatility"
                              type="number"
                              step="0.01"
                              value={formData.peaceVolatility}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  peaceVolatility: parseFloat(e.target.value),
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-destructive">War Time</Label>
                        <div className="grid gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="warReturn" className="text-[9px]">
                              Return Rate
                            </Label>
                            <Input
                              id="warReturn"
                              type="number"
                              step="0.01"
                              value={formData.warReturn}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  warReturn: parseFloat(e.target.value),
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="warVolatility" className="text-[9px]">
                              Volatility
                            </Label>
                            <Input
                              id="warVolatility"
                              type="number"
                              step="0.01"
                              value={formData.warVolatility}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  warVolatility: parseFloat(e.target.value),
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transition Probabilities */}
                  <div className="space-y-4 pt-2 border-t">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Regime Transitions
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="warToPeaceProbability" className="text-[10px]">
                          War → Peace Prob.
                        </Label>
                        <Input
                          id="warToPeaceProbability"
                          type="number"
                          step="0.01"
                          value={formData.warToPeaceProbability}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              warToPeaceProbability: parseFloat(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="peaceToWarProbability" className="text-[10px]">
                          Peace → War Prob.
                        </Label>
                        <Input
                          id="peaceToWarProbability"
                          type="number"
                          step="0.01"
                          value={formData.peaceToWarProbability}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              peaceToWarProbability: parseFloat(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Asset Details */}
                  <div className="space-y-4 pt-2 border-t">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Individual Asset Dynamics
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Wood */}
                      <div className="space-y-2 border rounded p-2 bg-background/50">
                        <Label className="text-[10px] font-bold">Wood</Label>
                        <div className="space-y-1">
                          <Label htmlFor="woodStartPrice" className="text-[9px]">
                            Start Price
                          </Label>
                          <Input
                            id="woodStartPrice"
                            type="number"
                            value={formData.woodStartPrice}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                woodStartPrice: parseInt(e.target.value, 10),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="woodReturn" className="text-[9px]">
                            Return
                          </Label>
                          <Input
                            id="woodReturn"
                            type="number"
                            step="0.01"
                            value={formData.woodReturn}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                woodReturn: parseFloat(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="woodVolatility" className="text-[9px]">
                            Volatility
                          </Label>
                          <Input
                            id="woodVolatility"
                            type="number"
                            step="0.01"
                            value={formData.woodVolatility}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                woodVolatility: parseFloat(e.target.value),
                              }))
                            }
                          />
                        </div>
                      </div>
                      {/* Potatoes */}
                      <div className="space-y-2 border rounded p-2 bg-background/50">
                        <Label className="text-[10px] font-bold">Potatoes</Label>
                        <div className="space-y-1">
                          <Label htmlFor="potatoStartPrice" className="text-[9px]">
                            Start Price
                          </Label>
                          <Input
                            id="potatoStartPrice"
                            type="number"
                            value={formData.potatoStartPrice}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                potatoStartPrice: parseInt(e.target.value, 10),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="potatoReturn" className="text-[9px]">
                            Return
                          </Label>
                          <Input
                            id="potatoReturn"
                            type="number"
                            step="0.01"
                            value={formData.potatoReturn}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                potatoReturn: parseFloat(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="potatoVolatility" className="text-[9px]">
                            Volatility
                          </Label>
                          <Input
                            id="potatoVolatility"
                            type="number"
                            step="0.01"
                            value={formData.potatoVolatility}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                potatoVolatility: parseFloat(e.target.value),
                              }))
                            }
                          />
                        </div>
                      </div>
                      {/* Fish */}
                      <div className="space-y-2 border rounded p-2 bg-background/50">
                        <Label className="text-[10px] font-bold">Fish</Label>
                        <div className="space-y-1">
                          <Label htmlFor="fishStartPrice" className="text-[9px]">
                            Start Price
                          </Label>
                          <Input
                            id="fishStartPrice"
                            type="number"
                            value={formData.fishStartPrice}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                fishStartPrice: parseInt(e.target.value, 10),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="fishReturn" className="text-[9px]">
                            Return
                          </Label>
                          <Input
                            id="fishReturn"
                            type="number"
                            step="0.01"
                            value={formData.fishReturn}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                fishReturn: parseFloat(e.target.value),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="fishVolatility" className="text-[9px]">
                            Volatility
                          </Label>
                          <Input
                            id="fishVolatility"
                            type="number"
                            step="0.01"
                            value={formData.fishVolatility}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                fishVolatility: parseFloat(e.target.value),
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              disabled={initialData !== undefined}
            >
              <ArrowLeft className="mr-1.5 size-4" />
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              size="lg"
              className="px-8 shadow-md"
              disabled={
                !formData.name ||
                isSubmitting ||
                (formData.mode === "precomputed" && formData.precomputedTrajectories.length === 0)
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {submitLabel}...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
