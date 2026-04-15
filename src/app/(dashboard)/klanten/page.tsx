'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { BedrijfFilter } from '@/components/bedrijf-filter'
import { BedrijfBadge } from '@/components/bedrijf-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, Loader2, Users, Download } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Klant, BedrijfTag, FacturatieMoment } from '@/lib/types'

export default function KlantenPage() {
  const router = useRouter()
  const supabase = createClient()
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [loading, setLoading] = useState(true)
  const [bedrijfFilter, setBedrijfFilter] = useState<BedrijfTag | 'alle'>('alle')
  const [zoek, setZoek] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)

  // Form state
  const [naam, setNaam] = useState('')
  const [bedrijf, setBedrijf] = useState('')
  const [klantnummer, setKlantnummer] = useState('')
  const [email, setEmail] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [facturatie, setFacturatie] = useState<FacturatieMoment>('achteraf')
  const [tag, setTag] = useState<BedrijfTag>('river_digital')

  const fetchKlanten = useCallback(async () => {
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
  }, [supabase, bedrijfFilter, zoek])

  useEffect(() => { fetchKlanten() }, [fetchKlanten])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!naam || !klantnummer) return
    setSaving(true)

    const { error } = await supabase.from('klanten').insert({
      naam,
      bedrijf,
      klantnummer,
      email: email || null,
      telefoonnummer: telefoon || null,
      facturatie_moment: facturatie,
      bedrijf_tag: tag,
    })

    if (error) {
      toast.error('Fout: ' + error.message)
    } else {
      toast.success('Klant aangemaakt')
      setCreateOpen(false)
      setNaam(''); setBedrijf(''); setKlantnummer(''); setEmail(''); setTelefoon('')
      fetchKlanten()
    }
    setSaving(false)
  }

  async function handleImportMoneybird() {
    setImporting(true)
    try {
      const res = await fetch('/api/moneybird/import', { method: 'POST' })
      const result = await res.json()
      if (result.success) {
        toast.success(`${result.imported} klanten geïmporteerd uit Moneybird (${result.al_bestaand} bestonden al, ${result.skipped} overgeslagen)`)
        fetchKlanten()
      } else {
        toast.error(result.error || 'Import mislukt')
      }
    } catch {
      toast.error('Import mislukt')
    }
    setImporting(false)
  }

  return (
    <>
      <PageHeader title="Klanten" description="Overzicht van alle klanten">
        <BedrijfFilter value={bedrijfFilter} onChange={setBedrijfFilter} />
        <Button onClick={handleImportMoneybird} variant="outline" size="sm" disabled={importing} className="text-sm">
          {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
          Import Moneybird
        </Button>
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] hover:from-[#2F57AA] hover:to-[#254A99] shadow-md shadow-[#3A6FD8]/15 text-sm" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nieuwe klant
        </Button>
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
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[#FAFBFC] to-white">
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
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-[#6B7280] py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 text-[#D1D5DB]" />
                      <p>Nog geen klanten</p>
                      <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="mt-2">
                        <Plus className="w-3 h-3 mr-1" /> Eerste klant toevoegen
                      </Button>
                    </div>
                  </TableCell></TableRow>
                ) : klanten.map(klant => (
                  <TableRow key={klant.id} className="cursor-pointer hover:bg-[#F0F4FF]/30 transition-colors" onClick={() => router.push(`/klanten/${klant.id}`)}>
                    <TableCell className="text-sm font-medium font-mono text-[#3A6FD8]">{klant.klantnummer}</TableCell>
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

      {/* Nieuwe klant popup */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nieuwe klant toevoegen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B7280]">Naam *</Label>
                <Input value={naam} onChange={(e) => setNaam(e.target.value)} required className="h-9 text-sm" placeholder="Contactpersoon" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B7280]">Klantnummer *</Label>
                <Input value={klantnummer} onChange={(e) => setKlantnummer(e.target.value)} required className="h-9 text-sm" placeholder="KL-001" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Bedrijf</Label>
              <Input value={bedrijf} onChange={(e) => setBedrijf(e.target.value)} className="h-9 text-sm" placeholder="Bedrijfsnaam" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B7280]">E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B7280]">Telefoon</Label>
                <Input value={telefoon} onChange={(e) => setTelefoon(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B7280]">Facturatiemoment</Label>
                <Select value={facturatie} onValueChange={(v) => setFacturatie((v ?? 'achteraf') as FacturatieMoment)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tweede_dinsdag">Tweede dinsdag</SelectItem>
                    <SelectItem value="achteraf">Achteraf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B7280]">Bedrijf tag</Label>
                <Select value={tag} onValueChange={(v) => setTag((v ?? 'river_digital') as BedrijfTag)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="river_digital">River Digital</SelectItem>
                    <SelectItem value="river_software">River Software</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuleren</Button>
              <Button type="submit" className="bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] shadow-md shadow-[#3A6FD8]/15" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Toevoegen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
