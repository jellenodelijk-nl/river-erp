import { Sidebar } from '@/components/sidebar'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 lg:pt-0 pt-14 overflow-y-auto bg-muted/30">
        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  )
}
