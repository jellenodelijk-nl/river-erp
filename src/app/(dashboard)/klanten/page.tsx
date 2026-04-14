'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { BedrijfFilter } from '@/components/bedrijf-filter'
import { BedrijfBadge } from '@/components/bedrijf-badge'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Klant, BedrijfTag } from '@/lib/types'

export default function KlantenPage() {
  const router = useRouter()
  const supabase = createClient()
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [loading, setLoading] = useState(true)
  const [bedrijfFilter, setBedrijfFilter] = useState<BedrijfTag | 'alle'>('alle')
  const [zoek, setZoek] = useState('')

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      let query = supabase.from('klanten').select('*').order('created_at', { ascending: false })
      if (bedrijfFilter !== 'alle') query = query.eq('bedrijf_tag', bedrijfFilter)
      const { data } = await query
      let filtered = data || []
      if (zoek) {
        const s = zoek.toLowerCase()
        filtered = filtered.filter(k =>
          k.naam.toLowerCase().includes(s) ||
          k.bedrijf.toLowerCase().includes(s) ||
          k.klantnummer.toLowerCase().includes(s)
        )
      }
      setKlanten(filtered)
      setLoading(false)
    }
    fetch()
  }, [supabase, bedrijfFilter, zoek])

  return (
    <>
      <PageHeader title="Klanten" description="Overzicht van alle klanten">
        <BedrijfFilter value={bedrijfFilter} onChange={setBedrijfFilter} />
      </PageHeader>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <Input placeholder="Zoek op naam, bedrijf of klantnummer..." value={zoek} onChange={(e) => setZoek(e.target.value)} className="pl-8 h-9 text-sm w-[280px]" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F4F6F7]">
                  <TableHead className="text-xs font-semibold">Klantnummer</TableHead>
                  <TableHead className="text-xs font-semibold">Naam</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Bedrijf</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">E-mail</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Telefoon</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Facturatie</TableHead>
                  <TableHead className="text-xs font-semibold">Tag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {klanten.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-[#6B7280] py-8">Geen klanten gevonden</TableCell></TableRow>
                ) : klanten.map(klant => (
                  <TableRow key={klant.id} className="cursor-pointer hover:bg-[#F4F6F7]" onClick={() => router.push(`/klanten/${klant.id}`)}>
                    <TableCell className="text-sm font-medium font-mono">{klant.klantnummer}</TableCell>
                    <TableCell className="text-sm font-medium">{klant.naam}</TableCell>
                    <TableCell className="text-sm text-[#6B7280] hidden md:table-cell">{klant.bedrijf}</TableCell>
                    <TableCell className="text-xs text-[#6B7280] hidden md:table-cell">{klant.email}</TableCell>
                    <TableCell className="text-xs text-[#6B7280] hidden lg:table-cell">{klant.telefoonnummer}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className="text-xs">
                        {klant.facturatie_moment === 'tweede_dinsdag' ? 'Tweede dinsdag' : 'Achteraf'}
                      </Badge>
                    </TableCell>
                    <TableCell><BedrijfBadge tag={klant.bedrijf_tag} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}
    </>
  )
}
