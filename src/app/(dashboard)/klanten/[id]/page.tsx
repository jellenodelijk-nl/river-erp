'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/page-header'
import { ContactmomentenSectie } from '@/components/contactmomenten-sectie'
import { TakenSectie } from '@/components/taken-sectie'
import { BedrijfBadge } from '@/components/bedrijf-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  ArrowLeft, Plus, Loader2, FileText, Building2, Mail, Phone,
  Globe, MapPin, Hash, CreditCard, Briefcase,
} from 'lucide-react'
import { formatDatum, formatValuta } from '@/lib/format'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Klant, Opdracht, MoneybirdFactuur, OpdrachtType, OpdrachtStatus } from '@/lib/types'

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-8 h-8 rounded-lg bg-[#F0F4FF] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-[#3A6FD8]" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">{label}</p>
        <p className="text-sm text-[#0B0D0E] mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function KlantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const id = params.id as string

  const [klant, setKlant] = useState<Klant | null>(null)
  const [opdrachten, setOpdrachten] = useState<Opdracht[]>([])
  const [facturen, setFacturen] = useState<MoneybirdFactuur[]>([])
  const [loading, setLoading] = useState(true)
  const [facturenLoading, setFacturenLoading] = useState(false)
  const [opdrachtOpen, setOpdrachtOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [opTitel, setOpTitel] = useState('')
  const [opOmschrijving, setOpOmschrijving] = useState('')
  const [opType, setOpType] = useState<OpdrachtType>('eenmalig')
  const [opBedrag, setOpBedrag] = useState('')

  useEffect(() => {
    async function fetchData() {
      const { data: k } = await supabase.from('klanten').select('*').eq('id', id).single()
      setKlant(k)

      const { data: o } = await supabase.from('opdrachten').select('*').eq('klant_id', id).order('created_at', { ascending: false })
      setOpdrachten(o || [])
      setLoading(false)

      if (k?.moneybird_id) {
        setFacturenLoading(true)
        try {
          const res = await fetch(`/api/moneybird/facturen?contact_id=${k.moneybird_id}`)
          if (res.ok) setFacturen(await res.json())
        } catch { /* ignore */ }
        setFacturenLoading(false)
      }
    }
    fetchData()
  }, [id, supabase])

  async function handleOpdrachtSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('opdrachten').insert({
      klant_id: id,
      titel: opTitel,
      omschrijving: opOmschrijving || null,
      type: opType,
      bedrag: opBedrag ? parseFloat(opBedrag) : null,
      status: 'actief' as OpdrachtStatus,
    })
    if (error) toast.error('Fout bij opslaan')
    else {
      toast.success('Opdracht toegevoegd')
      setOpdrachtOpen(false)
      setOpTitel(''); setOpOmschrijving(''); setOpBedrag('')
      const { data } = await supabase.from('opdrachten').select('*').eq('klant_id', id).order('created_at', { ascending: false })
      setOpdrachten(data || [])
    }
    setSaving(false)
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-48 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>
  if (!klant) return <p className="text-[#6B7280]">Klant niet gevonden</p>

  const adres = [klant.straat, klant.huisnummer].filter(Boolean).join(' ')
  const adresVolledig = [adres, [klant.postcode, klant.plaats].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const totaalOpdrachten = opdrachten.filter(o => o.status === 'actief').reduce((a, b) => a + (b.bedrag || 0), 0)

  return (
    <>
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 rounded-2xl overflow-hidden bg-gradient-to-r from-[#3A6FD8] to-[#1F8A9B] p-6 md:p-8"
      >
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 800 200" fill="none" className="w-full h-full" preserveAspectRatio="none">
            <path d="M-50 100C150 50 350 150 550 100C750 50 800 120 850 100" stroke="white" strokeWidth="60" />
            <path d="M-50 150C150 100 350 200 550 150C750 100 800 170 850 150" stroke="white" strokeWidth="40" />
          </svg>
        </div>
        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => router.push('/klanten')} className="text-white/80 hover:text-white hover:bg-white/10 -ml-2 mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Terug naar klanten
          </Button>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-white">{klant.naam}</h1>
                  {klant.bedrijf && <p className="text-white/70 text-sm">{klant.bedrijf}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm font-mono">{klant.klantnummer}</Badge>
                <BedrijfBadge tag={klant.bedrijf_tag} />
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                  {klant.facturatie_moment === 'tweede_dinsdag' ? 'Tweede dinsdag' : 'Achteraf'}
                </Badge>
              </div>
            </div>
            <div className="flex gap-4">
              {totaalOpdrachten > 0 && (
                <div className="text-right">
                  <p className="text-white/60 text-xs">Actieve opdrachten</p>
                  <p className="text-white text-xl font-semibold">{formatValuta(totaalOpdrachten)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contactgegevens */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-[#FAFBFC] to-white border-b border-[#E5E7EB]/50">
                <CardTitle className="text-sm font-semibold">Contactgegevens</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  <InfoItem icon={Mail} label="E-mail" value={klant.email} />
                  <InfoItem icon={Phone} label="Telefoon" value={klant.telefoonnummer} />
                  <InfoItem icon={Globe} label="Website" value={klant.url} />
                  <InfoItem icon={MapPin} label="Adres" value={adresVolledig || null} />
                  <InfoItem icon={Hash} label="Moneybird ID" value={klant.moneybird_id} />
                  <InfoItem icon={CreditCard} label="KvK / Rechtsvorm" value={klant.rechtsvorm} />
                </div>
                {!klant.email && !klant.telefoonnummer && !adresVolledig && (
                  <p className="text-xs text-[#9CA3AF] py-4 text-center">Geen contactgegevens beschikbaar</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Opdrachten */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-[#FAFBFC] to-white border-b border-[#E5E7EB]/50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#3A6FD8]" />
                  Opdrachten &amp; Upsells
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setOpdrachtOpen(true)} className="text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Nieuwe opdracht
                </Button>
              </CardHeader>
              <CardContent className="pt-4">
                {opdrachten.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                    <p className="text-xs text-[#9CA3AF]">Nog geen opdrachten</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {opdrachten.map(op => (
                      <div key={op.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F4F6F7]/50 hover:bg-[#F0F4FF]/30 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#0B0D0E]">{op.titel}</p>
                          {op.omschrijving && <p className="text-xs text-[#6B7280] mt-0.5 truncate">{op.omschrijving}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <Badge variant="outline" className="text-xs capitalize">{op.type}</Badge>
                          {op.bedrag && <span className="text-sm font-semibold text-[#0B0D0E]">{formatValuta(op.bedrag)}</span>}
                          <Badge className={`text-[10px] ${
                            op.status === 'actief' ? 'bg-green-100 text-green-800' :
                            op.status === 'afgerond' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>{op.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Moneybird Facturen */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-[#FAFBFC] to-white border-b border-[#E5E7EB]/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1F8A9B]" />
                  Moneybird Facturen
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {!klant.moneybird_id ? (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                    <p className="text-xs text-[#9CA3AF]">Geen Moneybird ID gekoppeld</p>
                    <p className="text-[11px] text-[#D1D5DB] mt-1">Voeg een Moneybird ID toe om facturen te zien</p>
                  </div>
                ) : facturenLoading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
                ) : facturen.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF] text-center py-6">Geen facturen gevonden</p>
                ) : (
                  <div className="space-y-2">
                    {facturen.map(f => (
                      <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F4F6F7]/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            f.status === 'paid' ? 'bg-green-500' :
                            f.status === 'late' ? 'bg-red-500' :
                            'bg-yellow-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium font-mono text-[#0B0D0E]">{f.factuurnummer}</p>
                            <p className="text-[11px] text-[#9CA3AF]">{formatDatum(f.datum)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#0B0D0E]">{formatValuta(f.totaal)}</p>
                          <p className="text-[11px] text-[#9CA3AF]">Vervalt {formatDatum(f.vervaldatum)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-[#FAFBFC] to-white border-b border-[#E5E7EB]/50">
                <CardTitle className="text-sm font-semibold">Contactmomenten</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ContactmomentenSectie type="klant" referentieId={id} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-[#FAFBFC] to-white border-b border-[#E5E7EB]/50">
                <CardTitle className="text-sm font-semibold">Taken</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <TakenSectie gerelateerType="klant" gerelateerdeId={id} />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Nieuwe opdracht dialog */}
      <Dialog open={opdrachtOpen} onOpenChange={setOpdrachtOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nieuwe opdracht</DialogTitle></DialogHeader>
          <form onSubmit={handleOpdrachtSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Titel *</Label>
              <Input value={opTitel} onChange={(e) => setOpTitel(e.target.value)} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Omschrijving</Label>
              <Textarea value={opOmschrijving} onChange={(e) => setOpOmschrijving(e.target.value)} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B7280]">Type</Label>
                <Select value={opType} onValueChange={(v) => setOpType((v ?? 'eenmalig') as OpdrachtType)}>
                  <SelectTrigger className="h-9 text-sm">{opType === 'eenmalig' ? 'Eenmalig' : 'Upsell'}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eenmalig">Eenmalig</SelectItem>
                    <SelectItem value="upsell">Upsell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B7280]">Bedrag (&euro;)</Label>
                <Input type="number" step="0.01" value={opBedrag} onChange={(e) => setOpBedrag(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpdrachtOpen(false)}>Annuleren</Button>
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
