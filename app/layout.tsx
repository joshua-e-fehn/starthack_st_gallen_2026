import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { BackgroundMusic } from "@/components/molecules/background-music"
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
      <body suppressHydrationWarning>
        <ConvexClientProvider initialToken={token}>
          <QueryProvider>
            <ThemeProvider>
              {children}
              <BackgroundMusic />
            </ThemeProvider>
          </QueryProvider>
        </ConvexClientProvider>
      </body>
    </html>
  )
}
