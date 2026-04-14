'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/page-header'
import { BedrijfFilter } from '@/components/bedrijf-filter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { CAMPAGNE_FASES, SALES_FASES } from '@/lib/types'
import type { BedrijfTag } from '@/lib/types'
import { motion } from 'framer-motion'
import { subDays, subMonths, subWeeks, format, startOfMonth, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'

const COLORS = ['#3A6FD8', '#1F8A9B', '#7FA6FF', '#5FBBC7', '#C9D9FF', '#A9DDE4']

type Periode = 'week' | 'maand' | 'kwartaal' | 'jaar'

export default function AnalysePage() {
  const supabase = createClient()
  const [bedrijfFilter, setBedrijfFilter] = useState<BedrijfTag | 'alle'>('alle')
  const [periode, setPeriode] = useState<Periode>('maand')
  const [loading, setLoading] = useState(true)

  const [campagneFaseData, setCampagneFaseData] = useState<{ name: string; value: number }[]>([])
  const [salesFaseData, setSalesFaseData] = useState<{ name: string; value: number }[]>([])
  const [campagneOverTijd, setCampagneOverTijd] = useState<{ datum: string; aantal: number }[]>([])
  const [klantenPerMaand, setKlantenPerMaand] = useState<{ maand: string; aantal: number }[]>([])
  const [takenData, setTakenData] = useState<{ name: string; open: number; afgerond: number }[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const tagFilter = bedrijfFilter !== 'alle' ? bedrijfFilter : null

      const startDate = periode === 'week' ? subWeeks(new Date(), 1) :
                        periode === 'maand' ? subMonths(new Date(), 1) :
                        periode === 'kwartaal' ? subMonths(new Date(), 3) :
                        subMonths(new Date(), 12)

      // Campagne leads per fase
      let cq = supabase.from('campagne_leads').select('fase')
      if (tagFilter) cq = cq.eq('bedrijf_tag', tagFilter)
      const { data: cData } = await cq

      setCampagneFaseData(
        CAMPAGNE_FASES.map(f => ({
          name: f.label,
          value: cData?.filter(d => d.fase === f.value).length || 0,
        })).filter(d => d.value > 0)
      )

      // Sales leads per fase
      let sq = supabase.from('sales_leads').select('fase')
      if (tagFilter) sq = sq.eq('bedrijf_tag', tagFilter)
      const { data: sData } = await sq

      setSalesFaseData(
        SALES_FASES.map(f => ({
          name: f.label,
          value: sData?.filter(d => d.fase === f.value).length || 0,
        }))
      )

      // Campagne leads over tijd
      let ctq = supabase.from('campagne_leads').select('created_at').gte('created_at', startDate.toISOString())
      if (tagFilter) ctq = ctq.eq('bedrijf_tag', tagFilter)
      const { data: ctData } = await ctq

      const dailyCounts: Record<string, number> = {}
      ctData?.forEach(d => {
        const day = format(parseISO(d.created_at), 'dd MMM', { locale: nl })
        dailyCounts[day] = (dailyCounts[day] || 0) + 1
      })
      setCampagneOverTijd(Object.entries(dailyCounts).map(([datum, aantal]) => ({ datum, aantal })))

      // Klanten per maand
      let kq = supabase.from('klanten').select('created_at').gte('created_at', subMonths(new Date(), 12).toISOString())
      if (tagFilter) kq = kq.eq('bedrijf_tag', tagFilter)
      const { data: kData } = await kq

      const maandCounts: Record<string, number> = {}
      kData?.forEach(d => {
        const m = format(startOfMonth(parseISO(d.created_at)), 'MMM yyyy', { locale: nl })
        maandCounts[m] = (maandCounts[m] || 0) + 1
      })
      setKlantenPerMaand(Object.entries(maandCounts).map(([maand, aantal]) => ({ maand, aantal })))

      // Taken open vs afgerond
      const { data: tOpen } = await supabase.from('taken').select('created_at').neq('status', 'afgerond').gte('created_at', startDate.toISOString())
      const { data: tDone } = await supabase.from('taken').select('updated_at').eq('status', 'afgerond').gte('updated_at', startDate.toISOString())

      const takenByDay: Record<string, { open: number; afgerond: number }> = {}
      tOpen?.forEach(t => {
        const day = format(parseISO(t.created_at), 'dd MMM', { locale: nl })
        if (!takenByDay[day]) takenByDay[day] = { open: 0, afgerond: 0 }
        takenByDay[day].open++
      })
      tDone?.forEach(t => {
        const day = format(parseISO(t.updated_at), 'dd MMM', { locale: nl })
        if (!takenByDay[day]) takenByDay[day] = { open: 0, afgerond: 0 }
        takenByDay[day].afgerond++
      })
      setTakenData(Object.entries(takenByDay).map(([name, v]) => ({ name, ...v })))

      setLoading(false)
    }
    fetchData()
  }, [supabase, bedrijfFilter, periode])

  return (
    <>
      <PageHeader title="Analyse" description="Grafieken en statistieken">
        <Select value={periode} onValueChange={(v) => setPeriode(v as Periode)}>
          <SelectTrigger className="h-9 text-sm w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="maand">Maand</SelectItem>
            <SelectItem value="kwartaal">Kwartaal</SelectItem>
            <SelectItem value="jaar">Jaar</SelectItem>
          </SelectContent>
        </Select>
        <BedrijfFilter value={bedrijfFilter} onChange={setBedrijfFilter} />
      </PageHeader>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[300px] w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campagne leads per fase — donut */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border border-[#E5E7EB] shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Campagne leads per fase</CardTitle></CardHeader>
              <CardContent>
                {campagneFaseData.length === 0 ? <p className="text-xs text-[#6B7280] py-10 text-center">Geen data</p> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={campagneFaseData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {campagneFaseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Sales leads funnel — bar */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border border-[#E5E7EB] shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Sales funnel per fase</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={salesFaseData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1F8A9B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Campagne leads over tijd — line */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border border-[#E5E7EB] shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Campagne leads over tijd</CardTitle></CardHeader>
              <CardContent>
                {campagneOverTijd.length === 0 ? <p className="text-xs text-[#6B7280] py-10 text-center">Geen data</p> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={campagneOverTijd}>
                      <XAxis dataKey="datum" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="aantal" stroke="#3A6FD8" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Klanten per maand */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border border-[#E5E7EB] shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Nieuwe klanten per maand</CardTitle></CardHeader>
              <CardContent>
                {klantenPerMaand.length === 0 ? <p className="text-xs text-[#6B7280] py-10 text-center">Geen data</p> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={klantenPerMaand}>
                      <XAxis dataKey="maand" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="aantal" fill="#3A6FD8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Taken open vs afgerond */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
            <Card className="border border-[#E5E7EB] shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Taken: open vs. afgerond</CardTitle></CardHeader>
              <CardContent>
                {takenData.length === 0 ? <p className="text-xs text-[#6B7280] py-10 text-center">Geen data</p> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={takenData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="open" fill="#D97706" name="Open" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="afgerond" fill="#059669" name="Afgerond" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </>
  )
}
