"use client"

import { BookOpenIcon, GalleryVerticalEndIcon, LayoutDashboardIcon, LogOutIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

export function PublicHeader() {
  const { data: session, isPending } = authClient.useSession()
  const pathname = usePathname()
  const router = useRouter()

  const userName = session?.user?.name ?? "Guest"
  const userEmail = session?.user?.email ?? ""
  const userImage = session?.user?.image ?? ""

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/")
  }

  const isLearnActive = pathname.startsWith("/learn") || pathname.startsWith("/pitch/learn")
  const isDashboardActive = pathname.startsWith("/dashboard")

  const navItemClassName =
    "h-9 rounded-lg border border-transparent px-3 text-sm font-semibold transition-all"
  const navItemActiveClassName =
    "border-primary/70 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto relative flex w-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          TradeTales
        </Link>

        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              className={cn(navItemClassName, isLearnActive && navItemActiveClassName)}
              asChild
            >
              <Link href="/learn">
                <BookOpenIcon className="size-4 sm:mr-1" />
                <span className="hidden sm:inline">Learn</span>
              </Link>
            </Button>

            {!isPending && session ? (
              <Button
                variant="ghost"
                size="sm"
                className={cn(navItemClassName, isDashboardActive && navItemActiveClassName)}
                asChild
              >
                <Link href="/dashboard">
                  <LayoutDashboardIcon className="size-4 sm:mr-1" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          {!isPending && session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    navItemClassName,
                    "max-w-36 justify-start gap-2 rounded-full sm:max-w-44",
                  )}
                  aria-label="Open user menu"
                >
                  <Avatar size="sm">
                    <AvatarImage src={userImage} alt={userName} />
                    <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="max-w-20 truncate pr-1 text-xs font-semibold sm:max-w-36 sm:text-sm">
                    {userName}
                  </p>
                </Button>
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
                  <LogOutIcon />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" className={navItemClassName} asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
