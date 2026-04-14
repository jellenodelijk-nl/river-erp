'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/page-header'
import { LeadForm } from '@/components/lead-form'
import { ContactmomentenSectie } from '@/components/contactmomenten-sectie'
import { TakenSectie } from '@/components/taken-sectie'
import { BedrijfBadge } from '@/components/bedrijf-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Trash2, UserCheck, Loader2 } from 'lucide-react'
import { dagenInFase, formatValuta } from '@/lib/format'
import { SALES_FASES } from '@/lib/types'
import { toast } from 'sonner'
import type { SalesLead, FacturatieMoment } from '@/lib/types'

export default function SalesLeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [lead, setLead] = useState<SalesLead | null>(null)
  const [loading, setLoading] = useState(true)
  const [convertOpen, setConvertOpen] = useState(false)
  const [klantnummer, setKlantnummer] = useState('')
  const [facturatieMoment, setFacturatieMoment] = useState<FacturatieMoment>('achteraf')
  const [converting, setConverting] = useState(false)

  const id = params.id as string

  useEffect(() => {
    async function fetchLead() {
      const { data } = await supabase.from('sales_leads').select('*, eigenaar:users(*)').eq('id', id).single()
      setLead(data)
      setLoading(false)
    }
    fetchLead()
  }, [id, supabase])

  async function handleDelete() {
    const { error } = await supabase.from('sales_leads').delete().eq('id', id)
    if (error) toast.error('Verwijderen mislukt')
    else { toast.success('Lead verwijderd'); router.push('/sales-leads') }
  }

  async function handleConvert() {
    if (!lead || !klantnummer) return
    setConverting(true)

    const { error } = await supabase.from('klanten').insert({
      sales_lead_id: lead.id,
      klantnummer,
      facturatie_moment: facturatieMoment,
      naam: lead.naam,
      bedrijf: lead.bedrijf,
      url: lead.url,
      email: lead.email,
      telefoonnummer: lead.telefoonnummer,
      straat: lead.straat,
      huisnummer: lead.huisnummer,
      postcode: lead.postcode,
      plaats: lead.plaats,
      provincie: lead.provincie,
      sbi: lead.sbi,
      omschrijving_activiteiten: lead.omschrijving_activiteiten,
      aantal_medewerkers: lead.aantal_medewerkers,
      omzet: lead.omzet,
      rechtsvorm: lead.rechtsvorm,
      bedrijf_tag: lead.bedrijf_tag,
    })

    if (error) {
      toast.error('Conversie mislukt: ' + error.message)
    } else {
      await supabase.from('sales_leads').update({ geconverteerd: true }).eq('id', lead.id)
      toast.success('Lead omgezet naar klant')
      setConvertOpen(false)
      router.push('/klanten')
    }
    setConverting(false)
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>
  if (!lead) return <p className="text-[#6B7280]">Lead niet gevonden</p>

  const initialData: Record<string, unknown> = { ...lead }
  delete (initialData as Record<string, unknown>).eigenaar
  if (lead.eenmalig_bedrag) initialData.eenmalig_bedrag = String(lead.eenmalig_bedrag)
  if (lead.maandelijks_bedrag) initialData.maandelijks_bedrag = String(lead.maandelijks_bedrag)

  return (
    <>
      <PageHeader title={lead.naam}>
        <div className="flex items-center gap-2">
          <BedrijfBadge tag={lead.bedrijf_tag} />
          <Badge variant="outline">{SALES_FASES.find(f => f.value === lead.fase)?.label}</Badge>
          <Badge variant="secondary" className="text-xs">{dagenInFase(lead.fase_gewijzigd_op)} dagen in fase</Badge>
          {lead.maandelijks_bedrag && (
            <Badge className="bg-[#A9DDE4] text-[#176C79]">{formatValuta(lead.maandelijks_bedrag)}/m</Badge>
          )}
        </div>
      </PageHeader>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.push('/sales-leads')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Terug
        </Button>
        {lead.fase === 'akkoord' && !lead.geconverteerd && (
          <Button size="sm" className="bg-[#059669] hover:bg-[#047857]" onClick={() => setConvertOpen(true)}>
            <UserCheck className="w-4 h-4 mr-1" /> Omzetten naar klant
          </Button>
        )}
        {lead.geconverteerd && (
          <Badge className="bg-green-100 text-green-800">Geconverteerd naar klant</Badge>
        )}
        <AlertDialog>
          <AlertDialogTrigger>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md ml-auto cursor-pointer">
              <Trash2 className="w-4 h-4" />
              Verwijderen
            </span>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Lead verwijderen?</AlertDialogTitle>
              <AlertDialogDescription>Dit kan niet ongedaan worden gemaakt.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Verwijderen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LeadForm type="sales" initialData={initialData} leadId={id} />
        </div>
        <div className="space-y-6">
          <Card className="border border-[#E5E7EB] shadow-sm">
            <CardContent className="pt-5">
              <ContactmomentenSectie type="sales_lead" referentieId={id} />
            </CardContent>
          </Card>
          <Card className="border border-[#E5E7EB] shadow-sm">
            <CardContent className="pt-5">
              <TakenSectie gerelateerType="sales_lead" gerelateerdeId={id} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Convert to klant dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Omzetten naar klant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Klantnummer *</Label>
              <Input value={klantnummer} onChange={(e) => setKlantnummer(e.target.value)} placeholder="bijv. KL-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Facturatiemoment</Label>
              <Select value={facturatieMoment} onValueChange={(v) => setFacturatieMoment(v as FacturatieMoment)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tweede_dinsdag">Tweede dinsdag</SelectItem>
                  <SelectItem value="achteraf">Achteraf</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>Annuleren</Button>
            <Button className="bg-[#059669] hover:bg-[#047857]" onClick={handleConvert} disabled={!klantnummer || converting}>
              {converting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Omzetten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
