'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { PageHeader } from '@/components/page-header'
import { BedrijfFilter } from '@/components/bedrijf-filter'
import { BedrijfBadge } from '@/components/bedrijf-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Megaphone,
  TrendingUp,
  CheckSquare,
  Sparkles,
  Phone,
  Calendar,
} from 'lucide-react'
import { formatDatum, dagenGeleden } from '@/lib/format'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { BedrijfTag, CampagneLead, SalesLead, Contactmoment, Taak } from '@/lib/types'
import { CAMPAGNE_FASES, SALES_FASES } from '@/lib/types'

interface FaseCount {
  fase: string
  count: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [bedrijfFilter, setBedrijfFilter] = useState<BedrijfTag | 'alle'>('alle')
  const [loading, setLoading] = useState(true)
  const [campagneCounts, setCampagneCounts] = useState<FaseCount[]>([])
  const [salesCounts, setSalesCounts] = useState<FaseCount[]>([])
  const [openTaken, setOpenTaken] = useState(0)
  const [nieuweLeads, setNieuweLeads] = useState(0)
  const [recenteLeads, setRecenteLeads] = useState<(CampagneLead | SalesLead)[]>([])
  const [recenteContacten, setRecenteContacten] = useState<Contactmoment[]>([])
  const [takenVandaag, setTakenVandaag] = useState<Taak[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const tagFilter = bedrijfFilter !== 'alle' ? bedrijfFilter : null

      // Campagne leads per fase
      let cQuery = supabase.from('campagne_leads').select('fase')
      if (tagFilter) cQuery = cQuery.eq('bedrijf_tag', tagFilter)
      const { data: campagneData } = await cQuery

      const cCounts = CAMPAGNE_FASES.map((f) => ({
        fase: f.label,
        count: campagneData?.filter((d) => d.fase === f.value).length || 0,
      }))
      setCampagneCounts(cCounts)

      // Sales leads per fase
      let sQuery = supabase.from('sales_leads').select('fase')
      if (tagFilter) sQuery = sQuery.eq('bedrijf_tag', tagFilter)
      const { data: salesData } = await sQuery

      const sCounts = SALES_FASES.map((f) => ({
        fase: f.label,
        count: salesData?.filter((d) => d.fase === f.value).length || 0,
      }))
      setSalesCounts(sCounts)

      // Open taken
      const { count: takenCount } = await supabase
        .from('taken')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'afgerond')
      setOpenTaken(takenCount || 0)

      // Nieuwe leads deze week
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      let nlQuery = supabase
        .from('campagne_leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString())
      if (tagFilter) nlQuery = nlQuery.eq('bedrijf_tag', tagFilter)
      const { count: newLeadCount } = await nlQuery
      setNieuweLeads(newLeadCount || 0)

      // Recent leads (5)
      let rlQuery = supabase
        .from('campagne_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      if (tagFilter) rlQuery = rlQuery.eq('bedrijf_tag', tagFilter)
      const { data: rl } = await rlQuery
      setRecenteLeads(rl || [])

      // Recente contactmomenten
      const { data: rc } = await supabase
        .from('contactmomenten')
        .select('*, gebruiker:users(*)')
        .order('datum', { ascending: false })
        .limit(5)
      setRecenteContacten(rc || [])

      // Taken die vandaag vervallen
      const today = new Date().toISOString().split('T')[0]
      const { data: tv } = await supabase
        .from('taken')
        .select('*')
        .eq('deadline', today)
        .neq('status', 'afgerond')
      setTakenVandaag(tv || [])

      setLoading(false)
    }
    fetchData()
  }, [bedrijfFilter, supabase])

  const metrics = [
    {
      title: 'Campagne leads',
      value: campagneCounts.reduce((a, b) => a + b.count, 0),
      icon: Megaphone,
      color: '#3A6FD8',
      bg: '#C9D9FF',
    },
    {
      title: 'Sales leads',
      value: salesCounts.reduce((a, b) => a + b.count, 0),
      icon: TrendingUp,
      color: '#1F8A9B',
      bg: '#A9DDE4',
    },
    {
      title: 'Open taken',
      value: openTaken,
      icon: CheckSquare,
      color: '#D97706',
      bg: '#FEF3C7',
    },
    {
      title: 'Nieuwe leads (7d)',
      value: nieuweLeads,
      icon: Sparkles,
      color: '#059669',
      bg: '#D1FAE5',
    },
  ]

  return (
    <>
      <PageHeader
        title={`Welkom${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}`}
        description="Overzicht van je River ERP dashboard"
      >
        <BedrijfFilter value={bedrijfFilter} onChange={setBedrijfFilter} />
      </PageHeader>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((m, i) => (
          <motion.div
            key={m.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border border-[#E5E7EB] shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: m.bg }}
                  >
                    <m.icon className="w-5 h-5" style={{ color: m.color }} />
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-semibold text-[#0B0D0E]">{m.value}</p>
                )}
                <p className="text-xs text-[#6B7280] mt-1">{m.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent leads */}
        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent toegevoegde leads</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recenteLeads.length === 0 ? (
              <p className="text-sm text-[#6B7280]">Geen recente leads</p>
            ) : (
              <div className="space-y-2">
                {recenteLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/campagne-leads/${lead.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#F4F6F7] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0B0D0E] truncate">{lead.naam}</p>
                      <p className="text-xs text-[#6B7280] truncate">{lead.bedrijf}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <BedrijfBadge tag={lead.bedrijf_tag} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Taken vandaag */}
        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Taken vandaag
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : takenVandaag.length === 0 ? (
              <p className="text-sm text-[#6B7280]">Geen taken met deadline vandaag</p>
            ) : (
              <div className="space-y-2">
                {takenVandaag.map((taak) => (
                  <Link
                    key={taak.id}
                    href="/taken"
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#F4F6F7] transition-colors"
                  >
                    <p className="text-sm font-medium text-[#0B0D0E] truncate">{taak.titel}</p>
                    <Badge
                      variant="outline"
                      className={
                        taak.prioriteit === 'hoog'
                          ? 'border-red-200 text-red-700 bg-red-50'
                          : taak.prioriteit === 'normaal'
                          ? 'border-yellow-200 text-yellow-700 bg-yellow-50'
                          : 'border-gray-200 text-gray-700'
                      }
                    >
                      {taak.prioriteit}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recente contactmomenten */}
        <Card className="border border-[#E5E7EB] shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Recente contactmomenten
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recenteContacten.length === 0 ? (
              <p className="text-sm text-[#6B7280]">Geen recente contactmomenten</p>
            ) : (
              <div className="space-y-2">
                {recenteContacten.map((cm) => (
                  <div
                    key={cm.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#F4F6F7]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0B0D0E]">
                        {cm.type_contact} — <span className="text-[#6B7280]">{cm.notities?.slice(0, 80)}{(cm.notities?.length || 0) > 80 ? '...' : ''}</span>
                      </p>
                      <p className="text-xs text-[#6B7280]">
                        {cm.gebruiker?.full_name} · {dagenGeleden(cm.datum)}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 ml-2">
                      {cm.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campagne fases */}
        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Campagne leads per fase</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-2">
                {campagneCounts.map((c) => (
                  <div key={c.fase} className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">{c.fase}</span>
                    <span className="text-sm font-medium text-[#0B0D0E]">{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales fases */}
        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Sales leads per fase</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-2">
                {salesCounts.map((c) => (
                  <div key={c.fase} className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">{c.fase}</span>
                    <span className="text-sm font-medium text-[#0B0D0E]">{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
