"use client"

import { useMutation, useQuery } from "convex/react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowDown, ArrowUp, Loader2, Minus, Plus, RotateCcw, Trophy } from "lucide-react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import { GameChatbot } from "@/components/molecules/game-chatbot"
import { EventPopup } from "@/components/organisms/event-popup"
import { StoryPlayer } from "@/components/organisms/story-player"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { portfolioValue } from "@/lib/game/engine"
import { getOrCreateGuestId } from "@/lib/guest"
import type { PlayerAction } from "@/lib/types/actions"
import type { TradableAsset } from "@/lib/types/assets"
import { TRADABLE_ASSET_KEYS } from "@/lib/types/assets"
import { buyPrice, nominalPrice, sellPrice } from "@/lib/types/market"
import type { StorySlide } from "@/lib/types/onboarding"
import type { StateVector } from "@/lib/types/state_vector"

// ─── Constants ───────────────────────────────────────────────────

type AssetKey = TradableAsset | "taler"

type OnboardingStep = {
  targetId: string
  title: string
  description: string
}

const onboardingStorageKey = "game-onboarding-completed"
const onboardingBaseSteps: OnboardingStep[] = [
  {
    targetId: "year-status",
    title: "Current Year & Market",
    description: "See the current year and whether the market is in bull or bear mode.",
  },
  {
    targetId: "goal-progress",
    title: "Farm Goal Progress",
    description: "This bar shows how close you are to reaching the farm purchase goal.",
  },
  {
    targetId: "portfolio-grid",
    title: "Tap Bars To Trade",
    description:
      "Click a goods bar/card (wood, potatoes, fish) to open the trade controls. This is how you trade goods.",
  },
  {
    targetId: "roll-year",
    title: "Commit Your Turn",
    description: "When your trades are set, press this to roll events and move to the next year.",
  },
]

const goodsMeta: Array<{
  key: AssetKey
  name: string
  icon: string
  colorClass: string
}> = [
  {
    key: "taler",
    name: "Taler",
    icon: "/asset-classes/taler.webp",
    colorClass: "bg-[oklch(0.84_0.18_93)]",
  },
  {
    key: "wood",
    name: "Wood",
    icon: "/asset-classes/wood.webp",
    colorClass: "bg-[oklch(0.42_0.07_43)]",
  },
  {
    key: "potatoes",
    name: "Potatoes",
    icon: "/asset-classes/potatoes.webp",
    colorClass: "bg-[oklch(0.56_0.21_33)]",
  },
  {
    key: "fish",
    name: "Fish",
    icon: "/asset-classes/fish.webp",
    colorClass: "bg-[oklch(0.78_0.08_236)]",
  },
]

const lineConfig = {
  taler: { color: "oklch(0.84 0.18 93)", label: "Taler" },
  wood: { color: "oklch(0.42 0.07 43)", label: "Wood" },
  potatoes: { color: "oklch(0.56 0.21 33)", label: "Potatoes" },
  fish: { color: "oklch(0.78 0.08 236)", label: "Fish" },
  totalValue: { color: "oklch(0.72 0.18 150)", label: "Total Value" },
}

const priceChartConfig = {
  talerBalance: { label: "Taler", color: lineConfig.taler.color },
  woodValue: { label: "Wood Value", color: lineConfig.wood.color },
  potatoesValue: { label: "Potatoes Value", color: lineConfig.potatoes.color },
  fishValue: { label: "Fish Value", color: lineConfig.fish.color },
  totalValue: { label: "Total Value", color: lineConfig.totalValue.color },
} satisfies ChartConfig

const ONBOARDING_KEY = "game_onboarding_seen"

const onboardingSlides: StorySlide[] = [
  {
    id: "farmer",
    shortName: "Farmer",
    title: "You are a farmer and work on a farm",
    body: "You rise with the sun, tending your fields and animals at the king's court. Life is simple, but every harvest reminds you: hard work alone won't build the future you dream of.",
    imageSrc: "/onboarding/story1.webp",
  },
  {
    id: "merchant",
    shortName: "Merchant",
    title: "You want to diversify and become a merchant",
    body: "You begin to wonder, what if your taler could work as hard as you do? As whispers of trade and distant markets reach your ears, you decide to become more than a farmer: a merchant in the making.",
    imageSrc: "/onboarding/story2.webp",
  },
  {
    id: "first-taler",
    shortName: "First Taler",
    title: "The village elder gives you your first bag of taler",
    body: "Seeing your ambition, the village elder entrusts you with a small bag of taler. Use it wisely, he says. Fortunes are not only grown in fields, but in choices.",
    imageSrc: "/onboarding/story3.webp",
  },
  {
    id: "yearly-income",
    shortName: "Yearly Income",
    title: "You receive income every year",
    body: "Each year, your farm provides steady income. It's your foundation, reliable but limited. How you use it will decide whether you stay a farmer, or rise beyond.",
    imageSrc: "/onboarding/story4.webp",
  },
  {
    id: "build-future",
    shortName: "Build Future",
    title: "Trade, grow, and build your future",
    body: "Buy, sell, and adapt as seasons change and fortunes rise and fall. Some choices will reward you, others will test you. Stay patient, think long-term, and one day you may own your dream farm worked not by your hands alone, but by those you employ.",
    imageSrc: "/onboarding/story5.webp",
  },
]

// ─── Helpers ─────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}

function formatTaler(n: number) {
  return `${new Intl.NumberFormat("de-CH").format(Math.round(n * 100) / 100)}`
}

function mapYToTrade(y: number, height: number, maxBuy: number, maxSell: number) {
  const center = height / 2
  const cappedY = clamp(y, 0, height)
  if (cappedY <= center) {
    const ratio = (center - cappedY) / center
    return Math.round(ratio * maxBuy)
  }
  const ratio = (cappedY - center) / center
  return -Math.round(ratio * maxSell)
}

function mapTradeToY(value: number, height: number, maxBuy: number, maxSell: number) {
  const center = height / 2
  if (value >= 0) {
    if (maxBuy === 0) return center
    return center - (value / maxBuy) * center
  }
  if (maxSell === 0) return center
  return center + (Math.abs(value) / maxSell) * center
}

// ─── Chart ───────────────────────────────────────────────────────

function MiniPriceGraph({ history }: { history: StateVector[] }) {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, history.length - 1))

  useEffect(() => {
    setSelectedIndex(Math.max(0, history.length - 1))
  }, [history.length])

  const chartData = useMemo(() => {
    return history.map((state) => {
      const inf = state.market.inflation
      return {
        step: state.date,
        talerBalance: roundMoney(state.portfolio.gold),
        woodValue: roundMoney(state.portfolio.wood * sellPrice(state.market.prices.wood, inf)),
        potatoesValue: roundMoney(
          state.portfolio.potatoes * sellPrice(state.market.prices.potatoes, inf),
        ),
        fishValue: roundMoney(state.portfolio.fish * sellPrice(state.market.prices.fish, inf)),
        totalValue: roundMoney(portfolioValue(state.portfolio, state.market)),
      }
    })
  }, [history])

  const safeSelectedIndex = clamp(selectedIndex, 0, Math.max(0, chartData.length - 1))
  const selectedPoint = chartData[safeSelectedIndex]

  const keys = ["talerBalance", "woodValue", "potatoesValue", "fishValue", "totalValue"] as const
  const seriesColors: Record<(typeof keys)[number], string> = {
    talerBalance: lineConfig.taler.color,
    woodValue: lineConfig.wood.color,
    potatoesValue: lineConfig.potatoes.color,
    fishValue: lineConfig.fish.color,
    totalValue: lineConfig.totalValue.color,
  }

  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <ChartContainer config={priceChartConfig} className="h-56 w-full">
        <AreaChart
          data={chartData}
          onClick={(state) => {
            const activeIndex = state?.activeTooltipIndex
            if (typeof activeIndex === "number") setSelectedIndex(activeIndex)
          }}
          margin={{ top: 12, right: 16, left: -6, bottom: 0 }}
        >
          <defs>
            {keys.map((key) => (
              <linearGradient key={`fill-${key}`} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={seriesColors[key]} stopOpacity={0.4} />
                <stop offset="95%" stopColor={seriesColors[key]} stopOpacity={0.03} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="step"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(value) => `Y${value}`}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={68}
            tickFormatter={(value) => Number(value).toLocaleString("de-CH")}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: "5 5" }}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(_, payload) => {
                  const step = payload?.[0]?.payload?.step
                  return `Year ${typeof step === "number" ? step : "-"}`
                }}
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-mono tabular-nums">
                      {Number(value).toLocaleString("de-CH")} taler
                    </span>
                  </div>
                )}
              />
            }
          />
          {selectedPoint ? (
            <ReferenceLine
              x={selectedPoint.step}
              xAxisId={0}
              stroke="currentColor"
              strokeOpacity={0.22}
              strokeDasharray="5 5"
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="talerBalance"
            name="Taler"
            stroke={lineConfig.taler.color}
            strokeWidth={2.5}
            fill="url(#fill-talerBalance)"
            activeDot={{ r: 6 }}
            dot={{ r: 2.5, strokeWidth: 1.2, fill: lineConfig.taler.color }}
          />
          <Area
            type="monotone"
            dataKey="woodValue"
            name="Wood Value"
            stroke={lineConfig.wood.color}
            strokeWidth={2.5}
            fill="url(#fill-woodValue)"
            activeDot={{ r: 6 }}
            dot={{ r: 2.5, strokeWidth: 1.2, fill: lineConfig.wood.color }}
          />
          <Area
            type="monotone"
            dataKey="potatoesValue"
            name="Potatoes Value"
            stroke={lineConfig.potatoes.color}
            strokeWidth={2.5}
            fill="url(#fill-potatoesValue)"
            activeDot={{ r: 6 }}
            dot={{ r: 2.5, strokeWidth: 1.2, fill: lineConfig.potatoes.color }}
          />
          <Area
            type="monotone"
            dataKey="fishValue"
            name="Fish Value"
            stroke={lineConfig.fish.color}
            strokeWidth={2.5}
            fill="url(#fill-fishValue)"
            activeDot={{ r: 6 }}
            dot={{ r: 2.5, strokeWidth: 1.2, fill: lineConfig.fish.color }}
          />
          <Area
            type="monotone"
            dataKey="totalValue"
            name="Total Value"
            stroke={lineConfig.totalValue.color}
            strokeWidth={3}
            fill="url(#fill-totalValue)"
            activeDot={{ r: 7 }}
            dot={{ r: 3, strokeWidth: 1.2, fill: lineConfig.totalValue.color }}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

function DrawerAssetHistoryGraph({
  history,
  asset,
}: {
  history: StateVector[]
  asset: TradableAsset
}) {
  const assetChartConfig = {
    [asset]: {
      label: lineConfig[asset].label,
      color: lineConfig[asset].color,
    },
  } satisfies ChartConfig

  const data = useMemo(
    () =>
      history.map((s) => ({
        step: s.date,
        [asset]: roundMoney(nominalPrice(s.market.prices[asset], s.market.inflation)),
      })),
    [history, asset],
  )

  return (
    <div className="rounded-lg border bg-muted/30 p-2">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Price History</p>
      <ChartContainer config={assetChartConfig} className="h-36 w-full">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={`drawer-fill-${asset}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineConfig[asset].color} stopOpacity={0.42} />
              <stop offset="95%" stopColor={lineConfig[asset].color} stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="step"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={18}
            tickFormatter={(value) => `Y${value}`}
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={42} />
          <ChartTooltip
            cursor={{ strokeDasharray: "4 4" }}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(_, payload) => {
                  const step = payload?.[0]?.payload?.step
                  return `Year ${typeof step === "number" ? step : "-"}`
                }}
                formatter={(value) => (
                  <span className="font-mono tabular-nums">
                    {Number(value).toLocaleString("de-CH")} taler
                  </span>
                )}
              />
            }
          />
          <Area
            type="monotone"
            dataKey={asset}
            name={lineConfig[asset].label}
            stroke={lineConfig[asset].color}
            strokeWidth={2.5}
            fill={`url(#drawer-fill-${asset})`}
            activeDot={{ r: 5 }}
            dot={{ r: 2.5, strokeWidth: 1, fill: lineConfig[asset].color }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

// ─── Main Game Page ──────────────────────────────────────────────

function GameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionIdParam = searchParams.get("sessionId") as Id<"sessions"> | null
  const gameIdParam = searchParams.get("gameId") as Id<"games"> | null

  // ─── Onboarding ─────────────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY)
    if (!seen) setShowOnboarding(true)
    setOnboardingChecked(true)
  }, [])

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true")
    setShowOnboarding(false)
  }, [])

  // ─── Convex data ────────────────────────────────────────────
  const guestId = getOrCreateGuestId()
  const startGameMutation = useMutation(api.game.startGame)
  const submitStepMutation = useMutation(api.game.submitStep)

  const [gameId, setGameId] = useState<Id<"games"> | null>(gameIdParam)
  const [isStarting, setIsStarting] = useState(false)

  const sessionData = useQuery(
    api.game.getSessionWithLeaderboard,
    sessionIdParam ? { sessionId: sessionIdParam } : "skip",
  )

  const convexGame = useQuery(api.game.getGame, gameId ? { gameId, guestId } : "skip")
  const convexScenario = useQuery(
    api.game.getScenario,
    convexGame?.scenarioId ? { scenarioId: convexGame.scenarioId } : "skip",
  )
  const convexHistory = useQuery(api.game.getGameTimeSeries, gameId ? { gameId, guestId } : "skip")

  const myGameInSession = useQuery(
    api.game.getMyGameInSession,
    sessionIdParam ? { sessionId: sessionIdParam, guestId } : "skip",
  )

  const sessionId = sessionIdParam ?? convexGame?.sessionId ?? null

  // ─── Auto-start game when session is loaded & onboarding done ──
  useEffect(() => {
    if (gameId || isStarting || showOnboarding || !onboardingChecked) return
    if (!sessionIdParam || !sessionData) return

    const playerName = localStorage.getItem("debug_playerName") ?? "Player"

    // Check if user already has a game in this session (re-join)
    if (myGameInSession) {
      setGameId(myGameInSession._id)
      return
    }

    setIsStarting(true)
    startGameMutation({
      scenarioId: sessionData.session.scenarioId,
      sessionId: sessionIdParam,
      playerName,
      guestId,
    })
      .then((id) => {
        setGameId(id)
        router.replace(`/dashboard/game?sessionId=${sessionIdParam}&gameId=${id}`)
      })
      .catch((e) => {
        console.error("Failed to start game:", e)
        alert((e as Error).message || "Failed to start game")
        router.push("/")
      })
      .finally(() => setIsStarting(false))
  }, [
    gameId,
    isStarting,
    showOnboarding,
    onboardingChecked,
    sessionIdParam,
    sessionData,
    myGameInSession,
    startGameMutation,
    guestId,
    router,
  ])

  // ─── Build local state from Convex ──────────────────────────
  const history: StateVector[] = useMemo(() => {
    if (!convexHistory?.length) return []
    // biome-ignore lint/suspicious/noExplicitAny: Convex doc → StateVector shape match
    return convexHistory as any
  }, [convexHistory])

  const current = history.length > 0 ? history[history.length - 1] : null

  const scenario = useMemo(() => {
    if (!convexScenario) return null
    const { _id, _creationTime, ...rest } = convexScenario
    // biome-ignore lint/suspicious/noExplicitAny: shape match
    return { id: _id, ...rest } as any
  }, [convexScenario])

  const goalProgressImageSrc = scenario?.icon ?? "/farm.webp"

  const gameOver = useMemo(() => {
    if (!scenario || !current) return false
    return current.date >= scenario.endYear
  }, [current, scenario])

  // ─── Trade state ────────────────────────────────────────────
  const [tradePlan, setTradePlan] = useState<Record<TradableAsset, number>>({
    wood: 0,
    potatoes: 0,
    fish: 0,
  })
  const [selectedAsset, setSelectedAsset] = useState<TradableAsset | null>(null)
  const [draftTradeValue, setDraftTradeValue] = useState(0)
  const [isDraggingTradeBar, setIsDraggingTradeBar] = useState(false)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [isOnboardingTooltipVisible, setIsOnboardingTooltipVisible] = useState(false)
  const [onboardingIndex, setOnboardingIndex] = useState(0)
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [eventToShow, setEventToShow] = useState<(typeof current.events)[number] | null>(null)
  const tradeBarRef = useRef<HTMLDivElement | null>(null)
  const onboardingAssistantVideoRef = useRef<HTMLVideoElement | null>(null)

  // ─── Derived values ─────────────────────────────────────────
  const portfolio = current?.portfolio ?? { gold: 0, wood: 0, potatoes: 0, fish: 0 }
  const market = current?.market
  const inflation = market?.inflation ?? 1

  const getBuyPriceFor = useCallback(
    (asset: TradableAsset) => (market ? buyPrice(market.prices[asset], inflation) : 0),
    [market, inflation],
  )

  const getSellPriceFor = useCallback(
    (asset: TradableAsset) => (market ? sellPrice(market.prices[asset], inflation) : 0),
    [market, inflation],
  )

  const totalAssetValue = useMemo(() => {
    return {
      taler: portfolio.gold,
      wood: roundMoney(portfolio.wood * getSellPriceFor("wood")),
      potatoes: roundMoney(portfolio.potatoes * getSellPriceFor("potatoes")),
      fish: roundMoney(portfolio.fish * getSellPriceFor("fish")),
    }
  }, [portfolio, getSellPriceFor])

  const maxAssetValue = useMemo(
    () => Math.max(...Object.values(totalAssetValue), 1),
    [totalAssetValue],
  )

  const totalValue = current ? portfolioValue(current.portfolio, current.market) : 0

  const selectedBuyPrice = selectedAsset ? getBuyPriceFor(selectedAsset) : 0
  const selectedSellPriceVal = selectedAsset ? getSellPriceFor(selectedAsset) : 0

  const tradeCostExcludingSelected = useMemo(() => {
    if (!selectedAsset) return 0
    return (Object.keys(tradePlan) as TradableAsset[])
      .filter((asset) => asset !== selectedAsset)
      .reduce((sum, asset) => {
        if (tradePlan[asset] > 0) return sum + tradePlan[asset] * getBuyPriceFor(asset)
        if (tradePlan[asset] < 0) return sum - Math.abs(tradePlan[asset]) * getSellPriceFor(asset)
        return sum
      }, 0)
  }, [selectedAsset, tradePlan, getBuyPriceFor, getSellPriceFor])

  const maxBuy = useMemo(() => {
    if (!selectedAsset || selectedBuyPrice <= 0) return 0
    const freeCash = portfolio.gold - tradeCostExcludingSelected
    return Math.max(0, Math.floor(freeCash / selectedBuyPrice))
  }, [selectedAsset, selectedBuyPrice, portfolio.gold, tradeCostExcludingSelected])

  const maxSell = useMemo(() => {
    if (!selectedAsset) return 0
    return portfolio[selectedAsset]
  }, [portfolio, selectedAsset])

  const currentTradeClamp = useMemo(
    () => clamp(draftTradeValue, -maxSell, maxBuy),
    [draftTradeValue, maxBuy, maxSell],
  )

  const onboardingSteps = useMemo(() => {
    const steps = [...onboardingBaseSteps]
    if (history.length > 1) {
      steps.splice(3, 0, {
        targetId: "price-chart",
        title: "Price History",
        description: "This chart helps you spot trends before you buy or sell.",
      })
    }
    return steps
  }, [history.length])

  const activeStep = onboardingSteps[onboardingIndex]

  useEffect(() => {
    if (onboardingIndex >= onboardingSteps.length) {
      setOnboardingIndex(Math.max(0, onboardingSteps.length - 1))
    }
  }, [onboardingIndex, onboardingSteps.length])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const isCompleted = window.localStorage.getItem(onboardingStorageKey) === "true"
    if (!isCompleted) {
      setIsOnboardingOpen(true)
    }
  }, [])

  useEffect(() => {
    if (!isOnboardingOpen || !activeStep) {
      setHighlightRect(null)
      return
    }

    const resolveTargetRect = () => {
      const target = document.querySelector<HTMLElement>(
        `[data-onboarding-id="${activeStep.targetId}"]`,
      )
      if (!target) {
        setHighlightRect(null)
        return
      }

      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" })
      setHighlightRect(target.getBoundingClientRect())
    }

    resolveTargetRect()

    const onViewportChange = () => {
      const target = document.querySelector<HTMLElement>(
        `[data-onboarding-id="${activeStep.targetId}"]`,
      )
      setHighlightRect(target ? target.getBoundingClientRect() : null)
    }

    window.addEventListener("resize", onViewportChange)
    window.addEventListener("scroll", onViewportChange, true)

    return () => {
      window.removeEventListener("resize", onViewportChange)
      window.removeEventListener("scroll", onViewportChange, true)
    }
  }, [activeStep, isOnboardingOpen])

  function closeOnboarding(markComplete: boolean) {
    setIsOnboardingOpen(false)
    setIsOnboardingTooltipVisible(false)

    if (markComplete && typeof window !== "undefined") {
      window.localStorage.setItem(onboardingStorageKey, "true")
    }
  }

  function startOnboarding() {
    setOnboardingIndex(0)
    setIsOnboardingOpen(true)
  }

  function nextOnboardingStep() {
    const isLastStep = onboardingIndex >= onboardingSteps.length - 1
    if (isLastStep) {
      closeOnboarding(true)
      return
    }

    setOnboardingIndex((previous) => previous + 1)
  }

  function previousOnboardingStep() {
    setOnboardingIndex((previous) => Math.max(0, previous - 1))
  }

  const isLastOnboardingStep = onboardingIndex >= onboardingSteps.length - 1
  const stepProgress = `${onboardingIndex + 1} / ${onboardingSteps.length}`

  const tooltipStyle = useMemo(() => {
    if (!highlightRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }
    }

    const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth
    const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight
    const tooltipWidth = 320
    const spaceAbove = highlightRect.top
    const preferBelow = spaceAbove < 190
    const centeredLeft = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2
    const constrainedLeft = clamp(centeredLeft, 12, viewportWidth - tooltipWidth - 12)

    if (preferBelow) {
      const top = clamp(highlightRect.bottom + 12, 12, viewportHeight - 220)
      return {
        top: `${top}px`,
        left: `${constrainedLeft}px`,
      }
    }

    const top = clamp(highlightRect.top - 168, 12, viewportHeight - 220)
    return {
      top: `${top}px`,
      left: `${constrainedLeft}px`,
    }
  }, [highlightRect])

  const freezeOnboardingAssistantAtLastFrame = useCallback(() => {
    const video = onboardingAssistantVideoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return

    const freezeAt = Math.max(video.duration - 0.033, 0)
    video.currentTime = freezeAt
    video.pause()
  }, [])

  useEffect(() => {
    if (!isOnboardingOpen) return

    const video = onboardingAssistantVideoRef.current
    if (!video) {
      setIsOnboardingTooltipVisible(true)
      return
    }

    setIsOnboardingTooltipVisible(false)

    video.currentTime = 0

    const revealTooltip = () => {
      freezeOnboardingAssistantAtLastFrame()
      setIsOnboardingTooltipVisible(true)
    }

    const fallbackTimeout = window.setTimeout(() => {
      revealTooltip()
    }, 1800)

    const playPromise = video.play()
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // On autoplay failure, show tooltip immediately and keep onboarding usable.
        window.clearTimeout(fallbackTimeout)
        setIsOnboardingTooltipVisible(true)
      })
    }

    const onEnded = () => {
      window.clearTimeout(fallbackTimeout)
      revealTooltip()
    }

    video.addEventListener("ended", onEnded)

    return () => {
      window.clearTimeout(fallbackTimeout)
      video.removeEventListener("ended", onEnded)
    }
  }, [isOnboardingOpen, freezeOnboardingAssistantAtLastFrame])

  const projectedHolding = useMemo(() => {
    if (!selectedAsset) return 0
    return portfolio[selectedAsset] + currentTradeClamp
  }, [portfolio, selectedAsset, currentTradeClamp])

  const selectedMeta = useMemo(
    () => (selectedAsset ? (goodsMeta.find((m) => m.key === selectedAsset) ?? null) : null),
    [selectedAsset],
  )

  const buyDelta = Math.max(0, currentTradeClamp)
  const sellDelta = Math.max(0, -currentTradeClamp)
  const projectedAssetValue = roundMoney(
    projectedHolding * (currentTradeClamp >= 0 ? selectedBuyPrice : selectedSellPriceVal),
  )

  const plannedTalerDelta = useMemo(() => {
    return -roundMoney(
      (Object.keys(tradePlan) as TradableAsset[]).reduce((sum, asset) => {
        const qty = tradePlan[asset]
        if (qty > 0) return sum + qty * getBuyPriceFor(asset)
        if (qty < 0) return sum + qty * getSellPriceFor(asset)
        return sum
      }, 0),
    )
  }, [tradePlan, getBuyPriceFor, getSellPriceFor])

  const projectedTalerBalance = roundMoney(portfolio.gold + plannedTalerDelta)

  const selectedAssetColor = selectedAsset
    ? lineConfig[selectedAsset].color
    : "oklch(0.62 0.14 228)"

  // Sync trade plan draft when selected asset changes
  useEffect(() => {
    if (!selectedAsset) return
    setTradePlan((prev) => {
      if (prev[selectedAsset] === currentTradeClamp) return prev
      return { ...prev, [selectedAsset]: currentTradeClamp }
    })
  }, [currentTradeClamp, selectedAsset])

  // ─── Handlers ───────────────────────────────────────────────
  function openTradeModal(asset: TradableAsset) {
    setSelectedAsset(asset)
    setDraftTradeValue(tradePlan[asset])
  }

  function closeTradeModal() {
    setSelectedAsset(null)
    setIsDraggingTradeBar(false)
  }

  function onPointerUpdate(clientY: number) {
    if (!tradeBarRef.current) return
    const rect = tradeBarRef.current.getBoundingClientRect()
    const y = clamp(clientY - rect.top, 0, rect.height)
    setDraftTradeValue(mapYToTrade(y, rect.height, maxBuy, maxSell))
  }

  const handleSubmitTrades = useCallback(async () => {
    if (!gameId || isSubmitting || gameOver) return

    const actions: PlayerAction[] = []
    for (const asset of TRADABLE_ASSET_KEYS) {
      const qty = tradePlan[asset]
      if (qty > 0) actions.push({ type: "buy", asset, quantity: qty })
      if (qty < 0) actions.push({ type: "sell", asset, quantity: Math.abs(qty) })
    }

    setIsSubmitting(true)

    // Navigate to leaderboard BEFORE the mutation resolves so the user
    // never sees the graph update flash. The mutation runs in the
    // background and the leaderboard query will pick up the new scores.
    if (sessionId && current) {
      const nextStep = current.step + 1
      const name = localStorage.getItem("debug_playerName") ?? ""
      router.push(
        `/dashboard/sessions/${sessionId}/leaderboard?step=${nextStep}&gameId=${gameId}&sessionId=${sessionId}&name=${encodeURIComponent(name)}`,
      )
    }

    try {
      await submitStepMutation({ gameId, actions, guestId })
      setTradePlan({ wood: 0, potatoes: 0, fish: 0 })
    } catch (e) {
      console.error("Submit step failed:", e)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    gameId,
    isSubmitting,
    gameOver,
    tradePlan,
    submitStepMutation,
    sessionId,
    current,
    router,
    guestId,
  ])

  const indicatorY = mapTradeToY(currentTradeClamp, 220, maxBuy, maxSell)

  // Track goal-reached transitions for animations
  const prevGoalReached = useRef<boolean | null>(null)
  const [goalAnimation, setGoalAnimation] = useState<"reached" | "lost" | null>(null)
  useEffect(() => {
    if (!current) return
    const wasReached = prevGoalReached.current
    const isReached = current.goalReached
    if (wasReached === false && isReached) {
      setGoalAnimation("reached")
      const t = setTimeout(() => setGoalAnimation(null), 2000)
      return () => clearTimeout(t)
    }
    if (wasReached === true && !isReached) {
      setGoalAnimation("lost")
      const t = setTimeout(() => setGoalAnimation(null), 2000)
      return () => clearTimeout(t)
    }
    prevGoalReached.current = isReached
  }, [current, current?.goalReached])
  // Keep ref in sync outside effect for next render comparison
  useEffect(() => {
    if (current) prevGoalReached.current = current.goalReached
  })

  // Show event popup when new events occur
  useEffect(() => {
    if (!current?.events?.length) return
    const latestEvent = current.events[current.events.length - 1]
    if (latestEvent) {
      setEventToShow(latestEvent)
    }
  }, [current?.events]) // Trigger when events change

  // ─── Loading / onboarding states ────────────────────────────
  if (!onboardingChecked) return null

  if (showOnboarding) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <StoryPlayer
          slides={onboardingSlides}
          autoAdvanceMs={7000}
          previousAtStartLabel="Back"
          completeLabel="Start Playing"
          onPreviousAtStart={() => router.push("/")}
          onComplete={handleOnboardingComplete}
        />
      </main>
    )
  }

  if (!gameId || !current || !market) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center px-4 py-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {isStarting ? "Starting your game..." : "Loading game..."}
          </p>
        </div>
      </main>
    )
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="space-y-4">
        {/* Year & status header */}
        <div className="flex items-center justify-between" data-onboarding-id="year-status">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Year {current.date}</h1>
            <Badge
              variant={current.market.regime === "bull" ? "default" : "destructive"}
              className="text-[10px]"
            >
              {current.market.regime === "bull" ? "🐂 Bull" : "🐻 Bear"}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={startOnboarding}
            >
              Guide
            </Button>
          </div>
          <div className="text-right">
            <AnimatePresence mode="wait">
              {current.goalReached ? (
                <motion.div
                  key="goal-reached"
                  initial={{ opacity: 0, scale: 0.5, y: 4 }}
                  animate={
                    goalAnimation === "reached"
                      ? { opacity: 1, scale: [1, 1.25, 1], y: 0 }
                      : { opacity: 1, scale: 1, y: 0 }
                  }
                  exit={{ opacity: 0, scale: 0.5, y: 4 }}
                  transition={
                    goalAnimation === "reached"
                      ? { duration: 0.5, ease: "easeInOut" }
                      : { type: "spring", stiffness: 400, damping: 20 }
                  }
                >
                  <Badge variant="default" className="bg-green-600 text-[10px]">
                    🎯 Goal Reached
                  </Badge>
                </motion.div>
              ) : goalAnimation === "lost" ? (
                <motion.div
                  key="goal-lost"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: [1, 1, 0], y: [0, 0, 8], scale: [1, 1, 0.8] }}
                  transition={{ duration: 1.5, times: [0, 0.6, 1] }}
                >
                  <Badge variant="destructive" className="text-[10px]">
                    📉 Goal Lost
                  </Badge>
                </motion.div>
              ) : null}
            </AnimatePresence>
            {gameOver && (
              <Badge variant="outline" className="ml-1 text-[10px]">
                Game Over
              </Badge>
            )}
          </div>
        </div>

        {/* Goal progress image */}
        <div
          className="relative h-48 w-full overflow-hidden rounded-xl bg-muted/40"
          data-onboarding-id="goal-progress"
        >
          {/* Grayscale background image */}
          <Image
            src={goalProgressImageSrc}
            alt="Goal progress"
            fill
            className="absolute inset-0 object-contain object-center"
            unoptimized
            style={{ filter: "grayscale(100%)" }}
          />

          {/* Colorized overlay from bottom to top */}
          <Image
            src={goalProgressImageSrc}
            alt="Goal progress fill"
            fill
            className="absolute inset-0 object-contain object-center"
            unoptimized
            style={{
              clipPath: `inset(${Math.max(0, 100 - (totalValue / current.goal) * 100)}% 0 0 0)`,
              transition: "clip-path 0.3s ease-out",
            }}
          />

          {/* Taler display at bottom center */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-linear-to-t from-black/60 to-transparent py-3">
            <p className="font-mono text-sm font-bold text-white drop-shadow-md">
              {formatTaler(totalValue)} / {formatTaler(current.goal)} taler
            </p>
          </div>
        </div>

        {/* Asset cards */}
        <div className="grid grid-cols-4 gap-2" data-onboarding-id="portfolio-grid">
          {goodsMeta.map((meta) => {
            const value = totalAssetValue[meta.key]
            const opacity = value / maxAssetValue
            const tradeDeltaRaw =
              meta.key === "taler" ? plannedTalerDelta : tradePlan[meta.key as TradableAsset]
            const hasTradeDelta = tradeDeltaRaw !== 0
            const isTradeDeltaPositive = tradeDeltaRaw > 0
            const tradeDeltaLabel =
              meta.key === "taler"
                ? `${isTradeDeltaPositive ? "+" : ""}${formatTaler(tradeDeltaRaw)}`
                : `${isTradeDeltaPositive ? "+" : ""}${tradeDeltaRaw}`
            const tradeDeltaColor = lineConfig[meta.key].color

            return (
              <button
                type="button"
                key={meta.key}
                onClick={() => {
                  if (meta.key !== "taler" && !gameOver) openTradeModal(meta.key as TradableAsset)
                }}
                className="flex h-full flex-col justify-end text-left"
                disabled={gameOver}
              >
                <div className="relative flex h-55 flex-col justify-end overflow-hidden rounded-lg border border-white/70">
                  <div
                    className={`absolute inset-0 ${meta.colorClass}`}
                    style={{ opacity: 0.15 }}
                  />
                  <div
                    className={`absolute bottom-0 w-full transition-all ${meta.colorClass}`}
                    style={{ height: `${Math.max(20, opacity * 100)}%` }}
                  />
                  {hasTradeDelta ? (
                    <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-xs font-semibold shadow-sm">
                      {isTradeDeltaPositive ? (
                        <ArrowUp className="size-3.5" style={{ color: tradeDeltaColor }} />
                      ) : (
                        <ArrowDown className="size-3.5" style={{ color: tradeDeltaColor }} />
                      )}
                      <span style={{ color: tradeDeltaColor }}>{tradeDeltaLabel}</span>
                    </div>
                  ) : null}
                  <div className="absolute inset-0 flex w-full items-end justify-center">
                    <div className="flex w-full flex-col items-center py-3 pb-3">
                      <Image
                        src={meta.icon}
                        alt={meta.name}
                        width={56}
                        height={56}
                        className="object-contain"
                      />
                      <p className="font-mono text-xl font-black leading-none text-white drop-shadow-sm">
                        {meta.key === "taler"
                          ? formatTaler(portfolio.gold)
                          : portfolio[meta.key as TradableAsset]}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-1">
                  <p className="text-center text-sm font-medium">
                    {formatTaler(value)}
                    <br /> Talers
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Chart */}
        {history.length > 1 && (
          <Card className="bg-muted/50" data-onboarding-id="price-chart">
            <CardHeader>
              <CardTitle>Year {current.date}</CardTitle>
              <CardDescription>
                Asset values over time in talers (cash, each asset class, and total value).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MiniPriceGraph history={history} />
            </CardContent>
          </Card>
        )}

        {/* Submit / Results button */}
        {gameOver ? (
          <Button
            type="button"
            className="h-12 w-full bg-green-600 text-base hover:bg-green-700"
            onClick={() =>
              router.push(
                `/dashboard/game/results?gameId=${gameId}${sessionId ? `&sessionId=${sessionId}` : ""}`,
              )
            }
          >
            <Trophy className="mr-2 size-4" />
            View Results
          </Button>
        ) : (
          <Button
            type="button"
            className="h-12 w-full text-base"
            onClick={handleSubmitTrades}
            disabled={isSubmitting}
            data-onboarding-id="roll-year"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Done trading & roll events"
            )}
          </Button>
        )}
      </div>

      {/* Trade drawer */}
      <Drawer open={selectedAsset !== null} onOpenChange={(open) => !open && closeTradeModal()}>
        <DrawerContent className="mx-auto w-full max-w-2xl rounded-t-2xl">
          <DrawerHeader>
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle>
                {selectedAsset
                  ? `Trade ${selectedAsset[0].toUpperCase()}${selectedAsset.slice(1)}`
                  : "Trade"}
              </DrawerTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setDraftTradeValue(0)}
                aria-label="Reset trade to no change"
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>
            <DrawerDescription>
              Interactive trade bar: middle is no change, up buys, down sells.
            </DrawerDescription>
          </DrawerHeader>

          <div className="max-h-[70vh] overflow-y-auto px-4 pb-4" data-vaul-no-drag>
            {/* Price & balance info */}
            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">Buy Price</div>
                <div className="flex items-center gap-1.5 font-medium">
                  {selectedMeta ? (
                    <Image
                      src={selectedMeta.icon}
                      alt={selectedMeta.name}
                      width={16}
                      height={16}
                      className="object-contain"
                    />
                  ) : null}
                  <span>{formatTaler(selectedBuyPrice)} taler</span>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-2">
                <div className="text-xs text-muted-foreground">Taler Balance</div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Image
                    src="/asset-classes/taler.webp"
                    alt="Taler"
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                  <span>{formatTaler(projectedTalerBalance)} taler</span>
                </div>
              </div>
            </div>

            {/* Drawer price history chart */}
            {selectedAsset && history.length > 1 ? (
              <div className="mb-4">
                <DrawerAssetHistoryGraph history={history} asset={selectedAsset} />
              </div>
            ) : null}

            {/* Trade slider */}
            <div className="mb-4 space-y-3">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border bg-emerald-500/10 px-3 py-2 text-sm transition-colors hover:bg-emerald-500/15"
                onClick={() => setDraftTradeValue((v) => clamp(v + 1, -maxSell, maxBuy))}
                aria-label="Increase acquired goods by one"
              >
                <div className="flex items-center gap-2 font-semibold text-emerald-700">
                  <Plus className="size-4" />
                  <span>Acquired</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">
                    {formatTaler(buyDelta * selectedBuyPrice)} taler
                  </span>
                  <span className="flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 font-medium">
                    {selectedMeta ? (
                      <Image
                        src={selectedMeta.icon}
                        alt={selectedMeta.name}
                        width={16}
                        height={16}
                        className="object-contain"
                      />
                    ) : null}
                    +{buyDelta}
                  </span>
                </div>
              </button>

              <div
                ref={tradeBarRef}
                className="relative h-55 rounded-xl border bg-background"
                data-vaul-no-drag
                onPointerDown={(event) => {
                  setIsDraggingTradeBar(true)
                  onPointerUpdate(event.clientY)
                }}
                onPointerMove={(event) => {
                  if (!isDraggingTradeBar) return
                  onPointerUpdate(event.clientY)
                }}
                onPointerUp={() => setIsDraggingTradeBar(false)}
                onPointerLeave={() => setIsDraggingTradeBar(false)}
              >
                <div className="absolute inset-0 overflow-hidden rounded-xl">
                  <div className="h-1/2 w-full bg-linear-to-b from-emerald-500/20 via-emerald-500/10 to-background/60" />
                  <div className="h-1/2 w-full bg-linear-to-t from-rose-500/20 via-rose-500/10 to-background/60" />
                </div>
                <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-muted-foreground/30" />
                <div className="absolute bottom-2 top-2 left-1/2 z-10 w-32 -translate-x-1/2 overflow-hidden rounded-full border border-white/60 bg-background/60 shadow-inner backdrop-blur-sm">
                  <div className="absolute inset-0 bg-linear-to-b from-white/35 via-white/20 to-black/10" />
                  {currentTradeClamp !== 0 ? (
                    <div
                      className="absolute inset-x-0"
                      style={{
                        top: currentTradeClamp > 0 ? `${indicatorY}px` : "50%",
                        bottom: currentTradeClamp > 0 ? "50%" : `${220 - indicatorY}px`,
                        backgroundColor: selectedAssetColor,
                        opacity: 0.4,
                      }}
                    />
                  ) : null}
                </div>
                <div
                  className="absolute left-1/2 z-20 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white/85 shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                  style={{ top: `${indicatorY}px` }}
                >
                  <div
                    className="absolute inset-1 rounded-full"
                    style={{ backgroundColor: selectedAssetColor, opacity: 0.9 }}
                  />
                </div>
                <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-background/85 px-2 py-1 text-xs font-medium shadow-sm">
                  Buy +{buyDelta}
                </div>
                <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-background/85 px-2 py-1 text-xs font-medium shadow-sm">
                  {formatTaler(projectedAssetValue)} taler
                </div>
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-background/85 px-2 py-1 text-xs font-medium shadow-sm">
                  Sell -{sellDelta}
                </div>
                <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-xs font-medium shadow-sm">
                  {selectedMeta ? (
                    <Image
                      src={selectedMeta.icon}
                      alt={selectedMeta.name}
                      width={14}
                      height={14}
                      className="object-contain"
                    />
                  ) : null}
                  {projectedHolding} units
                </div>
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border bg-rose-500/10 px-3 py-2 text-sm transition-colors hover:bg-rose-500/15"
                onClick={() => setDraftTradeValue((v) => clamp(v - 1, -maxSell, maxBuy))}
                aria-label="Increase sold goods by one"
              >
                <div className="flex items-center gap-2 font-semibold text-rose-700">
                  <Minus className="size-4" />
                  <span>Sold</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">
                    {formatTaler(sellDelta * selectedSellPriceVal)} taler
                  </span>
                  <span className="flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 font-medium">
                    {selectedMeta ? (
                      <Image
                        src={selectedMeta.icon}
                        alt={selectedMeta.name}
                        width={16}
                        height={16}
                        className="object-contain"
                      />
                    ) : null}
                    -{sellDelta}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {isOnboardingOpen && activeStep ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/55" />

          {highlightRect ? (
            <div
              className="pointer-events-none absolute rounded-xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-all"
              style={{
                top: `${highlightRect.top - 8}px`,
                left: `${highlightRect.left - 8}px`,
                width: `${highlightRect.width + 16}px`,
                height: `${highlightRect.height + 16}px`,
              }}
            />
          ) : null}

          <AnimatePresence mode="wait">
            {isOnboardingTooltipVisible ? (
              <motion.div
                key="onboarding-tooltip"
                className="absolute z-10 w-[min(28rem,calc(100vw-1.5rem))] rounded-xl border bg-card shadow-xl"
                style={tooltipStyle}
                initial={{ opacity: 0, scale: 0.7, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 6 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                role="dialog"
                aria-live="polite"
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:gap-4">
                  <div
                    className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-primary/40 bg-card/95"
                    aria-hidden="true"
                  >
                    <video
                      ref={onboardingAssistantVideoRef}
                      src="/start%20white.webm"
                      className="h-full w-full object-cover"
                      autoPlay
                      muted
                      playsInline
                      preload="auto"
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {stepProgress}
                      </p>
                      <h2 className="mt-1 text-base font-semibold text-foreground">
                        {activeStep.title}
                      </h2>
                      <p className="mt-2 text-sm leading-5 text-muted-foreground">
                        {activeStep.description}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={previousOnboardingStep}
                        disabled={onboardingIndex === 0}
                      >
                        Prev
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => closeOnboarding(true)}
                        >
                          Skip
                        </Button>
                        <Button type="button" size="sm" onClick={nextOnboardingStep}>
                          {isLastOnboardingStep ? "Done" : "Next"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      <EventPopup event={eventToShow} open={!!eventToShow} onClose={() => setEventToShow(null)} />

      <GameChatbot />
    </main>
  )
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <GameContent />
    </Suspense>
  )
}
