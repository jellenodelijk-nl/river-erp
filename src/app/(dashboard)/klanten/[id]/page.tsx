'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  ArrowLeft, Plus, Loader2, FileText, Building2, Mail, Phone,
  Globe, MapPin, Hash, CreditCard, Briefcase, Save, TrendingUp,
  Calendar, User2, ChevronDown,
} from 'lucide-react'
import { formatDatum, formatValuta } from '@/lib/format'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import type { Klant, Opdracht, MoneybirdFactuur, OpdrachtType, OpdrachtStatus, BedrijfTag, FacturatieMoment } from '@/lib/types'

interface Contactpersoon {
  naam: string
  email?: string | null
  telefoon?: string | null
  afdeling?: string | null
}

export default function KlantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const id = params.id as string

  const [klant, setKlant] = useState<Klant | null>(null)
  const [opdrachten, setOpdrachten] = useState<Opdracht[]>([])
  const [facturen, setFacturen] = useState<MoneybirdFactuur[]>([])
  const [contactpersonen, setContactpersonen] = useState<Contactpersoon[]>([])
  const [loading, setLoading] = useState(true)
  const [facturenLoading, setFacturenLoading] = useState(false)
  const [opdrachtOpen, setOpdrachtOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form
  const [editForm, setEditForm] = useState<Record<string, string>>({})

  // Opdracht form
  const [opTitel, setOpTitel] = useState('')
  const [opOmschrijving, setOpOmschrijving] = useState('')
  const [opType, setOpType] = useState<OpdrachtType>('eenmalig')
  const [opBedrag, setOpBedrag] = useState('')

  useEffect(() => {
    async function fetchData() {
      const { data: k } = await supabase.from('klanten').select('*').eq('id', id).single()
      setKlant(k)
      if (k) {
        try {
          const cp = k.contactpersonen ? (typeof k.contactpersonen === 'string' ? JSON.parse(k.contactpersonen) : k.contactpersonen) : []
          setContactpersonen(Array.isArray(cp) ? cp : [])
        } catch { setContactpersonen([]) }
      }

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

  function openEdit() {
    if (!klant) return
    setEditForm({
      naam: klant.naam || '',
      bedrijf: klant.bedrijf || '',
      email: klant.email || '',
      telefoonnummer: klant.telefoonnummer || '',
      url: klant.url || '',
      straat: klant.straat || '',
      huisnummer: klant.huisnummer || '',
      postcode: klant.postcode || '',
      plaats: klant.plaats || '',
      klantnummer: klant.klantnummer || '',
      moneybird_id: klant.moneybird_id || '',
      bedrijf_tag: klant.bedrijf_tag || 'river_digital',
      facturatie_moment: klant.facturatie_moment || 'achteraf',
    })
    setEditOpen(true)
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('klanten').update({
      naam: editForm.naam,
      bedrijf: editForm.bedrijf,
      email: editForm.email || null,
      telefoonnummer: editForm.telefoonnummer || null,
      url: editForm.url || null,
      straat: editForm.straat || null,
      huisnummer: editForm.huisnummer || null,
      postcode: editForm.postcode || null,
      plaats: editForm.plaats || null,
      klantnummer: editForm.klantnummer,
      moneybird_id: editForm.moneybird_id || null,
      bedrijf_tag: editForm.bedrijf_tag as BedrijfTag,
      facturatie_moment: editForm.facturatie_moment as FacturatieMoment,
    }).eq('id', id)

    if (error) toast.error('Opslaan mislukt: ' + error.message)
    else {
      toast.success('Klant bijgewerkt')
      setEditOpen(false)
      const { data } = await supabase.from('klanten').select('*').eq('id', id).single()
      setKlant(data)
    }
    setSaving(false)
  }

  async function handleOpdrachtSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('opdrachten').insert({
      klant_id: id, titel: opTitel, omschrijving: opOmschrijving || null,
      type: opType, bedrag: opBedrag ? parseFloat(opBedrag) : null, status: 'actief' as OpdrachtStatus,
    })
    if (error) toast.error('Fout bij opslaan')
    else {
      toast.success('Opdracht toegevoegd')
      setOpdrachtOpen(false); setOpTitel(''); setOpOmschrijving(''); setOpBedrag('')
      const { data } = await supabase.from('opdrachten').select('*').eq('klant_id', id).order('created_at', { ascending: false })
      setOpdrachten(data || [])
    }
    setSaving(false)
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-48 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>
  if (!klant) return <p className="text-[#6B7280]">Klant niet gevonden</p>

  // Factuur analyse
  const totaalOmzet = facturen.reduce((a, b) => a + b.totaal, 0)
  const klantSinds = facturen.length > 0 ? facturen.reduce((oldest, f) => f.datum < oldest ? f.datum : oldest, facturen[0].datum) : klant.created_at
  const omzetPerJaar: Record<string, number> = {}
  facturen.forEach(f => {
    const jaar = f.datum?.slice(0, 4)
    if (jaar) omzetPerJaar[jaar] = (omzetPerJaar[jaar] || 0) + f.totaal
  })
  const jaarKeys = Object.keys(omzetPerJaar).sort().reverse()
  const totaalActieveOpdrachten = opdrachten.filter(o => o.status === 'actief').reduce((a, b) => a + (b.bedrag || 0), 0)
  const adres = [klant.straat, klant.huisnummer].filter(Boolean).join(' ')
  const adresVolledig = [adres, [klant.postcode, klant.plaats].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  return (
    <>
      {/* Hero header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 rounded-2xl overflow-hidden bg-gradient-to-r from-[#3A6FD8] to-[#1F8A9B] p-6 md:p-8">
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 800 200" fill="none" className="w-full h-full" preserveAspectRatio="none">
            <path d="M-50 100C150 50 350 150 550 100C750 50 800 120 850 100" stroke="white" strokeWidth="60" />
            <path d="M-50 150C150 100 350 200 550 150C750 100 800 170 850 150" stroke="white" strokeWidth="40" />
          </svg>
        </div>
        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => router.push('/klanten')} className="text-white/80 hover:text-white hover:bg-white/10 -ml-2 mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Terug
          </Button>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-white">{klant.naam}</h1>
                  {klant.bedrijf && klant.bedrijf !== klant.naam && <p className="text-white/70 text-sm">{klant.bedrijf}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm font-mono">{klant.klantnummer}</Badge>
                <BedrijfBadge tag={klant.bedrijf_tag} />
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                  {klant.facturatie_moment === 'tweede_dinsdag' ? 'Tweede dinsdag' : 'Achteraf'}
                </Badge>
                <Button variant="ghost" size="sm" onClick={openEdit} className="text-white/80 hover:text-white hover:bg-white/10 text-xs ml-2">
                  Bewerken
                </Button>
              </div>
            </div>
            {/* Stats */}
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-white/50 text-[11px] uppercase tracking-wider">Klant sinds</p>
                <p className="text-white text-lg font-semibold">{klantSinds ? formatDatum(klantSinds) : '-'}</p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-[11px] uppercase tracking-wider">Totale omzet</p>
                <p className="text-white text-lg font-semibold">{formatValuta(totaalOmzet)}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Omzet per jaar kaarten */}
      {jaarKeys.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {jaarKeys.map((jaar, i) => (
            <motion.div key={jaar} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl">
                <CardContent className="p-4">
                  <p className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">{jaar}</p>
                  <p className="text-lg font-semibold text-[#0B0D0E] mt-1">{formatValuta(omzetPerJaar[jaar])}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Contactgegevens */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-[#FAFBFC] to-white border-b border-[#E5E7EB]/50">
                <CardTitle className="text-sm font-semibold">Contactgegevens</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {klant.email && <InfoRow icon={Mail} label="E-mail" value={klant.email} />}
                  {klant.telefoonnummer && <InfoRow icon={Phone} label="Telefoon" value={klant.telefoonnummer} />}
                  {klant.url && <InfoRow icon={Globe} label="Website" value={klant.url} />}
                  {adresVolledig && <InfoRow icon={MapPin} label="Adres" value={adresVolledig} />}
                  {klant.moneybird_id && <InfoRow icon={Hash} label="Moneybird ID" value={klant.moneybird_id} />}
                  {klant.rechtsvorm && <InfoRow icon={CreditCard} label="BTW/KvK" value={klant.rechtsvorm} />}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contactpersonen */}
          {contactpersonen.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="pb-2 bg-gradient-to-r from-[#FAFBFC] to-white border-b border-[#E5E7EB]/50">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User2 className="w-4 h-4 text-[#3A6FD8]" /> Contactpersonen
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {contactpersonen.map((cp, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#F4F6F7]/50">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3A6FD8] to-[#1F8A9B] flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-semibold">
                            {cp.naam?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#0B0D0E]">{cp.naam}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {cp.email && <span className="text-xs text-[#6B7280]">{cp.email}</span>}
                            {cp.telefoon && <span className="text-xs text-[#6B7280]">{cp.telefoon}</span>}
                            {cp.afdeling && <Badge variant="outline" className="text-[10px]">{cp.afdeling}</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Opdrachten */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-[#FAFBFC] to-white border-b border-[#E5E7EB]/50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#3A6FD8]" /> Opdrachten &amp; Upsells
                  {totaalActieveOpdrachten > 0 && <Badge className="bg-[#C9D9FF] text-[#2F57AA] text-[10px] ml-1">{formatValuta(totaalActieveOpdrachten)}</Badge>}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setOpdrachtOpen(true)} className="text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Nieuw
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
                          {op.bedrag && <span className="text-sm font-semibold">{formatValuta(op.bedrag)}</span>}
                          <Badge className={`text-[10px] ${op.status === 'actief' ? 'bg-green-100 text-green-800' : op.status === 'afgerond' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}>{op.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Facturen */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border border-[#E5E7EB]/80 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-[#FAFBFC] to-white border-b border-[#E5E7EB]/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1F8A9B]" /> Facturen
                  {facturen.length > 0 && <Badge className="bg-[#A9DDE4] text-[#176C79] text-[10px] ml-1">{facturen.length} facturen</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {!klant.moneybird_id ? (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                    <p className="text-xs text-[#9CA3AF]">Geen Moneybird ID gekoppeld</p>
                    <Button variant="outline" size="sm" onClick={openEdit} className="mt-2 text-xs">Moneybird ID toevoegen</Button>
                  </div>
                ) : facturenLoading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
                ) : facturen.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF] text-center py-6">Geen facturen gevonden</p>
                ) : (
                  <div className="space-y-2">
                    {facturen.map(f => (
                      <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F4F6F7]/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${f.status === 'paid' ? 'bg-green-500' : f.status === 'late' ? 'bg-red-500' : 'bg-yellow-500'}`} />
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

      {/* Edit klant dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:!max-w-2xl !w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Klant bewerken</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Naam</Label>
                <Input value={editForm.naam || ''} onChange={e => setEditForm(p => ({...p, naam: e.target.value}))} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Bedrijf</Label>
                <Input value={editForm.bedrijf || ''} onChange={e => setEditForm(p => ({...p, bedrijf: e.target.value}))} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">E-mail</Label>
                <Input value={editForm.email || ''} onChange={e => setEditForm(p => ({...p, email: e.target.value}))} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Telefoon</Label>
                <Input value={editForm.telefoonnummer || ''} onChange={e => setEditForm(p => ({...p, telefoonnummer: e.target.value}))} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Website</Label>
                <Input value={editForm.url || ''} onChange={e => setEditForm(p => ({...p, url: e.target.value}))} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Klantnummer</Label>
                <Input value={editForm.klantnummer || ''} onChange={e => setEditForm(p => ({...p, klantnummer: e.target.value}))} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Straat</Label>
                <Input value={editForm.straat || ''} onChange={e => setEditForm(p => ({...p, straat: e.target.value}))} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Huisnummer</Label>
                <Input value={editForm.huisnummer || ''} onChange={e => setEditForm(p => ({...p, huisnummer: e.target.value}))} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Postcode</Label>
                <Input value={editForm.postcode || ''} onChange={e => setEditForm(p => ({...p, postcode: e.target.value}))} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Plaats</Label>
                <Input value={editForm.plaats || ''} onChange={e => setEditForm(p => ({...p, plaats: e.target.value}))} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Moneybird ID</Label>
                <Input value={editForm.moneybird_id || ''} onChange={e => setEditForm(p => ({...p, moneybird_id: e.target.value}))} className="h-9 text-sm font-mono" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Bedrijf tag</Label>
                <Select value={editForm.bedrijf_tag} onValueChange={v => setEditForm(p => ({...p, bedrijf_tag: v ?? 'river_digital'}))}>
                  <SelectTrigger className="h-9 text-sm">{editForm.bedrijf_tag === 'river_digital' ? 'River Digital' : 'River Software'}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="river_digital">River Digital</SelectItem>
                    <SelectItem value="river_software">River Software</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Facturatiemoment</Label>
                <Select value={editForm.facturatie_moment} onValueChange={v => setEditForm(p => ({...p, facturatie_moment: v ?? 'achteraf'}))}>
                  <SelectTrigger className="h-9 text-sm">{editForm.facturatie_moment === 'tweede_dinsdag' ? 'Tweede dinsdag' : 'Achteraf'}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tweede_dinsdag">Tweede dinsdag</SelectItem>
                    <SelectItem value="achteraf">Achteraf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Annuleren</Button>
              <Button type="submit" className="bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA]" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Nieuwe opdracht dialog */}
      <Dialog open={opdrachtOpen} onOpenChange={setOpdrachtOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nieuwe opdracht</DialogTitle></DialogHeader>
          <form onSubmit={handleOpdrachtSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Titel *</Label>
              <Input value={opTitel} onChange={e => setOpTitel(e.target.value)} required className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Omschrijving</Label>
              <Textarea value={opOmschrijving} onChange={e => setOpOmschrijving(e.target.value)} className="text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Type</Label>
                <Select value={opType} onValueChange={v => setOpType((v ?? 'eenmalig') as OpdrachtType)}>
                  <SelectTrigger className="h-9 text-sm">{opType === 'eenmalig' ? 'Eenmalig' : 'Upsell'}</SelectTrigger>
                  <SelectContent><SelectItem value="eenmalig">Eenmalig</SelectItem><SelectItem value="upsell">Upsell</SelectItem></SelectContent>
                </Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Bedrag (&euro;)</Label>
                <Input type="number" step="0.01" value={opBedrag} onChange={e => setOpBedrag(e.target.value)} className="h-9 text-sm" /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpdrachtOpen(false)}>Annuleren</Button>
              <Button type="submit" className="bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA]" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Toevoegen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
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
