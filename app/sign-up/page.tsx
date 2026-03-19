"use client"

import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import { LoginForm } from "@/components/organisms/login-form"
import { Button } from "@/components/ui/button"

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeftIcon className="mr-1 size-4" />
            Back
          </Link>
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <Suspense>
            <LoginForm defaultSignUp />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
