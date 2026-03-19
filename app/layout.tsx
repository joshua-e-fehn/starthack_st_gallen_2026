import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { ConvexClientProvider } from "@/components/providers/convex-client-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { getToken } from "@/lib/auth-server"
import { cn } from "@/lib/utils"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const token = await getToken()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", fontSans.variable)}
    >
      <head>
        {/* Patch performance.measure to avoid negative-timestamp errors thrown by
            Next.js 16 / Turbopack LinkComponent instrumentation. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: inline perf patch for Next.js 16 bug
          dangerouslySetInnerHTML={{
            __html: `(function(){var o=performance.measure.bind(performance);performance.measure=function(){try{return o.apply(this,arguments)}catch(e){if(e instanceof TypeError&&/negative/.test(e.message))return;throw e}}})()`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ConvexClientProvider initialToken={token}>
          <QueryProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </QueryProvider>
        </ConvexClientProvider>
      </body>
    </html>
  )
}
