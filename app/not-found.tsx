import Link from "next/link"
import { PublicHeader } from "@/components/organisms/public-header"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col font-sans">
      <PublicHeader />
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="flex items-center gap-5">
          <h1 className="text-2xl font-medium">404</h1>
          <div className="h-12 w-px bg-border" />
          <p className="text-sm">This page could not be found.</p>
        </div>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  )
}
