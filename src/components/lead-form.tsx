'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import type { User, BedrijfTag } from '@/lib/types'
import { CAMPAGNE_FASES, SALES_FASES } from '@/lib/types'

type LeadType = 'campagne' | 'sales'

interface LeadFormProps {
  type: LeadType
  initialData?: Record<string, unknown>
  leadId?: string
  onSuccess?: () => void
  inline?: boolean
}

function CollapsibleSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-[#E5E7EB]/80 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#FAFBFC] to-white hover:from-[#F0F4FF]/50 hover:to-white transition-colors"
      >
        <span className="text-sm font-semibold text-[#0B0D0E]">{title}</span>
        <ChevronDown className={`w-4 h-4 text-[#9CA3AF] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function LeadForm({ type, initialData, leadId, onSuccess, inline }: LeadFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [saving, setSaving] = useState(false)
  const fases = type === 'campagne' ? CAMPAGNE_FASES : SALES_FASES

  const [form, setForm] = useState({
    naam: '',
    bedrijf: '',
    url: '',
    email: '',
    telefoonnummer: '',
    bron: '',
    campagne: '',
    eigenaar_id: '',
    fase: fases[0].value,
    omschrijving: '',
    straat: '',
    huisnummer: '',
    postcode: '',
    plaats: '',
    provincie: '',
    sbi: '',
    omschrijving_activiteiten: '',
    aantal_medewerkers: '',
    omzet: '',
    rechtsvorm: '',
    bedrijf_tag: 'river_digital' as BedrijfTag,
    eenmalig_bedrag: '',
    maandelijks_bedrag: '',
    ...initialData,
  })

  useEffect(() => {
    supabase.from('users').select('*').then(({ data }) => setUsers(data || []))
  }, [supabase])

  useEffect(() => {
    if (user && !form.eigenaar_id && !initialData) {
      setForm(prev => ({ ...prev, eigenaar_id: user.id }))
    }
  }, [user, form.eigenaar_id, initialData])

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const table = type === 'campagne' ? 'campagne_leads' : 'sales_leads'
    const payload: Record<string, unknown> = {
      naam: form.naam,
      bedrijf: form.bedrijf,
      url: form.url || null,
      email: form.email || null,
      telefoonnummer: form.telefoonnummer || null,
      bron: form.bron || null,
      campagne: form.campagne || null,
      eigenaar_id: form.eigenaar_id || null,
      fase: form.fase,
      omschrijving: form.omschrijving || null,
      straat: form.straat || null,
      huisnummer: form.huisnummer || null,
      postcode: form.postcode || null,
      plaats: form.plaats || null,
      provincie: form.provincie || null,
      sbi: form.sbi || null,
      omschrijving_activiteiten: form.omschrijving_activiteiten || null,
      aantal_medewerkers: form.aantal_medewerkers || null,
      omzet: form.omzet || null,
      rechtsvorm: form.rechtsvorm || null,
      bedrijf_tag: form.bedrijf_tag,
    }

    if (type === 'sales') {
      payload.eenmalig_bedrag = form.eenmalig_bedrag ? parseFloat(form.eenmalig_bedrag) : null
      payload.maandelijks_bedrag = form.maandelijks_bedrag ? parseFloat(form.maandelijks_bedrag) : null
    }

    let error
    if (leadId) {
      const result = await supabase.from(table).update(payload).eq('id', leadId)
      error = result.error
    } else {
      const result = await supabase.from(table).insert(payload)
      error = result.error
    }

    if (error) {
      toast.error('Fout bij opslaan: ' + error.message)
    } else {
      toast.success(leadId ? 'Lead bijgewerkt' : 'Lead aangemaakt')
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(type === 'campagne' ? '/campagne-leads' : '/sales-leads')
        router.refresh()
      }
    }
    setSaving(false)
  }

  const eigenaarNaam = users.find(u => u.id === form.eigenaar_id)?.full_name
  const faseLabel = fases.find(f => f.value === form.fase)?.label || form.fase
  const tagLabel = form.bedrijf_tag === 'river_digital' ? 'River Digital' : 'River Software'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Contactgegevens + Status samen */}
      <CollapsibleSection title="Contactgegevens &amp; Status" defaultOpen={true}>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Naam *</Label>
          <Input value={form.naam} onChange={(e) => updateField('naam', e.target.value)} required className="h-9 text-sm border-[#E5E7EB] focus:border-[#3A6FD8] focus:ring-[#3A6FD8]/20" placeholder="Naam contactpersoon" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Bedrijf</Label>
          <Input value={form.bedrijf} onChange={(e) => updateField('bedrijf', e.target.value)} className="h-9 text-sm" placeholder="Bedrijfsnaam" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">E-mail</Label>
          <Input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="h-9 text-sm" placeholder="email@voorbeeld.nl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Telefoon</Label>
          <Input value={form.telefoonnummer} onChange={(e) => updateField('telefoonnummer', e.target.value)} className="h-9 text-sm" placeholder="06-12345678" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Website</Label>
          <Input value={form.url} onChange={(e) => updateField('url', e.target.value)} className="h-9 text-sm" placeholder="https://..." />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Fase</Label>
          <Select value={form.fase} onValueChange={(v) => updateField('fase', v ?? '')}>
            <SelectTrigger className="h-9 text-sm">{faseLabel}</SelectTrigger>
            <SelectContent>
              {fases.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Eigenaar</Label>
          <Select value={form.eigenaar_id} onValueChange={(v) => updateField('eigenaar_id', v ?? '')}>
            <SelectTrigger className="h-9 text-sm">
              {eigenaarNaam || <span className="text-[#9CA3AF]">Selecteer...</span>}
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Bedrijf tag</Label>
          <Select value={form.bedrijf_tag} onValueChange={(v) => updateField('bedrijf_tag', v ?? '')}>
            <SelectTrigger className="h-9 text-sm">{tagLabel}</SelectTrigger>
            <SelectContent>
              <SelectItem value="river_digital">River Digital</SelectItem>
              <SelectItem value="river_software">River Software</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Bron</Label>
          <Input value={form.bron} onChange={(e) => updateField('bron', e.target.value)} className="h-9 text-sm" placeholder="bijv. LinkedIn, Website" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Campagne</Label>
          <Input value={form.campagne} onChange={(e) => updateField('campagne', e.target.value)} className="h-9 text-sm" placeholder="Campagnenaam" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs font-medium text-[#6B7280]">Omschrijving</Label>
          <Textarea value={form.omschrijving} onChange={(e) => updateField('omschrijving', e.target.value)} className="text-sm min-h-[60px]" placeholder="Korte omschrijving van de lead..." />
        </div>
      </CollapsibleSection>

      {/* Bedragen (alleen sales) */}
      {type === 'sales' && (
        <CollapsibleSection title="Bedragen" defaultOpen={true}>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#6B7280]">Eenmalig bedrag (&euro;)</Label>
            <Input type="number" step="0.01" value={form.eenmalig_bedrag} onChange={(e) => updateField('eenmalig_bedrag', e.target.value)} className="h-9 text-sm" placeholder="0,00" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#6B7280]">Maandelijks bedrag (&euro;)</Label>
            <Input type="number" step="0.01" value={form.maandelijks_bedrag} onChange={(e) => updateField('maandelijks_bedrag', e.target.value)} className="h-9 text-sm" placeholder="0,00" />
          </div>
        </CollapsibleSection>
      )}

      {/* Adres */}
      <CollapsibleSection title="Adresgegevens" defaultOpen={false}>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs font-medium text-[#6B7280]">Straat</Label>
          <Input value={form.straat} onChange={(e) => updateField('straat', e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Huisnummer</Label>
          <Input value={form.huisnummer} onChange={(e) => updateField('huisnummer', e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Postcode</Label>
          <Input value={form.postcode} onChange={(e) => updateField('postcode', e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Plaats</Label>
          <Input value={form.plaats} onChange={(e) => updateField('plaats', e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Provincie</Label>
          <Input value={form.provincie} onChange={(e) => updateField('provincie', e.target.value)} className="h-9 text-sm" />
        </div>
      </CollapsibleSection>

      {/* ADHOC info */}
      <CollapsibleSection title="Aanvullende informatie" defaultOpen={false}>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">SBI code</Label>
          <Input value={form.sbi} onChange={(e) => updateField('sbi', e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Rechtsvorm</Label>
          <Input value={form.rechtsvorm} onChange={(e) => updateField('rechtsvorm', e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Aantal medewerkers</Label>
          <Input value={form.aantal_medewerkers} onChange={(e) => updateField('aantal_medewerkers', e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#6B7280]">Omzet</Label>
          <Input value={form.omzet} onChange={(e) => updateField('omzet', e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs font-medium text-[#6B7280]">Omschrijving activiteiten</Label>
          <Textarea value={form.omschrijving_activiteiten} onChange={(e) => updateField('omschrijving_activiteiten', e.target.value)} className="text-sm" />
        </div>
      </CollapsibleSection>

      <div className="flex justify-end gap-3 pt-2">
        {!onSuccess && (
          <Button type="button" variant="outline" onClick={() => router.back()}>Annuleren</Button>
        )}
        <Button type="submit" className="bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] hover:from-[#2F57AA] hover:to-[#254A99] shadow-md shadow-[#3A6FD8]/15" disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {leadId ? 'Opslaan' : 'Aanmaken'}
        </Button>
      </div>
    </form>
  )
}
