'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  Megaphone,
  TrendingUp,
  Users,
  CheckSquare,
  Receipt,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campagne-leads', label: 'Campagne leads', icon: Megaphone },
  { href: '/sales-leads', label: 'Sales leads', icon: TrendingUp },
  { href: '/klanten', label: 'Klanten', icon: Users },
  { href: '/taken', label: 'Taken', icon: CheckSquare },
  { href: '/financien', label: 'Financiën', icon: Receipt },
  { href: '/analyse', label: 'Analyse', icon: BarChart3 },
]

const adminItems = [
  { href: '/gebruikers', label: 'Gebruikers', icon: UserCog },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const allItems = [
    ...navItems,
    ...(user?.role === 'admin' ? adminItems : []),
  ]

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#E5E7EB]">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <Image src="/logos/river-digital.png" alt="River Digital" width={120} height={40} className="h-8 w-auto" priority />
        </Link>
        <p className="text-[10px] text-[#9CA3AF] mt-1 pl-0.5">ERP Systeem</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {allItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[#3A6FD8] text-white'
                  : 'text-[#6B7280] hover:bg-[#F4F6F7] hover:text-[#0B0D0E]'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[#E5E7EB] p-3 space-y-1">
        <Link
          href="/instellingen"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname === '/instellingen'
              ? 'bg-[#3A6FD8] text-white'
              : 'text-[#6B7280] hover:bg-[#F4F6F7] hover:text-[#0B0D0E]'
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          Instellingen
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#6B7280] hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Uitloggen
        </button>
        <div className="flex items-center gap-3 px-3 py-2 mt-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-[#C9D9FF] text-[#3A6FD8] text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#0B0D0E] truncate">{user?.full_name || 'Gebruiker'}</p>
            <p className="text-xs text-[#6B7280] truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/logos/river-digital.png" alt="River Digital" width={100} height={32} className="h-7 w-auto" priority />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-white z-50 lg:hidden shadow-lg"
            >
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 bg-white border-r border-[#E5E7EB] h-screen sticky top-0">
        <NavContent />
      </aside>
    </>
  )
}
