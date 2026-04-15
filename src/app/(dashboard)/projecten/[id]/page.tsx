'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TakenSectie } from '@/components/taken-sectie'
import { ContactmomentenSectie } from '@/components/contactmomenten-sectie'
import { BedrijfBadge } from '@/components/bedrijf-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, FolderKanban, Building2, Calendar, DollarSign, User2 } from 'lucide-react'
import { formatDatum, formatValuta } from '@/lib/format'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { Project, ProjectStatus } from '@/lib/types'
import { PROJECT_STATUSSEN } from '@/lib/types'

const statusColors: Record<ProjectStatus, string> = {
  gepland: 'bg-blue-100 text-blue-800',
  actief: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  afgerond: 'bg-gray-100 text-gray-800',
  geannuleerd: 'bg-red-100 text-red-800',
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const id = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('projecten').select('*, klant:klanten(*), eigenaar:users(*)').eq('id', id).single()
      .then(({ data }) => { setProject(data); setLoading(false) })
  }, [id, supabase])

  async function handleStatusChange(newStatus: string) {
    if (!project) return
    const { error } = await supabase.from('projecten').update({ status: newStatus }).eq('id', id)
    if (error) toast.error('Status wijzigen mislukt')
    else { setProject({ ...project, status: newStatus as ProjectStatus }); toast.success('Status bijgewerkt') }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-48 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>
  if (!project) return <p className="text-muted-foreground">Project niet gevonden</p>

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 rounded-2xl overflow-hidden bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] p-6 md:p-8">
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 800 200" fill="none" className="w-full h-full" preserveAspectRatio="none">
            <path d="M-50 100C150 50 350 150 550 100C750 50 800 120 850 100" stroke="white" strokeWidth="60" />
          </svg>
        </div>
        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => router.push('/projecten')} className="text-white/80 hover:text-white hover:bg-white/10 -ml-2 mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Terug
          </Button>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-white">{project.titel}</h1>
                  {project.klant && (
                    <Link href={`/klanten/${project.klant_id}`} className="text-white/70 text-sm hover:text-white transition-colors">
                      {project.klant.naam} — {project.klant.bedrijf}
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Select value={project.status} onValueChange={v => handleStatusChange(v ?? 'gepland')}>
                  <SelectTrigger className="h-7 w-auto border-0 bg-white/20 text-white text-xs backdrop-blur-sm">
                    {PROJECT_STATUSSEN.find(s => s.value === project.status)?.label}
                  </SelectTrigger>
                  <SelectContent>{PROJECT_STATUSSEN.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
                <BedrijfBadge tag={project.bedrijf_tag} />
              </div>
            </div>
            <div className="flex gap-6">
              {project.budget && (
                <div className="text-right"><p className="text-white/50 text-[11px] uppercase tracking-wider">Budget</p>
                  <p className="text-white text-lg font-semibold">{formatValuta(project.budget)}</p></div>
              )}
              {project.start_datum && (
                <div className="text-right"><p className="text-white/50 text-[11px] uppercase tracking-wider">Periode</p>
                  <p className="text-white text-sm">{formatDatum(project.start_datum)} {project.eind_datum ? `— ${formatDatum(project.eind_datum)}` : ''}</p></div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {project.omschrijving && (
            <Card className="card-base"><CardContent className="p-5">
              <h3 className="section-header mb-2">Omschrijving</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.omschrijving}</p>
            </CardContent></Card>
          )}
          <Card className="card-base"><CardContent className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {project.eigenaar && <div><p className="text-[11px] text-muted-foreground uppercase">Eigenaar</p><p className="font-medium flex items-center gap-1"><User2 className="w-3 h-3" />{project.eigenaar.full_name}</p></div>}
              {project.start_datum && <div><p className="text-[11px] text-muted-foreground uppercase">Start</p><p className="font-medium flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDatum(project.start_datum)}</p></div>}
              {project.eind_datum && <div><p className="text-[11px] text-muted-foreground uppercase">Eind</p><p className="font-medium flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDatum(project.eind_datum)}</p></div>}
              {project.budget && <div><p className="text-[11px] text-muted-foreground uppercase">Budget</p><p className="font-medium flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatValuta(project.budget)}</p></div>}
            </div>
          </CardContent></Card>
        </div>
        <div className="space-y-6">
          <Card className="card-base overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/50 bg-muted/20"><CardTitle className="section-header">Taken</CardTitle></CardHeader>
            <CardContent className="pt-4"><TakenSectie gerelateerType="project" gerelateerdeId={id} /></CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
