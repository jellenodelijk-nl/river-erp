'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { User, BedrijfTag, CampagneFase, SalesFase } from '@/lib/types'
import { CAMPAGNE_FASES, SALES_FASES } from '@/lib/types'

type LeadType = 'campagne' | 'sales'

interface LeadFormProps {
  type: LeadType
  initialData?: Record<string, unknown>
  leadId?: string
}

export function LeadForm({ type, initialData, leadId }: LeadFormProps) {
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
      router.push(type === 'campagne' ? '/campagne-leads' : '/sales-leads')
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contactgegevens */}
      <Card className="border border-[#E5E7EB] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Contactgegevens</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Naam *</Label>
            <Input value={form.naam} onChange={(e) => updateField('naam', e.target.value)} required className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bedrijf</Label>
            <Input value={form.bedrijf} onChange={(e) => updateField('bedrijf', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">E-mail</Label>
            <Input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Telefoon</Label>
            <Input value={form.telefoonnummer} onChange={(e) => updateField('telefoonnummer', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Website</Label>
            <Input value={form.url} onChange={(e) => updateField('url', e.target.value)} className="h-9 text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card className="border border-[#E5E7EB] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Fase</Label>
            <Select value={form.fase} onValueChange={(v) => updateField('fase', v ?? '')}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fases.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Eigenaar</Label>
            <Select value={form.eigenaar_id} onValueChange={(v) => updateField('eigenaar_id', v ?? '')}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecteer..." /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bedrijf tag</Label>
            <Select value={form.bedrijf_tag} onValueChange={(v) => updateField('bedrijf_tag', v ?? '')}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="river_digital">River Digital</SelectItem>
                <SelectItem value="river_software">River Software</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bron</Label>
            <Input value={form.bron} onChange={(e) => updateField('bron', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Campagne</Label>
            <Input value={form.campagne} onChange={(e) => updateField('campagne', e.target.value)} className="h-9 text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* Bedragen (alleen sales) */}
      {type === 'sales' && (
        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Bedragen</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Eenmalig bedrag (€)</Label>
              <Input type="number" step="0.01" value={form.eenmalig_bedrag} onChange={(e) => updateField('eenmalig_bedrag', e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Maandelijks bedrag (€)</Label>
              <Input type="number" step="0.01" value={form.maandelijks_bedrag} onChange={(e) => updateField('maandelijks_bedrag', e.target.value)} className="h-9 text-sm" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adres */}
      <Card className="border border-[#E5E7EB] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Adresgegevens</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Straat</Label>
            <Input value={form.straat} onChange={(e) => updateField('straat', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Huisnummer</Label>
            <Input value={form.huisnummer} onChange={(e) => updateField('huisnummer', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Postcode</Label>
            <Input value={form.postcode} onChange={(e) => updateField('postcode', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Plaats</Label>
            <Input value={form.plaats} onChange={(e) => updateField('plaats', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Provincie</Label>
            <Input value={form.provincie} onChange={(e) => updateField('provincie', e.target.value)} className="h-9 text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* ADHOC info */}
      <Card className="border border-[#E5E7EB] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">ADHOC informatie</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">SBI code</Label>
            <Input value={form.sbi} onChange={(e) => updateField('sbi', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Rechtsvorm</Label>
            <Input value={form.rechtsvorm} onChange={(e) => updateField('rechtsvorm', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Aantal medewerkers</Label>
            <Input value={form.aantal_medewerkers} onChange={(e) => updateField('aantal_medewerkers', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Omzet</Label>
            <Input value={form.omzet} onChange={(e) => updateField('omzet', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Omschrijving activiteiten</Label>
            <Textarea value={form.omschrijving_activiteiten} onChange={(e) => updateField('omschrijving_activiteiten', e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Omschrijving</Label>
            <Textarea value={form.omschrijving} onChange={(e) => updateField('omschrijving', e.target.value)} className="text-sm" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Annuleren</Button>
        <Button type="submit" className="bg-[#3A6FD8] hover:bg-[#2F57AA]" disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {leadId ? 'Opslaan' : 'Aanmaken'}
        </Button>
      </div>
    </form>
  )
}
