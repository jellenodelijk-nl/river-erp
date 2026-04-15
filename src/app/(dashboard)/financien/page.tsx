'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/page-header'
import { BedrijfFilter } from '@/components/bedrijf-filter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DollarSign, AlertCircle, Clock, CheckCircle, TrendingUp, FileText, Calendar } from 'lucide-react'
import { formatDatum, formatValuta } from '@/lib/format'
import { motion } from 'framer-motion'
import type { BedrijfTag, MoneybirdFactuur } from '@/lib/types'

export default function FinancienPage() {
  const supabase = createClient()
  const [facturen, setFacturen] = useState<MoneybirdFactuur[]>([])
  const [loading, setLoading] = useState(true)
  const [bedrijfFilter, setBedrijfFilter] = useState<BedrijfTag | 'alle'>('alle')
  const [klanten, setKlanten] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch('/api/moneybird/facturen')
        if (res.ok) setFacturen(await res.json())
      } catch { /* ignore */ }

      // Fetch klanten for names
      const { data } = await supabase.from('klanten').select('moneybird_id, naam, bedrijf')
      const map: Record<string, string> = {}
      data?.forEach(k => { if (k.moneybird_id) map[k.moneybird_id] = k.bedrijf || k.naam })
      setKlanten(map)

      setLoading(false)
    }
    fetchData()
  }, [supabase])

  // Categorize
  const openstaand = facturen.filter(f => f.status !== 'paid' && f.status !== 'late')
  const teLaat = facturen.filter(f => f.status === 'late')
  const betaald = facturen.filter(f => f.status === 'paid')

  const totaalOpen = openstaand.reduce((a, b) => a + b.totaal, 0)
  const totaalTeLaat = teLaat.reduce((a, b) => a + b.totaal, 0)
  const totaalBetaald = betaald.reduce((a, b) => a + b.totaal, 0)
  const totaalAlles = facturen.reduce((a, b) => a + b.totaal, 0)

  // Per jaar
  const omzetPerJaar: Record<string, number> = {}
  betaald.forEach(f => {
    const jaar = f.datum?.slice(0, 4)
    if (jaar) omzetPerJaar[jaar] = (omzetPerJaar[jaar] || 0) + f.totaal
  })
  const jaarKeys = Object.keys(omzetPerJaar).sort().reverse()

  // Per maand (huidig jaar)
  const huidigJaar = new Date().getFullYear().toString()
  const omzetPerMaand: Record<string, number> = {}
  const maandNamen = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
  betaald.filter(f => f.datum?.startsWith(huidigJaar)).forEach(f => {
    const maand = parseInt(f.datum?.slice(5, 7)) - 1
    const label = maandNamen[maand]
    if (label) omzetPerMaand[label] = (omzetPerMaand[label] || 0) + f.totaal
  })

  const metrics = [
    { title: 'Openstaand', value: totaalOpen, count: openstaand.length, icon: Clock, color: '#D97706', bg: '#FEF3C7' },
    { title: 'Te laat', value: totaalTeLaat, count: teLaat.length, icon: AlertCircle, color: '#EF4444', bg: '#FEE2E2' },
    { title: 'Betaald', value: totaalBetaald, count: betaald.length, icon: CheckCircle, color: '#059669', bg: '#D1FAE5' },
    { title: 'Totaal', value: totaalAlles, count: facturen.length, icon: DollarSign, color: '#3A6FD8', bg: '#C9D9FF' },
  ]

  function FactuurRij({ f }: { f: MoneybirdFactuur }) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-[#F4F6F7]/50 hover:bg-[#F0F4FF]/30 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${f.status === 'paid' ? 'bg-green-500' : f.status === 'late' ? 'bg-red-500' : 'bg-yellow-500'}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium font-mono text-[#0B0D0E]">{f.factuurnummer}</span>
              <span className="text-xs text-[#9CA3AF]">{formatDatum(f.datum)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs text-[#9CA3AF]">Vervalt {formatDatum(f.vervaldatum)}</span>
          <span className="text-sm font-semibold text-[#0B0D0E] w-24 text-right">{formatValuta(f.totaal)}</span>
          <Badge className={`text-[10px] w-16 justify-center ${
            f.status === 'paid' ? 'bg-green-100 text-green-800' :
            f.status === 'late' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {f.status === 'paid' ? 'Betaald' : f.status === 'late' ? 'Te laat' : 'Open'}
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Financiën" description="Facturatieoverzicht via Moneybird">
        <BedrijfFilter value={bedrijfFilter} onChange={setBedrijfFilter} />
      </PageHeader>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : facturen.length === 0 ? (
        <Card className="border border-[#E5E7EB] shadow-sm rounded-xl">
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-[#D1D5DB] mx-auto mb-3" />
            <p className="text-[#6B7280]">Geen facturen gevonden</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Controleer of MONEYBIRD_API_TOKEN en MONEYBIRD_ADMINISTRATION_ID correct zijn ingesteld in Vercel</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metrics.map((m, i) => (
              <motion.div key={m.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: m.bg }}>
                        <m.icon className="w-5 h-5" style={{ color: m.color }} />
                      </div>
                      <span className="text-xs text-[#9CA3AF]">{m.count} facturen</span>
                    </div>
                    <p className="text-2xl font-semibold text-[#0B0D0E]">{formatValuta(m.value)}</p>
                    <p className="text-xs text-[#6B7280] mt-1">{m.title}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Omzet per jaar */}
          {jaarKeys.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
              <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="pb-2 bg-gradient-to-r from-[#FAFBFC] to-white border-b border-[#E5E7EB]/50">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#3A6FD8]" /> Omzet per jaar
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {jaarKeys.map(jaar => (
                      <div key={jaar} className="p-3 rounded-lg bg-gradient-to-br from-[#F0F4FF] to-[#F4F6F7]">
                        <p className="text-[11px] font-medium text-[#9CA3AF] uppercase">{jaar}</p>
                        <p className="text-lg font-semibold text-[#0B0D0E] mt-1">{formatValuta(omzetPerJaar[jaar])}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Omzet per maand huidig jaar */}
          {Object.keys(omzetPerMaand).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-6">
              <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="pb-2 bg-gradient-to-r from-[#FAFBFC] to-white border-b border-[#E5E7EB]/50">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#1F8A9B]" /> Omzet per maand ({huidigJaar})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-2">
                    {maandNamen.map(m => (
                      <div key={m} className={`p-2 rounded-lg text-center ${omzetPerMaand[m] ? 'bg-gradient-to-br from-[#F0F4FF] to-[#F0FAFB]' : 'bg-[#F4F6F7]/30'}`}>
                        <p className="text-[10px] font-medium text-[#9CA3AF]">{m}</p>
                        <p className={`text-xs font-semibold mt-1 ${omzetPerMaand[m] ? 'text-[#0B0D0E]' : 'text-[#D1D5DB]'}`}>
                          {omzetPerMaand[m] ? formatValuta(omzetPerMaand[m]) : '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Facturen tabs */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-0">
                <Tabs defaultValue={teLaat.length > 0 ? 'telaat' : openstaand.length > 0 ? 'open' : 'alle'}>
                  <div className="border-b border-[#E5E7EB]/50 px-4 pt-3">
                    <TabsList className="bg-transparent gap-0 h-auto p-0">
                      {teLaat.length > 0 && (
                        <TabsTrigger value="telaat" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:text-red-600 px-4 pb-2.5 text-xs font-medium">
                          Te laat ({teLaat.length})
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="open" className="rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:text-yellow-700 px-4 pb-2.5 text-xs font-medium">
                        Openstaand ({openstaand.length})
                      </TabsTrigger>
                      <TabsTrigger value="betaald" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:text-green-700 px-4 pb-2.5 text-xs font-medium">
                        Betaald ({betaald.length})
                      </TabsTrigger>
                      <TabsTrigger value="alle" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#3A6FD8] data-[state=active]:text-[#3A6FD8] px-4 pb-2.5 text-xs font-medium">
                        Alle ({facturen.length})
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {teLaat.length > 0 && (
                    <TabsContent value="telaat" className="p-4 space-y-2 mt-0">
                      {teLaat.map(f => <FactuurRij key={f.id} f={f} />)}
                      <div className="flex justify-end pt-2 border-t border-[#E5E7EB]/50 mt-3">
                        <span className="text-sm font-semibold text-red-600">Totaal: {formatValuta(totaalTeLaat)}</span>
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="open" className="p-4 space-y-2 mt-0">
                    {openstaand.length === 0 ? (
                      <p className="text-sm text-[#9CA3AF] text-center py-6">Geen openstaande facturen</p>
                    ) : (
                      <>
                        {openstaand.map(f => <FactuurRij key={f.id} f={f} />)}
                        <div className="flex justify-end pt-2 border-t border-[#E5E7EB]/50 mt-3">
                          <span className="text-sm font-semibold text-yellow-700">Totaal: {formatValuta(totaalOpen)}</span>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="betaald" className="p-4 space-y-2 mt-0">
                    {betaald.slice(0, 50).map(f => <FactuurRij key={f.id} f={f} />)}
                    {betaald.length > 50 && <p className="text-xs text-[#9CA3AF] text-center pt-2">Eerste 50 van {betaald.length} getoond</p>}
                    <div className="flex justify-end pt-2 border-t border-[#E5E7EB]/50 mt-3">
                      <span className="text-sm font-semibold text-green-700">Totaal: {formatValuta(totaalBetaald)}</span>
                    </div>
                  </TabsContent>

                  <TabsContent value="alle" className="p-4 space-y-2 mt-0">
                    {facturen.slice(0, 100).map(f => <FactuurRij key={f.id} f={f} />)}
                    {facturen.length > 100 && <p className="text-xs text-[#9CA3AF] text-center pt-2">Eerste 100 van {facturen.length} getoond</p>}
                    <div className="flex justify-end pt-2 border-t border-[#E5E7EB]/50 mt-3">
                      <span className="text-sm font-semibold">Totaal: {formatValuta(totaalAlles)}</span>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </>
  )
}
