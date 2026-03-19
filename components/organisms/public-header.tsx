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
    <header className="sticky top-0 z-50 flex h-16 items-center border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          MunichMinds
        </Link>

        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/learn">
              <BookOpenIcon className="mr-1 size-4" />
              Learn
            </Link>
          </Button>
          {!isPending && session ? (
            <Button asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
