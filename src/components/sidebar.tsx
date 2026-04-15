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
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Subtle river wave background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <svg viewBox="0 0 260 900" fill="none" className="absolute inset-0 w-full h-full opacity-[0.03]" preserveAspectRatio="none">
          <path d="M-20 200C60 170 130 230 200 200C240 185 255 210 270 200" stroke="url(#sideGrad)" strokeWidth="40" fill="none" />
          <path d="M-20 400C60 370 130 430 200 400C240 385 255 410 270 400" stroke="url(#sideGrad)" strokeWidth="30" fill="none" />
          <path d="M-20 600C60 570 130 630 200 600C240 585 255 610 270 600" stroke="url(#sideGrad)" strokeWidth="35" fill="none" />
          <path d="M-20 800C60 770 130 830 200 800C240 785 255 810 270 800" stroke="url(#sideGrad)" strokeWidth="25" fill="none" />
          <defs>
            <linearGradient id="sideGrad" x1="0" y1="0" x2="260" y2="0">
              <stop offset="0%" stopColor="#3A6FD8" />
              <stop offset="100%" stopColor="#1F8A9B" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#E5E7EB]/60 relative">
        <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <Image src="/logos/river-icon.png" alt="River" width={36} height={36} className="w-9 h-9 rounded-lg" priority />
          <div>
            <span className="text-lg font-semibold text-[#0B0D0E] tracking-tight">River</span>
            <p className="text-[10px] font-medium text-[#9CA3AF] tracking-wider uppercase -mt-0.5">ERP Systeem</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto relative">
        {allItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] text-white shadow-md shadow-[#3A6FD8]/20'
                  : 'text-[#6B7280] hover:bg-gradient-to-r hover:from-[#F0F4FF] hover:to-[#F4F6F7] hover:text-[#0B0D0E]'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[#E5E7EB]/60 p-3 space-y-0.5 relative">
        <Link
          href="/instellingen"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
            pathname === '/instellingen'
              ? 'bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] text-white shadow-md shadow-[#3A6FD8]/20'
              : 'text-[#6B7280] hover:bg-[#F0F4FF] hover:text-[#0B0D0E]'
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          Instellingen
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#6B7280] hover:bg-red-50 hover:text-red-600 transition-all duration-200 w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Uitloggen
        </button>
        <div className="flex items-center gap-3 px-3 py-3 mt-2 bg-gradient-to-r from-[#F0F4FF] to-[#F0FAFB] rounded-lg">
          <Avatar className="w-9 h-9 ring-2 ring-white shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-[#3A6FD8] to-[#1F8A9B] text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0B0D0E] truncate">{user?.full_name || 'Gebruiker'}</p>
            <p className="text-[11px] text-[#6B7280] truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB]/60 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logos/river-icon.png" alt="River" width={28} height={28} className="w-7 h-7 rounded-md" priority />
          <span className="text-base font-semibold text-[#0B0D0E] tracking-tight">River</span>
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
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-white z-50 lg:hidden shadow-2xl"
            >
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 bg-white border-r border-[#E5E7EB]/60 h-screen sticky top-0">
        <NavContent />
      </aside>
    </>
  )
}
