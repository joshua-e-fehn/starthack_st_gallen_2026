"use client"

import { useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { CartesianGrid, ComposedChart, Legend, Line, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import { DEBUG_SCENARIO } from "@/lib/game/debug-scenario"
import { generateTrajectories } from "@/lib/game/engine"
import { nominalPrice } from "@/lib/types/market"

const marketPriceChartConfig = {
  wood: { label: "Wood", color: "#8B4513" },
  potatoes: { label: "Potatoes", color: "#DAA520" },
  fish: { label: "Fish", color: "#00CED1" },
} satisfies ChartConfig

export default function CreateScenarioPage() {
  const router = useRouter()
  const createScenario = useMutation(api.game.createScenario)

  // Initialize with debug values as template
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...initialFields } = DEBUG_SCENARIO
  // biome-ignore lint/suspicious/noExplicitAny: debug-only
  const [form, setForm] = useState<any>({ ...initialFields, mode: "live" })

  const handleGenerateTrajectories = () => {
    const trajectories = generateTrajectories(form)
    setForm({ ...form, precomputedTrajectories: trajectories })
  }

  // Build chart data for preview
  const chartData = useMemo(() => {
    if (!form.precomputedTrajectories) return []
    return form.precomputedTrajectories.map((step: any, i: number) => ({
      year: form.startYear + i + 1,
      wood: Math.round(nominalPrice(step.market.prices.wood, step.market.inflation) * 100) / 100,
      potatoes:
        Math.round(nominalPrice(step.market.prices.potatoes, step.market.inflation) * 100) / 100,
      fish: Math.round(nominalPrice(step.market.prices.fish, step.market.inflation) * 100) / 100,
    }))
  }, [form.precomputedTrajectories, form.startYear])

  const handleSave = async () => {
    if (form.mode === "precomputed" && !form.precomputedTrajectories) {
      alert("Please generate trajectories first for precomputed mode.")
      return
    }
    try {
      const scenarioId = await createScenario(form)
      alert(`Scenario created! ID: ${scenarioId}`)
      router.push("/debug/sessions")
    } catch (e) {
      const error = e as Error
      alert(`Error: ${error.message}`)
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: debug-only
  const updateNested = (path: string, val: any) => {
    const keys = path.split(".")
    // biome-ignore lint/suspicious/noExplicitAny: debug-only
    setForm((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev))
      let cur = next
      for (let i = 0; i < keys.length - 1; i++) {
        cur = cur[keys[i]]
      }
      cur[keys[keys.length - 1]] = val
      return next
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create New Scenario</h1>
          <p className="text-muted-foreground">Define the economic rules for a new game.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Scenario</Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="market">Market & Regime</TabsTrigger>
          <TabsTrigger value="economy">Global Economy</TabsTrigger>
          <TabsTrigger value="assets">Assets & Risk</TabsTrigger>
          {form.mode === "precomputed" && <TabsTrigger value="preview">Price Preview</TabsTrigger>}
        </TabsList>

        {/* ─── Basic Info ────────────────────────────────────────── */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Core Settings</CardTitle>
              <CardDescription>Identity, mode, and time horizon.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scenario Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scenario Mode</Label>
                  <Select
                    value={form.mode}
                    onValueChange={(v) =>
                      setForm({ ...form, mode: v, precomputedTrajectories: undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Live (Random for each player)</SelectItem>
                      <SelectItem value="precomputed">Precomputed (Same for everyone)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Start Year</Label>
                  <Input
                    type="number"
                    value={form.startYear}
                    onChange={(e) => setForm({ ...form, startYear: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Year</Label>
                  <Input
                    type="number"
                    value={form.endYear}
                    onChange={(e) => setForm({ ...form, endYear: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Capital (Gold)</Label>
                  <Input
                    type="number"
                    value={form.startCapital}
                    onChange={(e) => setForm({ ...form, startCapital: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yearly Goal (Gold)</Label>
                  <Input
                    type="number"
                    value={form.goalAmount}
                    onChange={(e) => setForm({ ...form, goalAmount: Number(e.target.value) })}
                  />
                </div>
              </div>

              {form.mode === "precomputed" && (
                <div className="pt-4">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleGenerateTrajectories}
                  >
                    {form.precomputedTrajectories
                      ? "Regenerate Trajectories"
                      : "Generate Deterministic Trajectories"}
                  </Button>
                  {form.precomputedTrajectories && (
                    <p className="text-center text-xs text-green-600 mt-2 font-medium">
                      ✓ {form.precomputedTrajectories.length} years of data generated.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Market ────────────────────────────────────────────── */}
        <TabsContent value="market">
          <Card>
            <CardHeader>
              <CardTitle>Market Regime Parameters</CardTitle>
              <CardDescription>Define how Bull and Bear markets behave.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-bold text-green-600">Bull Market</h3>
                  <div className="space-y-2">
                    <Label>Avg Return (e.g. 0.08 = 8%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.market.bullReturn}
                      onChange={(e) => updateNested("market.bullReturn", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Volatility (σ)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.market.bullVolatility}
                      onChange={(e) =>
                        updateNested("market.bullVolatility", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prob. to flip to Bear</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.market.bullToBearProbability}
                      onChange={(e) =>
                        updateNested("market.bullToBearProbability", Number(e.target.value))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-red-600">Bear Market</h3>
                  <div className="space-y-2">
                    <Label>Avg Return (e.g. -0.05)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.market.bearReturn}
                      onChange={(e) => updateNested("market.bearReturn", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Volatility (σ)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.market.bearVolatility}
                      onChange={(e) =>
                        updateNested("market.bearVolatility", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prob. to flip to Bull</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.market.bearToBullProbability}
                      onChange={(e) =>
                        updateNested("market.bearToBullProbability", Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Economy ───────────────────────────────────────────── */}
        <TabsContent value="economy">
          <Card>
            <CardHeader>
              <CardTitle>Global Economy</CardTitle>
              <CardDescription>Inflation, friction, and recurring revenue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Inflation Rate (avg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.inflationReturn}
                    onChange={(e) => setForm({ ...form, inflationReturn: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inflation Volatility</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.inflationVolatility}
                    onChange={(e) =>
                      setForm({ ...form, inflationVolatility: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recurring Income (Gold/Year)</Label>
                  <Input
                    type="number"
                    value={form.recurringRevenue}
                    onChange={(e) => setForm({ ...form, recurringRevenue: Number(e.target.value) })}
                  />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Buy Factor (e.g. 1.02 = 2% fee)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.buyFactor}
                    onChange={(e) => setForm({ ...form, buyFactor: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sell Factor (e.g. 0.98 = 2% fee)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.sellFactor}
                    onChange={(e) => setForm({ ...form, sellFactor: Number(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Assets ────────────────────────────────────────────── */}
        <TabsContent value="assets">
          <div className="grid grid-cols-1 gap-4">
            {["wood", "potatoes", "fish"].map((asset) => (
              <Card key={asset}>
                <CardHeader className="py-3">
                  <CardTitle className="capitalize">{asset}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Start Price</Label>
                    <Input
                      type="number"
                      value={form.assets[asset].startPrice}
                      onChange={(e) =>
                        updateNested(`assets.${asset}.startPrice`, Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Asset Beta (Return)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.assets[asset].priceReturn}
                      onChange={(e) =>
                        updateNested(`assets.${asset}.priceReturn`, Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Volatility (σ)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.assets[asset].priceVolatility}
                      onChange={(e) =>
                        updateNested(`assets.${asset}.priceVolatility`, Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Risk Prob. (Event)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.assets[asset].event.probability}
                      onChange={(e) =>
                        updateNested(`assets.${asset}.event.probability`, Number(e.target.value))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── Price Preview (Precomputed only) ────────────────────── */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Price Evolution Preview</CardTitle>
              <CardDescription>
                Deterministic price path for this scenario. Every player will see exactly these
                prices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ChartContainer config={marketPriceChartConfig} className="h-[400px] w-full">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="year"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => String(v)}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => String(Math.round(v))}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="wood"
                      name="Wood"
                      stroke="#8B4513"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="potatoes"
                      name="Potatoes"
                      stroke="#DAA520"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="fish"
                      name="Fish"
                      stroke="#00CED1"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ChartContainer>
              ) : (
                <div className="py-20 text-center text-muted-foreground">
                  Click &quot;Generate Trajectories&quot; in the Basic Info tab to see the preview.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
