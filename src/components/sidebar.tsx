'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard, Megaphone, TrendingUp, Users, CheckSquare,
  Receipt, BarChart3, UserCog, Settings, LogOut, Menu, X,
  FolderKanban, Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campagne-leads', label: 'Campagne leads', icon: Megaphone },
  { href: '/sales-leads', label: 'Sales leads', icon: TrendingUp },
  { href: '/klanten', label: 'Klanten', icon: Users },
  { href: '/projecten', label: 'Projecten', icon: FolderKanban },
  { href: '/ops', label: 'Ops', icon: Wrench },
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
      <div className="px-5 h-16 flex items-center border-b border-border/50">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <Image src="/logos/river-icon.png" alt="River" width={32} height={32} className="w-8 h-8 rounded-lg" priority />
          <div>
            <span className="text-[15px] font-semibold text-foreground tracking-tight">River</span>
            <span className="text-[10px] text-muted-foreground ml-1.5 font-medium">ERP</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Menu</p>
        {allItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                active
                  ? 'bg-primary/8 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              {/* Left accent bar */}
              {active && (
                <motion.div
                  layoutId="sidebar-accent"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className={cn('w-[18px] h-[18px] shrink-0', active ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-foreground')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border/50 p-3 space-y-0.5">
        <Link
          href="/instellingen"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
            pathname === '/instellingen'
              ? 'bg-primary/8 text-primary font-semibold'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          )}
        >
          {pathname === '/instellingen' && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary" />
          )}
          <Settings className="w-[18px] h-[18px] shrink-0" />
          Instellingen
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:bg-destructive/8 hover:text-destructive transition-all duration-150 w-full"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          Uitloggen
        </button>

        {/* User card */}
        <div className="flex items-center gap-3 px-3 py-3 mt-3 rounded-lg bg-muted/40">
          <Avatar className="w-8 h-8 ring-2 ring-background shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-primary to-[#1F8A9B] text-white text-[11px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-foreground truncate">{user?.full_name || 'Gebruiker'}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile header — glass effect */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-header border-b border-border/50 px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logos/river-icon.png" alt="River" width={28} height={28} className="w-7 h-7 rounded-md" priority />
          <span className="text-[15px] font-semibold text-foreground tracking-tight">River</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[270px] bg-card z-50 lg:hidden shadow-2xl border-r border-border/50"
            >
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[250px] lg:shrink-0 bg-card border-r border-border/50 h-screen sticky top-0">
        <NavContent />
      </aside>
    </>
  )
}
