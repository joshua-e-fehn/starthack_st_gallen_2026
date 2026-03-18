"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { authClient } from "@/lib/auth-client"

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up"]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()
  const pathname = usePathname()

  const isPublic = isPublicPath(pathname)

  useEffect(() => {
    if (!isPublic && !isPending && !session) {
      router.replace("/sign-in")
    }
  }, [isPublic, isPending, session, router])

  // Public paths render immediately without auth check
  if (isPublic) {
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
