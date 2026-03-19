"use client"

import { useQuery } from "convex/react"
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Info,
  Loader2,
  LogOut,
  Medal,
  PlusCircle,
  Trophy,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef } from "react"
import { AssetDistributionBar } from "@/components/molecules/asset-distribution-bar"
import { ScenarioViewer } from "@/components/organisms/scenario-viewer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = authClient.useSession()
  const sessionId = searchParams.get("sessionId") as Id<"sessions"> | null
  const focus = searchParams.get("focus")
  const scenariosSectionRef = useRef<HTMLDivElement>(null)

  // Queries
  const sessionData = useQuery(
    api.game.getSessionWithLeaderboard,
    sessionId ? { sessionId } : "skip",
  )
  const allSessions = useQuery(api.game.listSessions)

  const isLoaded = !!sessionId && !!sessionData
  const userName = session?.user?.name ?? "Guest"
  const userEmail = session?.user?.email ?? ""
  const userImage = session?.user?.image ?? ""

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/")
  }

  useEffect(() => {
    if (sessionId || focus !== "scenarios") return

    const timeout = setTimeout(() => {
      scenariosSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)

    return () => clearTimeout(timeout)
  }, [focus, sessionId])

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-8 pt-0">
      {isLoaded && (
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </Button>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isLoaded && sessionData ? `Session: ${sessionData.session.name}` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {isLoaded && sessionData
              ? `Join code: ${sessionData.session.joinCode}`
              : "Welcome back to your empire."}
          </p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          {isLoaded && (
            <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg" asChild>
              <Link href={`/dashboard/sessions/${sessionId}`}>
                <ArrowRight className="mr-2 h-5 w-5" />
                Overview
              </Link>
            </Button>
          )}
          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-2 py-1.5 shadow-sm backdrop-blur outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Open user menu"
                >
                  <Avatar size="sm">
                    <AvatarImage src={userImage} alt={userName} />
                    <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="max-w-28 truncate pr-1 text-xs font-semibold sm:max-w-40 sm:text-sm">
                    {userName}
                  </p>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarImage src={userImage} alt={userName} />
                      <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="grid text-left leading-tight">
                      <span className="truncate text-sm font-medium">{userName}</span>
                      {userEmail ? (
                        <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                      ) : null}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {isLoaded && sessionData ? (
        /* Loaded Game View */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Leaderboard */}
          <Card className="col-span-4 shadow-md border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Live Leaderboard
                </CardTitle>
                <CardDescription>
                  Real-time standing of all players in this session.
                </CardDescription>
              </div>
              <Badge variant="outline" className="h-6 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {sessionData.leaderboard.length} Players
              </Badge>
            </CardHeader>
            <CardContent>
              {sessionData.leaderboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Users className="h-12 w-12 opacity-10 mb-4" />
                  <p>No players have started their journey yet.</p>
                  <p className="text-xs">
                    Invite others using the join code:{" "}
                    <span className="font-mono font-bold text-primary">
                      {sessionData.session.joinCode}
                    </span>
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-15">Rank</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="min-w-55">Assets</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Net Worth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const maxNetWorth = sessionData.leaderboard[0]?.netWorth || 1
                      return sessionData.leaderboard.map((player, index) => (
                        <TableRow
                          key={player.gameId}
                          className={cn(index === 0 && "bg-yellow-500/5")}
                        >
                          <TableCell className="font-medium">
                            {index === 0 ? (
                              <Medal className="h-5 w-5 text-yellow-500" />
                            ) : (
                              `#${index + 1}`
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">{player.playerName}</TableCell>
                          <TableCell>
                            <AssetDistributionBar
                              breakdown={player.assetBreakdown}
                              scalePercent={(player.netWorth / maxNetWorth) * 100}
                              showDetails={index < 3}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={player.status === "active" ? "default" : "secondary"}
                              className="text-[10px] h-5"
                            >
                              {player.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary">
                            {player.netWorth.toLocaleString()} T
                          </TableCell>
                        </TableRow>
                      ))
                    })()}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Session Details / Info */}
          <div className="col-span-3 flex flex-col gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Session Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <span className="text-sm text-muted-foreground">Join Code</span>
                  <span className="text-xl font-mono font-black tracking-widest text-primary">
                    {sessionData.session.joinCode}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border bg-card">
                    <span className="text-[10px] uppercase text-muted-foreground block mb-1">
                      Status
                    </span>
                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                      <Activity className="mr-1 h-3 w-3" />
                      {sessionData.session.status}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <span className="text-[10px] uppercase text-muted-foreground block mb-1">
                      Created
                    </span>
                    <span className="text-xs font-medium">
                      {new Date(sessionData.session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() => router.push("/dashboard")}
                >
                  Exit Session View
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm">Quick Invite</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Share the code above with your friends. They can enter it in the "Join Game" section
                on their dashboard to join this specific competition.
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Default Dashboard View - Admin */
        <>
          {/* Active Sessions */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Active Sessions</h2>
              <p className="text-muted-foreground text-sm">
                Manage and monitor your hosted competitions.
              </p>
            </div>

            {!allSessions ? (
              <Card>
                <CardContent className="flex items-center justify-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : allSessions.length === 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="flex flex-col items-center justify-center p-12 text-center md:col-span-1 lg:col-span-2">
                  <Users className="h-12 w-12 text-muted-foreground/20 mb-4" />
                  <CardTitle>No sessions yet</CardTitle>
                  <CardDescription className="mt-2">
                    Create your first session to start hosting games.
                  </CardDescription>
                </Card>

                {/* Create New Session Card */}
                <Card
                  className="overflow-hidden flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
                  onClick={() => router.push("/dashboard/sessions/create")}
                >
                  <div className="rounded-full bg-muted p-4 group-hover:bg-primary/10 transition-colors">
                    <PlusCircle className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Create New Session</p>
                    <p className="text-xs text-muted-foreground">Start a new competition</p>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allSessions.map((session) => (
                  <Card
                    key={session._id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => router.push(`/dashboard?sessionId=${session._id}`)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg line-clamp-1">{session.name}</CardTitle>
                      <CardDescription>Join Code: {session.joinCode}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Status</p>
                          <Badge className="mt-1 capitalize">{session.status}</Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Created</p>
                          <p className="text-sm font-medium mt-1">
                            {new Date(session.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" className="w-full text-xs" asChild>
                        <Link href={`/dashboard?sessionId=${session._id}`}>
                          View Details
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {/* Create New Session Card */}
                <Card
                  className="overflow-hidden flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
                  onClick={() => router.push("/dashboard/sessions/create")}
                >
                  <div className="rounded-full bg-muted p-4 group-hover:bg-primary/10 transition-colors">
                    <PlusCircle className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Create New Session</p>
                    <p className="text-xs text-muted-foreground">Start a new competition</p>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Scenarios Section */}
          <div id="scenarios" ref={scenariosSectionRef} className="space-y-4 scroll-mt-24">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Scenario Templates</h2>
              <p className="text-muted-foreground text-sm">
                Create and manage your game scenarios.
              </p>
            </div>
            <ScenarioViewer editable={true} />
          </div>
        </>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
