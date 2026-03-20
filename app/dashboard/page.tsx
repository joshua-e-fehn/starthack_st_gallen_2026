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
import { Suspense } from "react"
import { AssetDistributionBar } from "@/components/molecules/asset-distribution-bar"
import { PublicHeader } from "@/components/organisms/public-header"
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
  const isActive = session.status === "active"
  const isCompleted = session.status === "completed"

  return (
    <Link
      href={isHosted ? `/dashboard/competitions/${session._id}` : `/?sessionId=${session._id}`}
      className="block group"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-card transition-all duration-200",
          "hover:-translate-y-1 hover:shadow-lg group-hover:border-primary/30",
          isActive && "shadow-sm",
          isCompleted && "opacity-75 hover:opacity-100",
        )}
      >
        {/* Image banner */}
        <div className="relative h-36 w-full overflow-hidden bg-muted">
          {session.scenarioIcon ? (
            <Image
              src={session.scenarioIcon}
              alt={session.scenarioName || session.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/10 to-primary/5">
              <RocketIcon className="size-10 text-primary/20" />
            </div>
          )}
          {/* Gradient scrim for readability */}
          <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent" />

          {/* Status pill — top right */}
          <div className="absolute top-2.5 right-2.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md",
                isActive && "bg-green-500/20 text-green-100",
                isCompleted && "bg-white/15 text-white/80",
                !isActive && !isCompleted && "bg-yellow-500/20 text-yellow-100",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isActive && "bg-green-400",
                  isCompleted && "bg-white/60",
                  !isActive && !isCompleted && "bg-yellow-400",
                )}
              />
              {session.status}
            </span>
          </div>

          {/* Player count — top left */}
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-md">
              <UsersIcon className="size-3" />
              {session.playerCount ?? 0}
            </span>
          </div>

          {/* Name overlay on image — bottom */}
          <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
            <h3 className="text-lg font-bold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] line-clamp-1">
              {session.name}
            </h3>
          </div>
        </div>

        {/* Content area */}
        <div className="px-4 py-3">
          {/* Scenario + date row */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] text-muted-foreground truncate">
              Scenario: {session.scenarioName ?? "Custom scenario"}
            </p>
            <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground/50">
              {new Date(session.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Join code bar */}
          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Join Code
            </span>
            <span className="font-mono text-sm font-black tracking-[0.2em] text-primary">
              {session.joinCode}
            </span>
          </div>
        </div>
      </div>
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
          <Link href={`/dashboard/competitions/${sessionId}`}>
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
                  <Link href="/dashboard/competitions/create">
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
                      <Link href="/dashboard/competitions/create">
                        <PlusCircleIcon className="mr-1.5 size-4" />
                        Create Competition
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
                    <Link href="/dashboard/competitions/create" className="block group h-full">
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
