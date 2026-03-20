"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { authClient } from "@/lib/auth-client"

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/learn"]

/** Paths accessible to guest (unauthenticated) players. */
const GUEST_ALLOWED_PATHS = ["/game"]

/** Auth pages where a logged-in user should be bounced to their callback. */
const AUTH_PAGES = ["/sign-in", "/sign-up"]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function isGuestAllowedPath(pathname: string) {
  return GUEST_ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isPublic = isPublicPath(pathname)
  const isGuestAllowed = isGuestAllowedPath(pathname)
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p)

  useEffect(() => {
    // If user is already logged in and on sign-in/sign-up, redirect to callbackUrl or dashboard
    if (isAuthPage && !isPending && session) {
      const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
      router.replace(callbackUrl)
      return
    }

    // Protected path without auth → redirect to sign-in with callbackUrl
    if (!isPublic && !isGuestAllowed && !isPending && !session) {
      const callbackUrl = encodeURIComponent(
        pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ""),
      )
      router.replace(`/sign-in?callbackUrl=${callbackUrl}`)
    }
  }, [isPublic, isGuestAllowed, isAuthPage, isPending, session, router, pathname, searchParams])

  // Public and guest-allowed paths render immediately
  if (isPublic || isGuestAllowed) {
    return <>{children}</>
  }

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <>{children}</>
}
