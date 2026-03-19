"use client"

import { BookOpenIcon, GalleryVerticalEndIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function PublicHeader() {
  const { data: session, isPending } = authClient.useSession()
  const _router = useRouter()

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          TradeTales
        </Link>

        <div className="flex items-center gap-1 sm:gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/learn">
              <BookOpenIcon className="size-4 sm:mr-1" />
              <span className="hidden sm:inline">Learn</span>
            </Link>
          </Button>
          {!isPending && session ? (
            <Button size="sm" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
