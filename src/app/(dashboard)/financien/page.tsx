'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { BedrijfFilter } from '@/components/bedrijf-filter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DollarSign, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import { formatDatum, formatValuta } from '@/lib/format'
import { motion } from 'framer-motion'
import type { BedrijfTag, MoneybirdFactuur } from '@/lib/types'

export default function FinancienPage() {
  const [facturen, setFacturen] = useState<MoneybirdFactuur[]>([])
  const [loading, setLoading] = useState(true)
  const [bedrijfFilter, setBedrijfFilter] = useState<BedrijfTag | 'alle'>('alle')

  useEffect(() => {
    async function fetchFacturen() {
      setLoading(true)
      try {
        const res = await fetch('/api/moneybird/facturen')
        if (res.ok) setFacturen(await res.json())
      } catch { /* ignore */ }
      setLoading(false)
    }
    fetchFacturen()
  }, [])

  const openstaand = facturen.filter(f => f.status !== 'paid')
  const betaald = facturen.filter(f => f.status === 'paid')
  const telaat = facturen.filter(f => f.status === 'late')

  const totaalOpen = openstaand.reduce((a, b) => a + b.totaal, 0)
  const totaalBetaald = betaald.reduce((a, b) => a + b.totaal, 0)
  const totaalTeLaat = telaat.reduce((a, b) => a + b.totaal, 0)

  const metrics = [
    { title: 'Totaal openstaand', value: totaalOpen, icon: Clock, color: '#D97706', bg: '#FEF3C7' },
    { title: 'Totaal betaald', value: totaalBetaald, icon: CheckCircle, color: '#059669', bg: '#D1FAE5' },
    { title: 'Te laat', value: totaalTeLaat, icon: AlertCircle, color: '#EF4444', bg: '#FEE2E2' },
    { title: 'Totaal facturen', value: facturen.length, icon: DollarSign, color: '#3A6FD8', bg: '#C9D9FF', isCount: true },
  ]

  return (
    <>
      <PageHeader title="Financiën" description="Facturatieoverzicht via Moneybird">
        <BedrijfFilter value={bedrijfFilter} onChange={setBedrijfFilter} />
      </PageHeader>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((m, i) => (
          <motion.div key={m.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border border-[#E5E7EB] shadow-sm">
              <CardContent className="p-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: m.bg }}>
                  <m.icon className="w-5 h-5" style={{ color: m.color }} />
                </div>
                {loading ? <Skeleton className="h-8 w-20" /> : (
                  <p className="text-2xl font-semibold text-[#0B0D0E]">
                    {'isCount' in m ? m.value : formatValuta(m.value as number)}
                  </p>
                )}
                <p className="text-xs text-[#6B7280] mt-1">{m.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Openstaande facturen */}
      <Card className="border border-[#E5E7EB] shadow-sm mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Openstaande facturen</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : openstaand.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Geen openstaande facturen</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Factuurnr</TableHead>
                  <TableHead className="text-xs">Datum</TableHead>
                  <TableHead className="text-xs">Bedrag</TableHead>
                  <TableHead className="text-xs">Vervaldatum</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openstaand.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="text-sm font-mono">{f.factuurnummer}</TableCell>
                    <TableCell className="text-xs">{formatDatum(f.datum)}</TableCell>
                    <TableCell className="text-sm font-medium">{formatValuta(f.totaal)}</TableCell>
                    <TableCell className="text-xs">{formatDatum(f.vervaldatum)}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${f.status === 'late' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {f.status === 'late' ? 'Te laat' : 'Open'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Alle facturen */}
      <Card className="border border-[#E5E7EB] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Alle facturen</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : facturen.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              Geen facturen gevonden. Controleer of de Moneybird API token en administratie ID correct zijn ingesteld.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Factuurnr</TableHead>
                  <TableHead className="text-xs">Datum</TableHead>
                  <TableHead className="text-xs">Excl. BTW</TableHead>
                  <TableHead className="text-xs">BTW</TableHead>
                  <TableHead className="text-xs">Totaal</TableHead>
                  <TableHead className="text-xs">Vervaldatum</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facturen.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="text-sm font-mono">{f.factuurnummer}</TableCell>
                    <TableCell className="text-xs">{formatDatum(f.datum)}</TableCell>
                    <TableCell className="text-sm">{formatValuta(f.bedrag)}</TableCell>
                    <TableCell className="text-sm">{formatValuta(f.btw)}</TableCell>
                    <TableCell className="text-sm font-medium">{formatValuta(f.totaal)}</TableCell>
                    <TableCell className="text-xs">{formatDatum(f.vervaldatum)}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${
                        f.status === 'paid' ? 'bg-green-100 text-green-800' :
                        f.status === 'late' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {f.status === 'paid' ? 'Betaald' : f.status === 'late' ? 'Te laat' : 'Open'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
