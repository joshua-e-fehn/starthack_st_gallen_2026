"use client"

import { useMutation, useQuery } from "convex/react"
import { useReducedMotion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GameChatbot } from "@/components/molecules/game-chatbot"
import { GameGoalProgress } from "@/components/molecules/game-goal-progress"
import { GameMiniPriceGraph } from "@/components/molecules/game-mini-price-graph"
import { GameAssetsGrid } from "@/components/organisms/game-assets-grid"
import { GameLeaderboardPopup } from "@/components/organisms/game-leaderboard-popup"
import { GameStatusHeader } from "@/components/organisms/game-status-header"
import { GameSubmitAction } from "@/components/organisms/game-submit-action"
import { GameTradeDrawer } from "@/components/organisms/game-trade-drawer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { portfolioValue } from "@/lib/game/engine"
import {
  clamp,
  GAME_GUIDE_COOKIE_MAX_AGE,
  GAME_GUIDE_COOKIE_NAME,
  GUIDE_ASSET_SEQUENCE,
  type GuideStep,
  getCookieValue,
  goodsMeta,
  lineConfig,
  mapTradeToY,
  mapYToTrade,
  roundMoney,
  setCookieValue,
} from "@/lib/game/ui"
import { getOrCreateGuestId } from "@/lib/guest"
import type { PlayerAction } from "@/lib/types/actions"
import type { TradableAsset } from "@/lib/types/assets"
import { TRADABLE_ASSET_KEYS } from "@/lib/types/assets"
import { buyPrice, sellPrice } from "@/lib/types/market"
import type { StateVector } from "@/lib/types/state_vector"

// ─── Main Game Page ──────────────────────────────────────────────

function GameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionIdParam = searchParams.get("sessionId") as Id<"sessions"> | null
  const gameIdParam = searchParams.get("gameId") as Id<"games"> | null

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

  // ─── Auto-start game when session is loaded ──
  useEffect(() => {
    if (gameId || isStarting) return
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const tradeBarRef = useRef<HTMLDivElement | null>(null)
  const submitButtonRef = useRef<HTMLButtonElement | null>(null)

  const prefersReducedMotion = useReducedMotion()
  const [guideStep, setGuideStep] = useState<GuideStep | null>(null)
  const [isGuideActive, setIsGuideActive] = useState(false)
  const [isGuideSeen, setIsGuideSeen] = useState(false)
  const [isLeaderboardPopupOpen, setIsLeaderboardPopupOpen] = useState(false)

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

  const projectedHolding = useMemo(() => {
    if (!selectedAsset) return 0
    return portfolio[selectedAsset] + currentTradeClamp
  }, [portfolio, selectedAsset, currentTradeClamp])

  const selectedMeta = useMemo(() => {
    if (!selectedAsset) return null
    return (
      (goodsMeta.find((m) => m.key === selectedAsset) as {
        key: TradableAsset
        name: string
        icon: string
        colorClass: string
      } | null) ?? null
    )
  }, [selectedAsset])

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

  const isFarmGuideStep = isGuideActive && guideStep === "farm"
  const isSubmitGuideStep = isGuideActive && guideStep === "submit"

  const currentGuideAsset = useMemo(() => {
    if (!isGuideActive) return null
    if (guideStep === "farm" || guideStep === "submit" || !guideStep) return null
    return guideStep
  }, [guideStep, isGuideActive])

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

  const markGuideSeen = useCallback(() => {
    setCookieValue(GAME_GUIDE_COOKIE_NAME, "1", GAME_GUIDE_COOKIE_MAX_AGE)
    setIsGuideSeen(true)
  }, [])

  const startGuide = useCallback(() => {
    setIsGuideActive(true)
    setGuideStep("farm")
  }, [])

  const stopGuide = useCallback(() => {
    setIsGuideActive(false)
    setGuideStep(null)
  }, [])

  const advanceGuideAfterAsset = useCallback(
    (asset: TradableAsset) => {
      const currentIndex = GUIDE_ASSET_SEQUENCE.findIndex((entry) => entry === asset)
      const nextAsset = GUIDE_ASSET_SEQUENCE[currentIndex + 1]
      if (nextAsset) {
        setGuideStep(nextAsset)
        return
      }
      setGuideStep("submit")
      if (!isGuideSeen) markGuideSeen()
    },
    [isGuideSeen, markGuideSeen],
  )

  const handleGoalProgressTap = useCallback(() => {
    // Advance guide to next step if farm guide is active
    if (isFarmGuideStep) {
      setGuideStep(GUIDE_ASSET_SEQUENCE[0])
    }
    // Open leaderboard
    setIsLeaderboardPopupOpen(true)
  }, [isFarmGuideStep])

  function closeTradeModal() {
    setSelectedAsset(null)
    setIsDraggingTradeBar(false)
  }

  function handleCancelTrade() {
    if (!selectedAsset) return
    setDraftTradeValue(tradePlan[selectedAsset])
  }

  function handleAssetCardClick(asset: TradableAsset) {
    if (gameOver) return
    if (isGuideActive && currentGuideAsset && currentGuideAsset !== asset) return
    if (isGuideActive && currentGuideAsset === asset) {
      advanceGuideAfterAsset(asset)
    }
    openTradeModal(asset)
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

  useEffect(() => {
    const seen = getCookieValue(GAME_GUIDE_COOKIE_NAME) === "1"
    setIsGuideSeen(seen)
    if (!seen) {
      setIsGuideActive(true)
      setGuideStep("farm")
    }
  }, [])

  useEffect(() => {
    if (!isSubmitGuideStep) return
    submitButtonRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    })
  }, [isSubmitGuideStep])

  useEffect(() => {
    if (!isGuideActive) return
    if (!gameOver) return
    stopGuide()
  }, [gameOver, isGuideActive, stopGuide])

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
        <GameStatusHeader
          current={current}
          gameOver={gameOver}
          goalAnimation={goalAnimation}
          onStartGuide={startGuide}
        />

        <GameGoalProgress
          goalProgressImageSrc={goalProgressImageSrc}
          totalValue={totalValue}
          goal={current.goal}
          isFarmGuideStep={isFarmGuideStep}
          prefersReducedMotion={Boolean(prefersReducedMotion)}
          onTap={handleGoalProgressTap}
        />

        <GameAssetsGrid
          totalAssetValue={totalAssetValue}
          maxAssetValue={maxAssetValue}
          tradePlan={tradePlan}
          plannedTalerDelta={plannedTalerDelta}
          portfolio={portfolio}
          currentGuideAsset={currentGuideAsset}
          gameOver={gameOver}
          prefersReducedMotion={Boolean(prefersReducedMotion)}
          onAssetClick={handleAssetCardClick}
        />

        {/* Chart */}
        {history.length > 1 && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle>Year {current.date}</CardTitle>
              <CardDescription>
                Asset values over time in talers (cash, each asset class, and total value).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GameMiniPriceGraph history={history} />
            </CardContent>
          </Card>
        )}

        <GameSubmitAction
          gameOver={gameOver}
          gameId={gameId}
          sessionId={sessionId}
          isSubmitting={isSubmitting}
          isSubmitGuideStep={isSubmitGuideStep}
          prefersReducedMotion={Boolean(prefersReducedMotion)}
          submitButtonRef={submitButtonRef}
          onViewResults={router.push}
          currentYear={current.date}
          onSubmit={() => {
            if (isSubmitGuideStep) stopGuide()
            handleSubmitTrades()
          }}
        />
      </div>

      <GameTradeDrawer
        selectedAsset={selectedAsset}
        closeTradeModal={closeTradeModal}
        setDraftTradeValue={setDraftTradeValue}
        selectedMeta={selectedMeta}
        selectedBuyPrice={selectedBuyPrice}
        projectedTalerBalance={projectedTalerBalance}
        history={history}
        buyDelta={buyDelta}
        maxSell={maxSell}
        maxBuy={maxBuy}
        tradeBarRef={tradeBarRef}
        isDraggingTradeBar={isDraggingTradeBar}
        setIsDraggingTradeBar={setIsDraggingTradeBar}
        onPointerUpdate={onPointerUpdate}
        currentTradeClamp={currentTradeClamp}
        indicatorY={indicatorY}
        selectedAssetColor={selectedAssetColor}
        projectedAssetValue={projectedAssetValue}
        sellDelta={sellDelta}
        selectedSellPriceVal={selectedSellPriceVal}
        projectedHolding={projectedHolding}
        onCancel={handleCancelTrade}
      />

      <GameLeaderboardPopup
        open={isLeaderboardPopupOpen}
        onOpenChange={setIsLeaderboardPopupOpen}
        sessionJoinCode={sessionData?.session.joinCode}
        sessionId={sessionId}
        leaderboard={sessionData?.leaderboard ?? []}
        onOpenFullLeaderboard={(path) => {
          setIsLeaderboardPopupOpen(false)
          router.push(path)
        }}
      />

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
