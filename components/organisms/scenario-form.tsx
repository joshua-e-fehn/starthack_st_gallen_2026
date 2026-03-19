"use client"

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Zap,
} from "lucide-react"
import Image from "next/image"
import { useMemo, useRef, useState } from "react"
import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
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
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showTrajectories, setShowTrajectories] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    icon: initialData?.icon ?? SCENARIO_ICONS[0],
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, icon: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const isCustomIcon = !SCENARIO_ICONS.includes(formData.icon)

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
            className={`size-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {step > 1 ? <Check className="size-4" /> : "1"}
          </div>
          <div className={`h-px w-8 ${step > 1 ? "bg-primary" : "bg-muted"}`} />
          <div
            className={`size-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
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
              className={`group relative flex flex-col items-start p-6 text-left border-2 rounded-xl transition-all hover:border-primary/50 hover:bg-primary/5 ${formData.mode === "live" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="size-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Live Computed</h3>
              <p className="text-sm text-muted-foreground">
                Prices are generated in real-time based on volatility and random events. Every game
                is unique.
              </p>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="size-5" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, mode: "precomputed" }))
                setStep(2)
              }}
              className={`group relative flex flex-col items-start p-6 text-left border-2 rounded-xl transition-all hover:border-primary/50 hover:bg-primary/5 ${formData.mode === "precomputed" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Database className="size-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Precomputed</h3>
              <p className="text-sm text-muted-foreground">
                Uses a fixed set of price trajectories. Ideal for balanced competitions where
                everyone sees the same market.
              </p>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="size-5" />
              </div>
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {description} Mode: {formData.mode}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Scenario Icon</Label>
              <ScrollArea className="w-full whitespace-nowrap rounded-xl border bg-muted/30 p-2">
                <div className="flex w-max space-x-2">
                  {SCENARIO_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                      className={cn(
                        "relative size-16 overflow-hidden rounded-md transition-all hover:scale-105",
                        formData.icon === icon
                          ? "ring-2 ring-primary"
                          : "opacity-60 hover:opacity-100",
                      )}
                    >
                      <Image
                        src={icon}
                        alt="Scenario Icon"
                        fill
                        className="object-contain p-1"
                        unoptimized
                      />
                      {formData.icon === icon && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <Check className="size-4 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}

                  {isCustomIcon && (
                    <div className="relative size-16 overflow-hidden rounded-md bg-muted/30 ring-2 ring-primary">
                      <Image
                        src={formData.icon}
                        alt="Custom Icon"
                        fill
                        className="object-contain p-1"
                        unoptimized
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                        <Check className="size-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex size-16 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-all hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Plus className="size-4 text-muted-foreground" />
                    <span className="text-[10px] font-medium text-muted-foreground">Custom</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="The Golden Age"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="A time of unprecedented prosperity and trade..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {formData.mode === "precomputed" && (
              <div className="space-y-4 rounded-lg border p-4 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Market Trajectories</h4>
                    <p className="text-xs text-muted-foreground">
                      Generate the price courses for this scenario
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateTrajectories}
                    >
                      <RefreshCw
                        className={cn(
                          "mr-2 size-4",
                          formData.precomputedTrajectories.length === 0 && "animate-pulse",
                        )}
                      />
                      {formData.precomputedTrajectories.length > 0 ? "Re-generate" : "Generate"}
                    </Button>
                    {formData.precomputedTrajectories.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowTrajectories(!showTrajectories)}
                        title={showTrajectories ? "Hide Spoilers" : "Show Price Courses"}
                      >
                        {showTrajectories ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {showTrajectories && formData.precomputedTrajectories.length > 0 && (
                  <div className="h-[250px] w-full mt-4 bg-background rounded-md p-2 border overflow-hidden">
                    <ChartContainer
                      config={{
                        wood: { label: "Wood", color: "#78350f" },
                        potatoes: { label: "Potatoes", color: "#facc15" },
                        fish: { label: "Fish", color: "#60a5fa" },
                      }}
                      className="aspect-auto h-full w-full"
                    >
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}T`}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />

                        {regimeAreas.map((area) => (
                          <ReferenceArea
                            key={area.id}
                            x1={area.x1}
                            x2={area.x2}
                            fill={
                              area.regime === "peace"
                                ? "rgba(34, 197, 94, 0.1)"
                                : "rgba(239, 68, 68, 0.1)"
                            }
                            stroke="none"
                          />
                        ))}

                        <Line
                          type="monotone"
                          dataKey="wood"
                          stroke="var(--color-wood)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="potatoes"
                          stroke="var(--color-potatoes)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="fish"
                          stroke="var(--color-fish)"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ChartContainer>
                  </div>
                )}
              </div>
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

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <span className="text-sm font-semibold">Advanced Economic Settings</span>
                <span className="text-xs text-muted-foreground">
                  {showAdvanced ? "Hide" : "Show"}
                </span>
              </Button>

              {showAdvanced && (
                <div className="mt-4 space-y-6 rounded-lg border bg-muted/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button variant="ghost" onClick={() => setStep(1)} disabled={initialData !== undefined}>
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              className="px-8"
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
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
