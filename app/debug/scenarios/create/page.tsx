"use client"

import { useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import { DEBUG_SCENARIO } from "@/lib/game/debug-scenario"

export default function CreateScenarioPage() {
  const router = useRouter()
  const createScenario = useMutation(api.game.createScenario)

  // Initialize with debug values as template
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...initialFields } = DEBUG_SCENARIO
  // biome-ignore lint/suspicious/noExplicitAny: debug-only
  const [form, setForm] = useState<any>(initialFields)

  const handleSave = async () => {
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
        </TabsList>

        {/* ─── Basic Info ────────────────────────────────────────── */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Core Settings</CardTitle>
              <CardDescription>Identity and time horizon.</CardDescription>
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
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
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
      </Tabs>
    </div>
  )
}
