export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
