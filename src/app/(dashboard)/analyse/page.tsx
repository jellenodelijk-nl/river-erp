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
import type { BedrijfTag, MoneybirdFactuur } from '@/lib/types'
import { motion } from 'framer-motion'
import { formatValuta } from '@/lib/format'
import { subDays, subMonths, subWeeks, format, startOfMonth, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Users, TrendingUp, Megaphone, Receipt, Building2 } from 'lucide-react'

const COLORS = ['#3A6FD8', '#1F8A9B', '#7FA6FF', '#5FBBC7', '#C9D9FF', '#A9DDE4']

type Periode = 'week' | 'maand' | 'kwartaal' | 'jaar'

export default function AnalysePage() {
  const supabase = createClient()
  const [bedrijfFilter, setBedrijfFilter] = useState<BedrijfTag | 'alle'>('alle')
  const [periode, setPeriode] = useState<Periode>('kwartaal')
  const [loading, setLoading] = useState(true)

  const [campagneFaseData, setCampagneFaseData] = useState<{ name: string; value: number }[]>([])
  const [salesFaseData, setSalesFaseData] = useState<{ name: string; value: number }[]>([])
  const [campagneOverTijd, setCampagneOverTijd] = useState<{ datum: string; aantal: number }[]>([])
  const [klantenPerMaand, setKlantenPerMaand] = useState<{ maand: string; aantal: number }[]>([])
  const [takenData, setTakenData] = useState<{ name: string; open: number; afgerond: number }[]>([])

  // Klanten stats
  const [totaalKlanten, setTotaalKlanten] = useState(0)
  const [klantenDigital, setKlantenDigital] = useState(0)
  const [klantenSoftware, setKlantenSoftware] = useState(0)
  const [klantenPerProvincie, setKlantenPerProvincie] = useState<{ name: string; value: number }[]>([])

  // Omzet stats
  const [facturen, setFacturen] = useState<MoneybirdFactuur[]>([])
  const [omzetPerJaar, setOmzetPerJaar] = useState<{ jaar: string; omzet: number }[]>([])
  const [omzetPerMaand, setOmzetPerMaand] = useState<{ maand: string; omzet: number }[]>([])

  const periodeLabel = periode === 'week' ? 'Week' : periode === 'maand' ? 'Maand' : periode === 'kwartaal' ? 'Kwartaal' : 'Jaar'

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
      setCampagneFaseData(CAMPAGNE_FASES.map(f => ({ name: f.label, value: cData?.filter(d => d.fase === f.value).length || 0 })).filter(d => d.value > 0))

      // Sales leads per fase
      let sq = supabase.from('sales_leads').select('fase')
      if (tagFilter) sq = sq.eq('bedrijf_tag', tagFilter)
      const { data: sData } = await sq
      setSalesFaseData(SALES_FASES.map(f => ({ name: f.label, value: sData?.filter(d => d.fase === f.value).length || 0 })))

      // Campagne leads over tijd
      let ctq = supabase.from('campagne_leads').select('created_at').gte('created_at', startDate.toISOString())
      if (tagFilter) ctq = ctq.eq('bedrijf_tag', tagFilter)
      const { data: ctData } = await ctq
      const dailyCounts: Record<string, number> = {}
      ctData?.forEach(d => { const day = format(parseISO(d.created_at), 'dd MMM', { locale: nl }); dailyCounts[day] = (dailyCounts[day] || 0) + 1 })
      setCampagneOverTijd(Object.entries(dailyCounts).map(([datum, aantal]) => ({ datum, aantal })))

      // Klanten
      let kq = supabase.from('klanten').select('created_at, bedrijf_tag, provincie, plaats')
      if (tagFilter) kq = kq.eq('bedrijf_tag', tagFilter)
      const { data: kData } = await kq
      const allKlanten = kData || []

      setTotaalKlanten(allKlanten.length)
      setKlantenDigital(allKlanten.filter(k => k.bedrijf_tag === 'river_digital').length)
      setKlantenSoftware(allKlanten.filter(k => k.bedrijf_tag === 'river_software').length)

      // Klanten per maand
      const maandCounts: Record<string, number> = {}
      allKlanten.forEach(d => {
        const m = format(startOfMonth(parseISO(d.created_at)), 'MMM yyyy', { locale: nl })
        maandCounts[m] = (maandCounts[m] || 0) + 1
      })
      setKlantenPerMaand(Object.entries(maandCounts).map(([maand, aantal]) => ({ maand, aantal })))

      // Klanten per provincie/plaats
      const provCounts: Record<string, number> = {}
      allKlanten.forEach(k => {
        const loc = k.provincie || k.plaats || 'Onbekend'
        if (loc) provCounts[loc] = (provCounts[loc] || 0) + 1
      })
      setKlantenPerProvincie(
        Object.entries(provCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
      )

      // Taken
      const { data: tOpen } = await supabase.from('taken').select('created_at').neq('status', 'afgerond').gte('created_at', startDate.toISOString())
      const { data: tDone } = await supabase.from('taken').select('updated_at').eq('status', 'afgerond').gte('updated_at', startDate.toISOString())
      const takenByDay: Record<string, { open: number; afgerond: number }> = {}
      tOpen?.forEach(t => { const day = format(parseISO(t.created_at), 'dd MMM', { locale: nl }); if (!takenByDay[day]) takenByDay[day] = { open: 0, afgerond: 0 }; takenByDay[day].open++ })
      tDone?.forEach(t => { const day = format(parseISO(t.updated_at), 'dd MMM', { locale: nl }); if (!takenByDay[day]) takenByDay[day] = { open: 0, afgerond: 0 }; takenByDay[day].afgerond++ })
      setTakenData(Object.entries(takenByDay).map(([name, v]) => ({ name, ...v })))

      // Facturen / omzet
      try {
        const res = await fetch('/api/moneybird/facturen')
        if (res.ok) {
          const fData: MoneybirdFactuur[] = await res.json()
          setFacturen(fData)
          const betaald = fData.filter(f => f.status === 'paid')

          // Omzet per jaar
          const jaarMap: Record<string, number> = {}
          betaald.forEach(f => { const j = f.datum?.slice(0, 4); if (j) jaarMap[j] = (jaarMap[j] || 0) + f.totaal })
          setOmzetPerJaar(Object.entries(jaarMap).sort(([a], [b]) => a.localeCompare(b)).map(([jaar, omzet]) => ({ jaar, omzet })))

          // Omzet per maand (laatste 12 maanden)
          const maandMap: Record<string, number> = {}
          const maandNamen = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
          betaald.forEach(f => {
            const d = f.datum ? parseISO(f.datum) : null
            if (d && d > subMonths(new Date(), 12)) {
              const label = `${maandNamen[d.getMonth()]} ${d.getFullYear()}`
              maandMap[label] = (maandMap[label] || 0) + f.totaal
            }
          })
          setOmzetPerMaand(Object.entries(maandMap).map(([maand, omzet]) => ({ maand, omzet })))
        }
      } catch { /* ignore */ }

      setLoading(false)
    }
    fetchData()
  }, [supabase, bedrijfFilter, periode])

  const totaalOmzet = facturen.filter(f => f.status === 'paid').reduce((a, b) => a + b.totaal, 0)
  const openstaand = facturen.filter(f => f.status !== 'paid').reduce((a, b) => a + b.totaal, 0)

  function ChartCard({ title, icon: Icon, children, delay = 0, span = false }: { title: string; icon: React.ElementType; children: React.ReactNode; delay?: number; span?: boolean }) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className={span ? 'lg:col-span-2' : ''}>
        <Card className="card-base overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
            <CardTitle className="section-header flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" /> {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">{children}</CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <>
      <PageHeader title="Analyse" description="Statistieken en grafieken">
        <Select value={periode} onValueChange={(v) => setPeriode((v ?? 'kwartaal') as Periode)}>
          <SelectTrigger className="h-9 text-sm w-[130px]">{periodeLabel}</SelectTrigger>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[280px] rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* KPI's */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Klanten', value: totaalKlanten, sub: `${klantenDigital} Digital · ${klantenSoftware} Software`, icon: Building2, color: '#3A6FD8' },
              { label: 'Totale omzet', value: formatValuta(totaalOmzet), sub: `${facturen.filter(f => f.status === 'paid').length} facturen`, icon: Receipt, color: '#059669' },
              { label: 'Openstaand', value: formatValuta(openstaand), sub: `${facturen.filter(f => f.status !== 'paid').length} facturen`, icon: TrendingUp, color: '#D97706' },
              { label: 'Sales leads', value: salesFaseData.reduce((a, b) => a + b.value, 0), sub: 'actieve pipeline', icon: Megaphone, color: '#1F8A9B' },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="card-base">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                        <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                      </div>
                    </div>
                    <p className="text-xl font-semibold text-foreground">{kpi.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{kpi.sub}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Omzet per jaar */}
            <ChartCard title="Omzet per jaar" icon={Receipt} delay={0.05}>
              {omzetPerJaar.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">Geen data</p> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={omzetPerJaar}>
                    <XAxis dataKey="jaar" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatValuta(Number(v))} />
                    <Bar dataKey="omzet" fill="#3A6FD8" radius={[4, 4, 0, 0]} name="Omzet" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Omzet per maand */}
            <ChartCard title="Omzet per maand (12m)" icon={TrendingUp} delay={0.1}>
              {omzetPerMaand.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">Geen data</p> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={omzetPerMaand}>
                    <XAxis dataKey="maand" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatValuta(Number(v))} />
                    <Line type="monotone" dataKey="omzet" stroke="#1F8A9B" strokeWidth={2} dot={{ r: 3 }} name="Omzet" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Klanten per maand */}
            <ChartCard title="Nieuwe klanten per maand" icon={Building2} delay={0.15}>
              {klantenPerMaand.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">Geen data</p> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={klantenPerMaand}>
                    <XAxis dataKey="maand" tick={{ fontSize: 9 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="aantal" fill="#3A6FD8" radius={[4, 4, 0, 0]} name="Klanten" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Klanten per locatie */}
            <ChartCard title="Klanten per locatie (top 10)" icon={Users} delay={0.2}>
              {klantenPerProvincie.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">Geen data</p> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={klantenPerProvincie} layout="vertical">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1F8A9B" radius={[0, 4, 4, 0]} name="Klanten" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Campagne leads per fase */}
            <ChartCard title="Campagne leads per fase" icon={Megaphone} delay={0.25}>
              {campagneFaseData.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">Geen data</p> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={campagneFaseData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {campagneFaseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Sales funnel */}
            <ChartCard title="Sales funnel" icon={TrendingUp} delay={0.3}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salesFaseData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1F8A9B" radius={[0, 4, 4, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Taken open vs afgerond */}
            <ChartCard title="Taken: open vs. afgerond" icon={Users} delay={0.35} span>
              {takenData.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">Geen data</p> : (
                <ResponsiveContainer width="100%" height={200}>
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
            </ChartCard>
          </div>
        </>
      )}
    </>
  )
}
