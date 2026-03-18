"use client"

import { ArrowRightIcon, BrainCircuitIcon, UsersIcon, ZapIcon } from "lucide-react"
import Link from "next/link"
import { PublicHeader } from "@/components/organisms/public-header"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader />

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <div className="flex max-w-3xl flex-col gap-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Build smarter, together.
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            MunichMinds is the collaborative platform that helps teams think bigger, move faster,
            and deliver results.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Get started
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">Learn more</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/40 px-6 py-24">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-3">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BrainCircuitIcon className="size-6" />
            </div>
            <h3 className="text-lg font-semibold">AI-Powered</h3>
            <p className="text-sm text-muted-foreground">
              Leverage cutting-edge AI to accelerate your workflows and surface insights
              automatically.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UsersIcon className="size-6" />
            </div>
            <h3 className="text-lg font-semibold">Team Collaboration</h3>
            <p className="text-sm text-muted-foreground">
              Work together in real-time with your team, share ideas, and stay aligned on goals.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ZapIcon className="size-6" />
            </div>
            <h3 className="text-lg font-semibold">Lightning Fast</h3>
            <p className="text-sm text-muted-foreground">
              Built on a modern stack for instant responses and a seamless user experience.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} MunichMinds</span>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
