"use client"

import { useQuery } from "convex/react"
import { motion } from "framer-motion"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CrownIcon,
  Loader2Icon,
  PlusCircleIcon,
  RocketIcon,
  SwordsIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useRef } from "react"
import { AssetDistributionBar } from "@/components/molecules/asset-distribution-bar"
import { PublicHeader } from "@/components/organisms/public-header"
import { ScenarioViewer } from "@/components/organisms/scenario-viewer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { getOrCreateGuestId } from "@/lib/guest"
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

/* ─── Session Card ──────────────────────────────────────────── */
function SessionCard({
  session,
  isHosted,
}: {
  session: {
    _id: Id<"sessions">
    name: string
    joinCode: string
    status: string
    createdAt: number
    scenarioName?: string
    scenarioIcon?: string
    playerCount?: number
  }
  isHosted: boolean
}) {
  return (
    <Link
      href={isHosted ? `/dashboard/sessions/${session._id}` : `/?sessionId=${session._id}`}
      className="block group"
    >
      <Card className="overflow-hidden border-transparent bg-card shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group-hover:border-primary/20">
        <CardContent className="p-0">
          {session.scenarioIcon && (
            <div className="relative h-28 w-full overflow-hidden bg-linear-to-b from-primary/10 to-transparent">
              <Image
                src={session.scenarioIcon}
                alt={session.scenarioName || session.name}
                fill
                className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                unoptimized
              />
              <div className="absolute inset-0 bg-linear-to-t from-card via-transparent to-transparent" />
            </div>
          )}

          <div className={cn("px-4 pb-4", session.scenarioIcon ? "-mt-4 relative" : "pt-4")}>
            <h3 className="text-lg font-bold tracking-tight line-clamp-1">{session.name}</h3>

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-mono font-bold tracking-wider text-primary">
                {session.joinCode}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <UsersIcon className="size-3" />
                {session.playerCount ?? 0}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "h-5 text-[10px] capitalize",
                  session.status === "active" &&
                    "border-green-500/30 text-green-600 bg-green-500/5",
                  session.status === "completed" &&
                    "border-muted text-muted-foreground bg-muted/30",
                  session.status === "waiting" &&
                    "border-yellow-500/30 text-yellow-600 bg-yellow-500/5",
                )}
              >
                {session.status}
              </Badge>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="truncate">{session.scenarioName ?? "Custom scenario"}</span>
              <span className="shrink-0 ml-2">
                {new Date(session.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

/* ─── Empty State ───────────────────────────────────────────── */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/20 p-10 text-center">
      <Icon className="size-10 text-muted-foreground/25 mb-3" />
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ─── Session Detail View ───────────────────────────────────── */
function SessionDetailView({
  sessionId,
  onBack,
}: {
  sessionId: Id<"sessions">
  onBack: () => void
}) {
  const sessionData = useQuery(api.game.getSessionWithLeaderboard, { sessionId })

  if (!sessionData) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  const maxNetWorth = sessionData.leaderboard[0]?.netWorth || 1

  return (
    <motion.div {...fadeUp()} className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" onClick={onBack}>
        <ArrowLeftIcon className="mr-1 size-4" />
        Back to Dashboard
      </Button>

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{sessionData.session.name}</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-mono font-bold tracking-wider text-primary">
              CODE: {sessionData.session.joinCode}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <UsersIcon className="size-3.5" />
              {sessionData.leaderboard.length} players
            </span>
          </div>
        </div>
        <Button size="sm" asChild>
          <Link href={`/dashboard/sessions/${sessionId}`}>
            <ArrowRightIcon className="mr-1.5 size-4" />
            Full Overview
          </Link>
        </Button>
      </div>

      {sessionData.leaderboard.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No players yet"
          description={`Share the join code ${sessionData.session.joinCode} to invite players.`}
        />
      ) : (
        <Card className="border-primary/10 shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-14 pl-4">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-48">Assets</TableHead>
                  <TableHead className="text-right pr-4">Net Worth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionData.leaderboard.map((player, index) => (
                  <TableRow key={player.gameId} className={cn(index === 0 && "bg-yellow-500/5")}>
                    <TableCell className="pl-4 font-medium">
                      {index === 0 ? (
                        <TrophyIcon className="size-4 text-yellow-500" />
                      ) : index === 1 ? (
                        <span className="text-zinc-400 font-bold">2</span>
                      ) : index === 2 ? (
                        <span className="text-amber-700 font-bold">3</span>
                      ) : (
                        <span className="text-muted-foreground">{index + 1}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-sm">{player.playerName}</span>
                      <Badge
                        variant={player.status === "active" ? "default" : "secondary"}
                        className="ml-2 h-4 text-[9px]"
                      >
                        {player.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <AssetDistributionBar
                        breakdown={player.assetBreakdown}
                        scalePercent={(player.netWorth / maxNetWorth) * 100}
                        showDetails={index < 3}
                      />
                    </TableCell>
                    <TableCell className="text-right pr-4 font-mono font-bold text-primary">
                      {player.netWorth.toLocaleString("de-CH")} T
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

/* ─── Main Dashboard ────────────────────────────────────────── */
function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId") as Id<"sessions"> | null
  const scenariosSectionRef = useRef<HTMLDivElement>(null)

  const guestId = getOrCreateGuestId()
  const hostedSessions = useQuery(api.game.listMyHostedSessions)
  const joinedSessions = useQuery(api.game.listMyJoinedSessions, { guestId })

  const isLoading = hostedSessions === undefined || joinedSessions === undefined

  // If viewing a specific session
  if (sessionId) {
    return (
      <div className="min-h-dvh bg-background">
        <PublicHeader />
        <main className="mx-auto max-w-4xl px-4 pb-12 pt-4 sm:px-6">
          <SessionDetailView sessionId={sessionId} onBack={() => router.push("/dashboard")} />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-4 sm:px-6">
        {/* Page Header */}
        <motion.div {...fadeUp()} className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your competitions and track your games.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2Icon className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* ─── Hosted Competitions ─────────────────────── */}
            <motion.section {...fadeUp(0.05)}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CrownIcon className="size-5 text-primary" />
                  <h2 className="text-xl font-bold tracking-tight">Hosted Competitions</h2>
                  {hostedSessions && hostedSessions.length > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      {hostedSessions.length}
                    </span>
                  )}
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/sessions/create">
                    <PlusCircleIcon className="mr-1.5 size-4" />
                    New
                  </Link>
                </Button>
              </div>

              {hostedSessions.length === 0 ? (
                <EmptyState
                  icon={RocketIcon}
                  title="No hosted games yet"
                  description="Create your first competition and invite others to play."
                  action={
                    <Button size="sm" asChild>
                      <Link href="/dashboard/sessions/create">
                        <PlusCircleIcon className="mr-1.5 size-4" />
                        Create Session
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {hostedSessions.map((session) => (
                    <motion.div key={session._id} variants={childFade}>
                      <SessionCard session={session} isHosted />
                    </motion.div>
                  ))}

                  {/* Quick-create card */}
                  <motion.div variants={childFade}>
                    <Link href="/dashboard/sessions/create" className="block group h-full">
                      <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/15 bg-muted/10 p-6 text-center transition-all hover:border-primary/30 hover:bg-primary/5 group-hover:scale-[1.01]">
                        <div className="rounded-full bg-muted p-3 group-hover:bg-primary/10 transition-colors">
                          <PlusCircleIcon className="size-6 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                          Create New
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                </motion.div>
              )}
            </motion.section>

            {/* ─── Joined Competitions ─────────────────────── */}
            <motion.section {...fadeUp(0.1)}>
              <div className="mb-4 flex items-center gap-2">
                <SwordsIcon className="size-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Joined Competitions</h2>
                {joinedSessions && joinedSessions.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {joinedSessions.length}
                  </span>
                )}
              </div>

              {joinedSessions.length === 0 ? (
                <EmptyState
                  icon={SwordsIcon}
                  title="No competitions joined"
                  description="Join a game using a code on the home page to see it here."
                  action={
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/">
                        <ArrowRightIcon className="mr-1.5 size-4" />
                        Go to Home
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {joinedSessions.map((session) => (
                    <motion.div key={session._id} variants={childFade}>
                      <SessionCard session={session} isHosted={false} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.section>

            {/* ─── Scenario Templates ─────────────────────── */}
            <motion.section
              {...fadeUp(0.15)}
              ref={scenariosSectionRef}
              id="scenarios"
              className="scroll-mt-24"
            >
              <div className="mb-4">
                <h2 className="text-xl font-bold tracking-tight">Scenario Templates</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create and manage your game scenarios.
                </p>
              </div>
              <ScenarioViewer editable />
            </motion.section>
          </div>
        )}
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background">
          <Loader2Icon className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
