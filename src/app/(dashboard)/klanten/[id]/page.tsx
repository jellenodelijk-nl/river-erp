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
import { ArrowLeft, Plus, Loader2, FileText, ExternalLink } from 'lucide-react'
import { formatDatum, formatValuta } from '@/lib/format'
import { toast } from 'sonner'
import type { Klant, Opdracht, MoneybirdFactuur, OpdrachtType, OpdrachtStatus } from '@/lib/types'

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

  // Opdracht form
  const [opTitel, setOpTitel] = useState('')
  const [opOmschrijving, setOpOmschrijving] = useState('')
  const [opType, setOpType] = useState<OpdrachtType>('eenmalig')
  const [opBedrag, setOpBedrag] = useState('')
  const [opStatus, setOpStatus] = useState<OpdrachtStatus>('actief')

  useEffect(() => {
    async function fetchData() {
      const { data: k } = await supabase.from('klanten').select('*').eq('id', id).single()
      setKlant(k)

      const { data: o } = await supabase.from('opdrachten').select('*').eq('klant_id', id).order('created_at', { ascending: false })
      setOpdrachten(o || [])
      setLoading(false)

      // Fetch Moneybird facturen
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
      status: opStatus,
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

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>
  if (!klant) return <p className="text-[#6B7280]">Klant niet gevonden</p>

  return (
    <>
      <PageHeader title={klant.naam}>
        <BedrijfBadge tag={klant.bedrijf_tag} />
        <Badge variant="outline" className="font-mono">{klant.klantnummer}</Badge>
        <Badge variant="secondary">
          {klant.facturatie_moment === 'tweede_dinsdag' ? 'Tweede dinsdag' : 'Achteraf'}
        </Badge>
      </PageHeader>

      <Button variant="ghost" size="sm" onClick={() => router.push('/klanten')} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> Terug
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contactgegevens */}
          <Card className="border border-[#E5E7EB] shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Contactgegevens</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-[#6B7280] text-xs">Bedrijf</span><p>{klant.bedrijf}</p></div>
                <div><span className="text-[#6B7280] text-xs">E-mail</span><p>{klant.email || '-'}</p></div>
                <div><span className="text-[#6B7280] text-xs">Telefoon</span><p>{klant.telefoonnummer || '-'}</p></div>
                <div><span className="text-[#6B7280] text-xs">Website</span><p>{klant.url || '-'}</p></div>
                <div className="col-span-2"><span className="text-[#6B7280] text-xs">Adres</span>
                  <p>{[klant.straat, klant.huisnummer].filter(Boolean).join(' ') || '-'}<br/>{[klant.postcode, klant.plaats].filter(Boolean).join(' ')}</p>
                </div>
                {klant.moneybird_id && <div><span className="text-[#6B7280] text-xs">Moneybird ID</span><p className="font-mono text-xs">{klant.moneybird_id}</p></div>}
              </div>
            </CardContent>
          </Card>

          {/* Opdrachten */}
          <Card className="border border-[#E5E7EB] shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Opdrachten &amp; Upsells</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setOpdrachtOpen(true)} className="text-xs">
                <Plus className="w-3 h-3 mr-1" /> Nieuwe opdracht
              </Button>
            </CardHeader>
            <CardContent>
              {opdrachten.length === 0 ? (
                <p className="text-xs text-[#6B7280]">Geen opdrachten</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Titel</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Bedrag</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opdrachten.map(op => (
                      <TableRow key={op.id}>
                        <TableCell className="text-sm font-medium">{op.titel}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{op.type}</Badge></TableCell>
                        <TableCell className="text-sm">{op.bedrag ? formatValuta(op.bedrag) : '-'}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${
                            op.status === 'actief' ? 'bg-green-100 text-green-800' :
                            op.status === 'afgerond' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>{op.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Moneybird Facturen */}
          <Card className="border border-[#E5E7EB] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Moneybird Facturen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!klant.moneybird_id ? (
                <p className="text-xs text-[#6B7280]">Geen Moneybird ID gekoppeld. Voeg een Moneybird ID toe aan deze klant om facturen te zien.</p>
              ) : facturenLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : facturen.length === 0 ? (
                <p className="text-xs text-[#6B7280]">Geen facturen gevonden</p>
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
                    {facturen.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="text-sm font-mono">{f.factuurnummer}</TableCell>
                        <TableCell className="text-xs">{formatDatum(f.datum)}</TableCell>
                        <TableCell className="text-sm">{formatValuta(f.totaal)}</TableCell>
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border border-[#E5E7EB] shadow-sm">
            <CardContent className="pt-5">
              <ContactmomentenSectie type="klant" referentieId={id} />
            </CardContent>
          </Card>
          <Card className="border border-[#E5E7EB] shadow-sm">
            <CardContent className="pt-5">
              <TakenSectie gerelateerType="klant" gerelateerdeId={id} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Nieuwe opdracht dialog */}
      <Dialog open={opdrachtOpen} onOpenChange={setOpdrachtOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nieuwe opdracht</DialogTitle></DialogHeader>
          <form onSubmit={handleOpdrachtSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Titel *</Label>
              <Input value={opTitel} onChange={(e) => setOpTitel(e.target.value)} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Omschrijving</Label>
              <Textarea value={opOmschrijving} onChange={(e) => setOpOmschrijving(e.target.value)} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={opType} onValueChange={(v) => setOpType(v as OpdrachtType)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eenmalig">Eenmalig</SelectItem>
                    <SelectItem value="upsell">Upsell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bedrag (€)</Label>
                <Input type="number" step="0.01" value={opBedrag} onChange={(e) => setOpBedrag(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpdrachtOpen(false)}>Annuleren</Button>
              <Button type="submit" className="bg-[#3A6FD8] hover:bg-[#2F57AA]" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Toevoegen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
