'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
import { Plus, Search, Loader2, Users, Download, Building2 } from 'lucide-react'
import { formatDatum, formatValuta } from '@/lib/format'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Klant, BedrijfTag, FacturatieMoment, MoneybirdFactuur } from '@/lib/types'
import { differenceInDays } from 'date-fns'

export default function KlantenPage() {
  const router = useRouter()
  const supabase = createClient()
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [facturen, setFacturen] = useState<MoneybirdFactuur[]>([])
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

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [klantenRes, facturenRes] = await Promise.all([
      supabase.from('klanten').select('*').order('naam', { ascending: true }),
      fetch('/api/moneybird/facturen').then(r => r.ok ? r.json() : []).catch(() => []),
    ])
    setKlanten(klantenRes.data || [])
    setFacturen(facturenRes)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // Build facturen lookup by moneybird contact_id
  const factuurPerContact = useMemo(() => {
    const map: Record<string, MoneybirdFactuur[]> = {}
    facturen.forEach(f => {
      const cid = f.contact_id
      if (cid) {
        if (!map[cid]) map[cid] = []
        map[cid].push(f)
      }
    })
    return map
  }, [facturen])

  // Enriched klanten with factuur data
  const enrichedKlanten = useMemo(() => {
    let list = klanten.map(k => {
      const kFacturen = k.moneybird_id ? (factuurPerContact[k.moneybird_id] || []) : []
      const betaald = kFacturen.filter(f => f.status === 'paid')
      const totaleOmzet = betaald.reduce((a, b) => a + b.totaal, 0)

      // Laatste factuur datum
      const laatsteFactuur = kFacturen.length > 0
        ? kFacturen.reduce((latest, f) => (f.datum && f.datum > latest) ? f.datum : latest, kFacturen[0]?.datum || '')
        : null

      // Actief = laatste factuur < 45 dagen geleden
      const isActief = laatsteFactuur
        ? differenceInDays(new Date(), new Date(laatsteFactuur)) <= 45
        : false

      return { ...k, totaleOmzet, laatsteFactuur, isActief, aantalFacturen: kFacturen.length }
    })

    if (bedrijfFilter !== 'alle') list = list.filter(k => k.bedrijf_tag === bedrijfFilter)
    if (zoek) {
      const s = zoek.toLowerCase()
      list = list.filter(k =>
        k.naam.toLowerCase().includes(s) ||
        k.bedrijf.toLowerCase().includes(s) ||
        k.klantnummer.toLowerCase().includes(s)
      )
    }

    // Sort by totale omzet desc
    list.sort((a, b) => b.totaleOmzet - a.totaleOmzet)
    return list
  }, [klanten, factuurPerContact, bedrijfFilter, zoek])

  const actieveKlanten = enrichedKlanten.filter(k => k.isActief).length

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!naam || !klantnummer) return
    setSaving(true)
    const { error } = await supabase.from('klanten').insert({
      naam, bedrijf, klantnummer,
      email: email || null, telefoonnummer: telefoon || null,
      facturatie_moment: facturatie, bedrijf_tag: tag,
    })
    if (error) toast.error('Fout: ' + error.message)
    else {
      toast.success('Klant aangemaakt')
      setCreateOpen(false)
      setNaam(''); setBedrijf(''); setKlantnummer(''); setEmail(''); setTelefoon('')
      fetchData()
    }
    setSaving(false)
  }

  async function handleImportMoneybird() {
    setImporting(true)
    try {
      const res = await fetch('/api/moneybird/import', { method: 'POST' })
      const result = await res.json()
      if (result.success) {
        toast.success(`${result.imported} nieuw, ${result.updated} bijgewerkt`)
        fetchData()
      } else toast.error(result.error || 'Import mislukt')
    } catch { toast.error('Import mislukt') }
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

      {/* Stats + search bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input placeholder="Zoek op naam, bedrijf of klantnummer..." value={zoek} onChange={(e) => setZoek(e.target.value)} className="pl-8 h-9 text-sm w-[280px]" />
        </div>
        {!loading && (
          <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
            <span>{enrichedKlanten.length} klanten</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {actieveKlanten} actief
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="card-base overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="text-[11px] font-semibold">Klantnummer</TableHead>
                  <TableHead className="text-[11px] font-semibold">Naam</TableHead>
                  <TableHead className="text-[11px] font-semibold hidden md:table-cell">Laatste factuur</TableHead>
                  <TableHead className="text-[11px] font-semibold hidden lg:table-cell">Tag</TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">Totale omzet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedKlanten.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                    <div className="empty-state">
                      <Users className="empty-state-icon" />
                      <p>Nog geen klanten</p>
                      <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="mt-3">
                        <Plus className="w-3 h-3 mr-1" /> Eerste klant toevoegen
                      </Button>
                    </div>
                  </TableCell></TableRow>
                ) : enrichedKlanten.map(klant => (
                  <TableRow key={klant.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push(`/klanten/${klant.id}`)}>
                    <TableCell className="text-sm font-mono text-primary font-medium">{klant.klantnummer}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{klant.naam}</p>
                        {klant.bedrijf && klant.bedrijf !== klant.naam && (
                          <p className="text-[11px] text-muted-foreground">{klant.bedrijf}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {klant.laatsteFactuur ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatDatum(klant.laatsteFactuur)}</span>
                          {klant.isActief && (
                            <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Actief</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell"><BedrijfBadge tag={klant.bedrijf_tag} /></TableCell>
                    <TableCell className="text-right">
                      {klant.totaleOmzet > 0 ? (
                        <span className="text-sm font-semibold text-foreground">{formatValuta(klant.totaleOmzet)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}

      {/* Nieuwe klant popup */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:!max-w-lg">
          <DialogHeader><DialogTitle>Nieuwe klant toevoegen</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Naam *</Label>
                <Input value={naam} onChange={(e) => setNaam(e.target.value)} required className="h-9 text-sm" placeholder="Contactpersoon" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Klantnummer *</Label>
                <Input value={klantnummer} onChange={(e) => setKlantnummer(e.target.value)} required className="h-9 text-sm" placeholder="KL-001" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Bedrijf</Label>
              <Input value={bedrijf} onChange={(e) => setBedrijf(e.target.value)} className="h-9 text-sm" placeholder="Bedrijfsnaam" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Telefoon</Label>
                <Input value={telefoon} onChange={(e) => setTelefoon(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Facturatiemoment</Label>
                <Select value={facturatie} onValueChange={(v) => setFacturatie((v ?? 'achteraf') as FacturatieMoment)}>
                  <SelectTrigger className="h-9 text-sm">{facturatie === 'tweede_dinsdag' ? 'Tweede dinsdag' : 'Achteraf'}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tweede_dinsdag">Tweede dinsdag</SelectItem>
                    <SelectItem value="achteraf">Achteraf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Bedrijf tag</Label>
                <Select value={tag} onValueChange={(v) => setTag((v ?? 'river_digital') as BedrijfTag)}>
                  <SelectTrigger className="h-9 text-sm">{tag === 'river_digital' ? 'River Digital' : 'River Software'}</SelectTrigger>
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
