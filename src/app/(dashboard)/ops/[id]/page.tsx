'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TakenSectie } from '@/components/taken-sectie'
import { BedrijfBadge } from '@/components/bedrijf-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Wrench, Calendar, User2 } from 'lucide-react'
import { formatDatum } from '@/lib/format'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { OpsItem, OpsStatus, OpsPrioriteit } from '@/lib/types'
import { OPS_STATUSSEN, OPS_PRIORITEITEN } from '@/lib/types'

export default function OpsDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const id = params.id as string
  const [item, setItem] = useState<OpsItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('ops_items').select('*, klant:klanten(id, naam, bedrijf), eigenaar:users(*)').eq('id', id).single()
      .then(({ data }) => { setItem(data); setLoading(false) })
  }, [id, supabase])

  async function handleStatusChange(newStatus: string) {
    if (!item) return
    const { error } = await supabase.from('ops_items').update({ status: newStatus }).eq('id', id)
    if (error) toast.error('Status wijzigen mislukt')
    else { setItem({ ...item, status: newStatus as OpsStatus }); toast.success('Status bijgewerkt') }
  }

  async function handlePrioriteitChange(newPrio: string) {
    if (!item) return
    const { error } = await supabase.from('ops_items').update({ prioriteit: newPrio }).eq('id', id)
    if (error) toast.error('Prioriteit wijzigen mislukt')
    else { setItem({ ...item, prioriteit: newPrio as OpsPrioriteit }); toast.success('Prioriteit bijgewerkt') }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-48 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>
  if (!item) return <p className="text-muted-foreground">Ops item niet gevonden</p>

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 rounded-2xl overflow-hidden bg-gradient-to-r from-[#1F8A9B] to-[#176C79] p-6 md:p-8">
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 800 200" fill="none" className="w-full h-full" preserveAspectRatio="none">
            <path d="M-50 100C150 50 350 150 550 100C750 50 800 120 850 100" stroke="white" strokeWidth="60" />
          </svg>
        </div>
        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => router.push('/ops')} className="text-white/80 hover:text-white hover:bg-white/10 -ml-2 mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Terug
          </Button>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-white">{item.titel}</h1>
                  {item.klant && (
                    <Link href={`/klanten/${item.klant_id}`} className="text-white/70 text-sm hover:text-white">
                      {item.klant.naam} — {item.klant.bedrijf}
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Select value={item.status} onValueChange={v => handleStatusChange(v ?? 'open')}>
                  <SelectTrigger className="h-7 w-auto border-0 bg-white/20 text-white text-xs backdrop-blur-sm">
                    {OPS_STATUSSEN.find(s => s.value === item.status)?.label}
                  </SelectTrigger>
                  <SelectContent>{OPS_STATUSSEN.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={item.prioriteit} onValueChange={v => handlePrioriteitChange(v ?? 'normaal')}>
                  <SelectTrigger className="h-7 w-auto border-0 bg-white/20 text-white text-xs backdrop-blur-sm">
                    {OPS_PRIORITEITEN.find(p => p.value === item.prioriteit)?.label}
                  </SelectTrigger>
                  <SelectContent>{OPS_PRIORITEITEN.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
                <BedrijfBadge tag={item.bedrijf_tag} />
              </div>
            </div>
            {item.deadline && (
              <div className="text-right"><p className="text-white/50 text-[11px] uppercase">Deadline</p>
                <p className="text-white text-lg font-semibold">{formatDatum(item.deadline)}</p></div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {item.omschrijving && (
            <Card className="card-base"><CardContent className="p-5">
              <h3 className="section-header mb-2">Omschrijving</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.omschrijving}</p>
            </CardContent></Card>
          )}
          <Card className="card-base"><CardContent className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {item.eigenaar && <div><p className="text-[11px] text-muted-foreground uppercase">Eigenaar</p><p className="font-medium flex items-center gap-1"><User2 className="w-3 h-3" />{item.eigenaar.full_name}</p></div>}
              {item.deadline && <div><p className="text-[11px] text-muted-foreground uppercase">Deadline</p><p className="font-medium flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDatum(item.deadline)}</p></div>}
              <div><p className="text-[11px] text-muted-foreground uppercase">Aangemaakt</p><p className="font-medium">{formatDatum(item.created_at)}</p></div>
            </div>
          </CardContent></Card>
        </div>
        <div className="space-y-6">
          <Card className="card-base overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/50 bg-muted/20"><CardTitle className="section-header">Taken</CardTitle></CardHeader>
            <CardContent className="pt-4"><TakenSectie gerelateerType="ops_item" gerelateerdeId={id} /></CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
