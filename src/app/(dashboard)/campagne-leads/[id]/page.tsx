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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { dagenInFase } from '@/lib/format'
import { CAMPAGNE_FASES } from '@/lib/types'
import { toast } from 'sonner'
import type { CampagneLead } from '@/lib/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export default function CampagneLeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [lead, setLead] = useState<CampagneLead | null>(null)
  const [loading, setLoading] = useState(true)

  const id = params.id as string

  useEffect(() => {
    async function fetchLead() {
      const { data } = await supabase
        .from('campagne_leads')
        .select('*, eigenaar:users(*)')
        .eq('id', id)
        .single()
      setLead(data)
      setLoading(false)
    }
    fetchLead()
  }, [id, supabase])

  async function handleDelete() {
    const { error } = await supabase.from('campagne_leads').delete().eq('id', id)
    if (error) {
      toast.error('Verwijderen mislukt')
    } else {
      toast.success('Lead verwijderd')
      router.push('/campagne-leads')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!lead) {
    return <p className="text-[#6B7280]">Lead niet gevonden</p>
  }

  const initialData: Record<string, unknown> = { ...lead }
  if (lead.eigenaar) delete (initialData as Record<string, unknown>).eigenaar

  return (
    <>
      <PageHeader title={lead.naam}>
        <div className="flex items-center gap-2">
          <BedrijfBadge tag={lead.bedrijf_tag} />
          <Badge variant="outline">{CAMPAGNE_FASES.find(f => f.value === lead.fase)?.label}</Badge>
          <Badge variant="secondary" className="text-xs">{dagenInFase(lead.fase_gewijzigd_op)} dagen in fase</Badge>
        </div>
      </PageHeader>

      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/campagne-leads')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Terug
        </Button>
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
              <AlertDialogDescription>
                Dit kan niet ongedaan worden gemaakt. Alle gekoppelde data blijft behouden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                Verwijderen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LeadForm type="campagne" initialData={initialData} leadId={id} />
        </div>
        <div className="space-y-6">
          <Card className="border border-[#E5E7EB] shadow-sm">
            <CardContent className="pt-5">
              <ContactmomentenSectie type="campagne_lead" referentieId={id} />
            </CardContent>
          </Card>
          <Card className="border border-[#E5E7EB] shadow-sm">
            <CardContent className="pt-5">
              <TakenSectie gerelateerType="campagne_lead" gerelateerdeId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
