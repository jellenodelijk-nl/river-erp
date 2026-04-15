'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { BedrijfFilter } from '@/components/bedrijf-filter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { CAMPAGNE_FASES, SALES_FASES } from '@/lib/types'
import type { BedrijfTag, MoneybirdFactuur, Klant } from '@/lib/types'
import { motion } from 'framer-motion'
import { formatDatum, formatValuta } from '@/lib/format'
import { subMonths, format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Users, TrendingUp, Megaphone, Receipt, Building2, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const COLORS = ['#3A6FD8', '#1F8A9B', '#7FA6FF', '#5FBBC7', '#C9D9FF', '#A9DDE4']

interface KlantAnalyse {
  id: string
  naam: string
  bedrijf: string
  plaats: string | null
  bedrijf_tag: BedrijfTag
  klant_sinds: string | null
  totale_omzet: number
  aantal_facturen: number
  omzet_per_jaar: Record<string, number>
}

export default function AnalysePage() {
  const supabase = createClient()
  const router = useRouter()
  const [bedrijfFilter, setBedrijfFilter] = useState<BedrijfTag | 'alle'>('alle')
  const [loading, setLoading] = useState(true)

  // Raw data
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [facturen, setFacturen] = useState<MoneybirdFactuur[]>([])
  const [campagneLeads, setCampagneLeads] = useState<{ fase: string }[]>([])
  const [salesLeads, setSalesLeads] = useState<{ fase: string }[]>([])

  // Detail popup
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTitle, setDetailTitle] = useState('')
  const [detailItems, setDetailItems] = useState<{ id: string; naam: string; extra: string }[]>([])

  // Klanten tabel
  const [klantZoek, setKlantZoek] = useState('')
  const [sortField, setSortField] = useState<string>('totale_omzet')
  const [sortAsc, setSortAsc] = useState(false)
  const [jaarOffset, setJaarOffset] = useState(0) // 0 = meest recent
  const [tabelPagina, setTabelPagina] = useState(0)
  const PAGINA_SIZE = 25

  // Load all data in parallel
  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [klantenRes, facturenRes, campagneRes, salesRes] = await Promise.all([
        supabase.from('klanten').select('*'),
        fetch('/api/moneybird/facturen').then(r => r.ok ? r.json() : []).catch(() => []),
        supabase.from('campagne_leads').select('fase, bedrijf_tag'),
        supabase.from('sales_leads').select('fase, bedrijf_tag'),
      ])
      setKlanten(klantenRes.data || [])
      setFacturen(facturenRes)
      setCampagneLeads(campagneRes.data || [])
      setSalesLeads(salesRes.data || [])
      setLoading(false)
    }
    fetchAll()
  }, [supabase])

  // Build klant analyse from facturen
  const klantAnalyse = useMemo<KlantAnalyse[]>(() => {
    // Map facturen by contact_id → moneybird_id
    const factuurPerContact: Record<string, MoneybirdFactuur[]> = {}
    facturen.forEach(f => {
      const cid = f.contact_id
      if (cid) {
        if (!factuurPerContact[cid]) factuurPerContact[cid] = []
        factuurPerContact[cid].push(f)
      }
    })

    return klanten.map(k => {
      const kFacturen = k.moneybird_id ? (factuurPerContact[k.moneybird_id] || []) : []
      const betaald = kFacturen.filter(f => f.status === 'paid')
      const totale_omzet = betaald.reduce((a, b) => a + b.totaal, 0)

      // Klant sinds = earliest factuur date
      const earliestFactuur = kFacturen.length > 0
        ? kFacturen.reduce((oldest, f) => (f.datum && f.datum < oldest) ? f.datum : oldest, kFacturen[0]?.datum || '')
        : null

      // Omzet per jaar
      const omzet_per_jaar: Record<string, number> = {}
      betaald.forEach(f => {
        const j = f.datum?.slice(0, 4)
        if (j) omzet_per_jaar[j] = (omzet_per_jaar[j] || 0) + f.totaal
      })

      return {
        id: k.id,
        naam: k.naam,
        bedrijf: k.bedrijf,
        plaats: k.plaats,
        bedrijf_tag: k.bedrijf_tag,
        klant_sinds: earliestFactuur,
        totale_omzet,
        aantal_facturen: kFacturen.length,
        omzet_per_jaar,
      }
    })
  }, [klanten, facturen])

  // Filtered data
  const filteredKlanten = useMemo(() => {
    let list = bedrijfFilter !== 'alle' ? klantAnalyse.filter(k => k.bedrijf_tag === bedrijfFilter) : klantAnalyse
    if (klantZoek) {
      const s = klantZoek.toLowerCase()
      list = list.filter(k => k.naam.toLowerCase().includes(s) || k.bedrijf.toLowerCase().includes(s))
    }
    list.sort((a, b) => {
      let av: string | number, bv: string | number
      if (sortField === 'naam') { av = a.naam.toLowerCase(); bv = b.naam.toLowerCase() }
      else if (sortField === 'klant_sinds') { av = a.klant_sinds || 'zzz'; bv = b.klant_sinds || 'zzz' }
      else if (sortField.match(/^\d{4}$/)) { av = a.omzet_per_jaar[sortField] || 0; bv = b.omzet_per_jaar[sortField] || 0 }
      else if (sortField === 'totale_omzet') { av = a.totale_omzet; bv = b.totale_omzet }
      else if (sortField === 'aantal_facturen') { av = a.aantal_facturen; bv = b.aantal_facturen }
      else { av = 0; bv = 0 }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })
    return list
  }, [klantAnalyse, bedrijfFilter, klantZoek, sortField, sortAsc])

  const filteredCampagne = bedrijfFilter !== 'alle' ? campagneLeads.filter((l: Record<string, unknown>) => l.bedrijf_tag === bedrijfFilter) : campagneLeads
  const filteredSales = bedrijfFilter !== 'alle' ? salesLeads.filter((l: Record<string, unknown>) => l.bedrijf_tag === bedrijfFilter) : salesLeads
  const filteredFacturen = facturen // facturen don't have bedrijf_tag

  // Derived chart data
  const betaaldeFacturen = filteredFacturen.filter(f => f.status === 'paid')
  const totaalOmzet = betaaldeFacturen.reduce((a, b) => a + b.totaal, 0)
  const openstaand = filteredFacturen.filter(f => f.status !== 'paid').reduce((a, b) => a + b.totaal, 0)

  // Omzet per jaar
  const omzetPerJaar = useMemo(() => {
    const map: Record<string, number> = {}
    betaaldeFacturen.forEach(f => { const j = f.datum?.slice(0, 4); if (j) map[j] = (map[j] || 0) + f.totaal })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([jaar, omzet]) => ({ jaar, omzet }))
  }, [betaaldeFacturen])

  // Omzet per maand YTD vergelijking per jaar
  const maandLabels = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
  const omzetYTD = useMemo(() => {
    // Group by year and month
    const perJaarMaand: Record<string, Record<number, number>> = {}
    betaaldeFacturen.forEach(f => {
      if (!f.datum) return
      const jaar = f.datum.slice(0, 4)
      const maand = parseInt(f.datum.slice(5, 7)) - 1 // 0-indexed
      if (!perJaarMaand[jaar]) perJaarMaand[jaar] = {}
      perJaarMaand[jaar][maand] = (perJaarMaand[jaar][maand] || 0) + f.totaal
    })

    const jaren = Object.keys(perJaarMaand).sort().reverse().slice(0, 4) // Max 4 jaren
    const huidigeMaand = new Date().getMonth()

    // Build chart data: one row per month, one key per year
    const data = maandLabels.map((label, i) => {
      const row: Record<string, string | number> = { maand: label }
      jaren.forEach(jaar => {
        // For current year, only show up to current month
        const isHuidigJaar = jaar === String(new Date().getFullYear())
        if (isHuidigJaar && i > huidigeMaand) return
        row[jaar] = perJaarMaand[jaar]?.[i] || 0
      })
      return row
    })

    return { data, jaren }
  }, [betaaldeFacturen])

  // Nieuwe klanten per maand (based on earliest factuur)
  const nieuweKlantenPerMaand = useMemo(() => {
    const map: Record<string, KlantAnalyse[]> = {}
    klantAnalyse.forEach(k => {
      if (!k.klant_sinds) return
      if (bedrijfFilter !== 'alle' && k.bedrijf_tag !== bedrijfFilter) return
      const label = format(parseISO(k.klant_sinds), 'MMM yy', { locale: nl })
      if (!map[label]) map[label] = []
      map[label].push(k)
    })
    return { chart: Object.entries(map).map(([maand, items]) => ({ maand, aantal: items.length })), detail: map }
  }, [klantAnalyse, bedrijfFilter])

  // Klanten per locatie
  const klantenPerLocatie = useMemo(() => {
    const fk = bedrijfFilter !== 'alle' ? klanten.filter(k => k.bedrijf_tag === bedrijfFilter) : klanten
    const map: Record<string, Klant[]> = {}
    fk.forEach(k => {
      const loc = k.plaats || 'Onbekend'
      if (!map[loc]) map[loc] = []
      map[loc].push(k)
    })
    return {
      chart: Object.entries(map).map(([name, items]) => ({ name, value: items.length })).sort((a, b) => b.value - a.value).slice(0, 10),
      detail: map,
    }
  }, [klanten, bedrijfFilter])

  const campagneFaseData = CAMPAGNE_FASES.map(f => ({ name: f.label, value: filteredCampagne.filter(d => d.fase === f.value).length })).filter(d => d.value > 0)
  const salesFaseData = SALES_FASES.map(f => ({ name: f.label, value: filteredSales.filter(d => d.fase === f.value).length }))

  // Alle unieke jaren voor klant tabel
  const alleJaren = useMemo(() => {
    const set = new Set<string>()
    klantAnalyse.forEach(k => Object.keys(k.omzet_per_jaar).forEach(j => set.add(j)))
    return Array.from(set).sort().reverse()
  }, [klantAnalyse])

  function showDetail(title: string, items: { id: string; naam: string; extra: string }[]) {
    setDetailTitle(title)
    setDetailItems(items)
    setDetailOpen(true)
  }

  function handleSort(field: string) {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
    setTabelPagina(0)
  }

  function SortHeader({ field, children }: { field: string; children: React.ReactNode }) {
    return (
      <button onClick={() => handleSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
        {children}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-primary' : 'text-muted-foreground/40'}`} />
      </button>
    )
  }

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
        <BedrijfFilter value={bedrijfFilter} onChange={setBedrijfFilter} />
      </PageHeader>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[260px] rounded-xl" />)}</div>
        </div>
      ) : (
        <>
          {/* KPI's */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Klanten', value: String(filteredKlanten.length), sub: `${klantAnalyse.filter(k=>k.bedrijf_tag==='river_digital').length} Digital · ${klantAnalyse.filter(k=>k.bedrijf_tag==='river_software').length} Software`, icon: Building2, color: '#3A6FD8' },
              { label: 'Totale omzet', value: formatValuta(totaalOmzet), sub: `${betaaldeFacturen.length} betaalde facturen`, icon: Receipt, color: '#059669' },
              { label: 'Openstaand', value: formatValuta(openstaand), sub: `${filteredFacturen.filter(f => f.status !== 'paid').length} facturen`, icon: TrendingUp, color: '#D97706' },
              { label: 'Sales pipeline', value: String(filteredSales.length), sub: `${filteredSales.filter(l => l.fase === 'akkoord').length} akkoord`, icon: Megaphone, color: '#1F8A9B' },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="card-base"><CardContent className="p-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${kpi.color}12` }}>
                    <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                  </div>
                  <p className="text-xl font-semibold text-foreground">{kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                  <p className="text-[10px] text-muted-foreground/60">{kpi.sub}</p>
                </CardContent></Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            {/* Omzet per jaar */}
            <ChartCard title="Omzet per jaar" icon={Receipt} delay={0.05}>
              {omzetPerJaar.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">Geen data</p> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={omzetPerJaar}>
                    <XAxis dataKey="jaar" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatValuta(Number(v))} />
                    <Bar dataKey="omzet" fill="#3A6FD8" radius={[4, 4, 0, 0]} name="Omzet" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Omzet per maand YTD vergelijking */}
            <ChartCard title="Omzet per maand — YTD vergelijking" icon={TrendingUp} delay={0.1}>
              {omzetYTD.jaren.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">Geen data</p> : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={omzetYTD.data}>
                    <XAxis dataKey="maand" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatValuta(Number(v))} />
                    <Legend />
                    {omzetYTD.jaren.map((jaar, i) => (
                      <Line
                        key={jaar}
                        type="monotone"
                        dataKey={jaar}
                        name={jaar}
                        stroke={['#3A6FD8', '#1F8A9B', '#7FA6FF', '#5FBBC7'][i]}
                        strokeWidth={i === 0 ? 2.5 : 1.5}
                        strokeDasharray={i === 0 ? undefined : '5 3'}
                        dot={i === 0 ? { r: 3 } : false}
                        opacity={i === 0 ? 1 : 0.6}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Nieuwe klanten per maand — klikbaar */}
            <ChartCard title="Nieuwe klanten per maand (op basis van eerste factuur)" icon={Building2} delay={0.15}>
              {nieuweKlantenPerMaand.chart.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">Geen data</p> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={nieuweKlantenPerMaand.chart} onClick={(e) => {
                    if (e?.activeLabel) {
                      const items = nieuweKlantenPerMaand.detail[e.activeLabel] || []
                      showDetail(`Nieuwe klanten — ${e.activeLabel}`, items.map(k => ({ id: k.id, naam: k.naam, extra: k.bedrijf })))
                    }
                  }} style={{ cursor: 'pointer' }}>
                    <XAxis dataKey="maand" tick={{ fontSize: 9 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="aantal" fill="#3A6FD8" radius={[4, 4, 0, 0]} name="Klanten" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <p className="text-[10px] text-muted-foreground/50 mt-1 text-center">Klik op een balk om klanten te zien</p>
            </ChartCard>

            {/* Klanten per locatie — klikbaar */}
            <ChartCard title="Klanten per locatie (top 10)" icon={Users} delay={0.2}>
              {klantenPerLocatie.chart.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">Geen data</p> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={klantenPerLocatie.chart} layout="vertical" onClick={(e) => {
                    if (e?.activeLabel) {
                      const items = klantenPerLocatie.detail[e.activeLabel] || []
                      showDetail(`Klanten in ${e.activeLabel}`, items.map(k => ({ id: k.id, naam: k.naam, extra: k.bedrijf })))
                    }
                  }} style={{ cursor: 'pointer' }}>
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1F8A9B" radius={[0, 4, 4, 0]} name="Klanten" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <p className="text-[10px] text-muted-foreground/50 mt-1 text-center">Klik op een balk om klanten te zien</p>
            </ChartCard>

            {/* Campagne & Sales */}
            <ChartCard title="Campagne leads per fase" icon={Megaphone} delay={0.25}>
              {campagneFaseData.length === 0 ? <p className="text-xs text-muted-foreground py-10 text-center">Geen data</p> : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={campagneFaseData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {campagneFaseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Sales funnel" icon={TrendingUp} delay={0.3}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={salesFaseData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1F8A9B" radius={[0, 4, 4, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Klanten analyse tabel */}
          {(() => {
            const zichtbareJaren = alleJaren.slice(jaarOffset, jaarOffset + 4)
            const kanLinks = jaarOffset + 4 < alleJaren.length
            const kanRechts = jaarOffset > 0
            const totalPages = Math.ceil(filteredKlanten.length / PAGINA_SIZE)
            const paginatedKlanten = filteredKlanten.slice(tabelPagina * PAGINA_SIZE, (tabelPagina + 1) * PAGINA_SIZE)

            return (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <Card className="card-base overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="section-header flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" /> Klanten analyse
                      <Badge className="bg-primary/10 text-primary text-[10px] ml-1">{filteredKlanten.length}</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {/* Jaar navigatie */}
                      {alleJaren.length > 4 && (
                        <div className="flex items-center gap-1 border border-border rounded-lg px-1">
                          <button onClick={() => { setJaarOffset(o => Math.min(o + 1, alleJaren.length - 4)) }} disabled={!kanLinks}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] text-muted-foreground px-1">{zichtbareJaren[zichtbareJaren.length-1]}–{zichtbareJaren[0]}</span>
                          <button onClick={() => { setJaarOffset(o => Math.max(o - 1, 0)) }} disabled={!kanRechts}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                        <Input value={klantZoek} onChange={e => { setKlantZoek(e.target.value); setTabelPagina(0) }} placeholder="Zoek klant..." className="pl-8 h-8 text-xs w-[160px]" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/10">
                            <TableHead className="text-[11px] font-semibold"><SortHeader field="naam">Klant</SortHeader></TableHead>
                            <TableHead className="text-[11px] font-semibold"><SortHeader field="klant_sinds">Klant sinds</SortHeader></TableHead>
                            <TableHead className="text-[11px] font-semibold text-right"><SortHeader field="totale_omzet">Totale omzet</SortHeader></TableHead>
                            <TableHead className="text-[11px] font-semibold text-right"><SortHeader field="aantal_facturen">Facturen</SortHeader></TableHead>
                            {zichtbareJaren.map(j => (
                              <TableHead key={j} className="text-[11px] font-semibold text-right hidden lg:table-cell">
                                <SortHeader field={j}>{j}</SortHeader>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedKlanten.map(k => (
                            <TableRow key={k.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push(`/klanten/${k.id}`)}>
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{k.naam}</p>
                                  {k.bedrijf && k.bedrijf !== k.naam && <p className="text-[11px] text-muted-foreground">{k.bedrijf}</p>}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{k.klant_sinds ? formatDatum(k.klant_sinds) : '-'}</TableCell>
                              <TableCell className="text-sm font-semibold text-right">{k.totale_omzet > 0 ? formatValuta(k.totale_omzet) : '-'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground text-right">{k.aantal_facturen || '-'}</TableCell>
                              {zichtbareJaren.map(j => (
                                <TableCell key={j} className="text-xs text-right hidden lg:table-cell">
                                  {k.omzet_per_jaar[j] ? formatValuta(k.omzet_per_jaar[j]) : <span className="text-muted-foreground/30">-</span>}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                          {filteredKlanten.length === 0 && (
                            <TableRow><TableCell colSpan={4 + zichtbareJaren.length} className="text-center text-sm text-muted-foreground py-8">Geen klanten gevonden</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Paginatie */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-muted/10">
                        <p className="text-[11px] text-muted-foreground">
                          {tabelPagina * PAGINA_SIZE + 1}–{Math.min((tabelPagina + 1) * PAGINA_SIZE, filteredKlanten.length)} van {filteredKlanten.length}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={tabelPagina === 0} onClick={() => setTabelPagina(p => p - 1)}>
                            Vorige
                          </Button>
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(tabelPagina - 2, totalPages - 5)) + i
                            return (
                              <Button key={pageNum} variant={pageNum === tabelPagina ? 'default' : 'outline'} size="sm"
                                className={`h-7 w-7 text-xs p-0 ${pageNum === tabelPagina ? 'bg-primary text-white' : ''}`}
                                onClick={() => setTabelPagina(pageNum)}>
                                {pageNum + 1}
                              </Button>
                            )
                          })}
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={tabelPagina >= totalPages - 1} onClick={() => setTabelPagina(p => p + 1)}>
                            Volgende
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })()}
        </>
      )}

      {/* Detail popup — klikbare charts */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:!max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detailTitle}</DialogTitle></DialogHeader>
          <div className="space-y-1 py-2">
            {detailItems.map(item => (
              <Link key={item.id} href={`/klanten/${item.id}`} onClick={() => setDetailOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.naam}</p>
                  <p className="text-[11px] text-muted-foreground">{item.extra}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Bekijk</Badge>
              </Link>
            ))}
            {detailItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Geen items</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
