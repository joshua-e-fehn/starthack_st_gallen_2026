"use client"

import { useSearchParams } from "next/navigation"
import { LoginForm } from "@/components/organisms/login-form"

export default function SignInPage() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect")

  return (
    <div className="flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <LoginForm redirectUrl={redirect || undefined} />
        </div>
      </div>
    </div>
  )
}
