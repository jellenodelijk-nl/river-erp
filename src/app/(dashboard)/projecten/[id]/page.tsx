'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { TakenSectie } from '@/components/taken-sectie'
import { BedrijfBadge } from '@/components/bedrijf-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  ArrowLeft, FolderKanban, Calendar, DollarSign, User2, Plus, Loader2,
  ChevronRight, CheckCircle, Circle, Clock,
} from 'lucide-react'
import { formatDatum, formatValuta } from '@/lib/format'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { Project, ProjectStatus, BedrijfTag, User } from '@/lib/types'
import { PROJECT_STATUSSEN } from '@/lib/types'

const statusColors: Record<ProjectStatus, string> = {
  gepland: 'bg-blue-100 text-blue-800',
  actief: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  afgerond: 'bg-gray-100 text-gray-800',
  geannuleerd: 'bg-red-100 text-red-800',
}

const statusIcons: Record<ProjectStatus, React.ReactNode> = {
  gepland: <Circle className="w-3.5 h-3.5 text-blue-500" />,
  actief: <Clock className="w-3.5 h-3.5 text-green-500" />,
  on_hold: <Circle className="w-3.5 h-3.5 text-yellow-500" />,
  afgerond: <CheckCircle className="w-3.5 h-3.5 text-gray-400" />,
  geannuleerd: <Circle className="w-3.5 h-3.5 text-red-400" />,
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuth()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [subprojecten, setSubprojecten] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [subOpen, setSubOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Subproject form
  const [subTitel, setSubTitel] = useState('')
  const [subOmschrijving, setSubOmschrijving] = useState('')
  const [subStatus, setSubStatus] = useState<ProjectStatus>('gepland')
  const [subEigenaar, setSubEigenaar] = useState('')

  useEffect(() => {
    async function fetchData() {
      const [projRes, subRes, usersRes] = await Promise.all([
        supabase.from('projecten').select('*, klant:klanten(*), eigenaar:users(*)').eq('id', id).single(),
        supabase.from('projecten').select('*, eigenaar:users(*)').eq('parent_id', id).order('created_at', { ascending: true }),
        supabase.from('users').select('*'),
      ])
      setProject(projRes.data)
      setSubprojecten(subRes.data || [])
      setUsers(usersRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [id, supabase])

  useEffect(() => { if (user && !subEigenaar) setSubEigenaar(user.id) }, [user, subEigenaar])

  async function handleStatusChange(newStatus: string) {
    if (!project) return
    await supabase.from('projecten').update({ status: newStatus }).eq('id', id)
    setProject({ ...project, status: newStatus as ProjectStatus })
    toast.success('Status bijgewerkt')
  }

  async function handleSubCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!project) return
    setSaving(true)
    const { error } = await supabase.from('projecten').insert({
      parent_id: id,
      titel: subTitel,
      omschrijving: subOmschrijving || null,
      status: subStatus,
      eigenaar_id: subEigenaar || null,
      klant_id: project.klant_id,
      bedrijf_tag: project.bedrijf_tag,
    })
    if (error) toast.error('Fout: ' + error.message)
    else {
      toast.success('Subproject aangemaakt')
      setSubOpen(false); setSubTitel(''); setSubOmschrijving('')
      const { data } = await supabase.from('projecten').select('*, eigenaar:users(*)').eq('parent_id', id).order('created_at', { ascending: true })
      setSubprojecten(data || [])
    }
    setSaving(false)
  }

  async function handleSubStatusChange(subId: string, newStatus: ProjectStatus) {
    setSubprojecten(prev => prev.map(s => s.id === subId ? { ...s, status: newStatus } : s))
    await supabase.from('projecten').update({ status: newStatus }).eq('id', subId)
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-48 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>
  if (!project) return <p className="text-muted-foreground">Project niet gevonden</p>

  const parent = project.parent_id // if this IS a subproject

  return (
    <>
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 rounded-2xl overflow-hidden bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] p-6 md:p-8">
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 800 200" fill="none" className="w-full h-full" preserveAspectRatio="none">
            <path d="M-50 100C150 50 350 150 550 100C750 50 800 120 850 100" stroke="white" strokeWidth="60" />
          </svg>
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="sm" onClick={() => router.push(parent ? `/projecten/${parent}` : '/projecten')} className="text-white/80 hover:text-white hover:bg-white/10 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> {parent ? 'Terug naar project' : 'Terug'}
            </Button>
            {parent && (
              <Badge className="bg-white/20 text-white border-0 text-[10px]">Subproject</Badge>
            )}
          </div>
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
              {project.start_datum && (
                <div className="text-right"><p className="text-white/50 text-[11px] uppercase tracking-wider">Periode</p>
                  <p className="text-white text-sm">{formatDatum(project.start_datum)}{project.eind_datum ? ` — ${formatDatum(project.eind_datum)}` : ''}</p></div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Info */}
          {(project.omschrijving || project.eigenaar) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="card-base"><CardContent className="p-5">
                {project.omschrijving && (
                  <><h3 className="section-header mb-2">Omschrijving</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">{project.omschrijving}</p></>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {project.eigenaar && <div><p className="text-[11px] text-muted-foreground uppercase">Eigenaar</p><p className="font-medium flex items-center gap-1"><User2 className="w-3 h-3" />{project.eigenaar.full_name}</p></div>}
                  {project.start_datum && <div><p className="text-[11px] text-muted-foreground uppercase">Start</p><p className="font-medium">{formatDatum(project.start_datum)}</p></div>}
                  {project.eind_datum && <div><p className="text-[11px] text-muted-foreground uppercase">Eind</p><p className="font-medium">{formatDatum(project.eind_datum)}</p></div>}
                </div>
              </CardContent></Card>
            </motion.div>
          )}

          {/* Subprojecten */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="card-base overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
                <CardTitle className="section-header flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-primary" />
                  Subprojecten
                  {subprojecten.length > 0 && <Badge className="bg-primary/10 text-primary text-[10px]">{subprojecten.length}</Badge>}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setSubOpen(true)} className="text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Subproject
                </Button>
              </CardHeader>
              <CardContent className="pt-4">
                {subprojecten.length === 0 ? (
                  <div className="text-center py-6">
                    <FolderKanban className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Nog geen subprojecten</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">Splits het project op in kleinere delen</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subprojecten.map(sub => (
                      <div key={sub.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                        onClick={() => router.push(`/projecten/${sub.id}`)}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSubStatusChange(sub.id, sub.status === 'afgerond' ? 'actief' : 'afgerond')
                          }}
                          className="shrink-0"
                        >
                          {statusIcons[sub.status]}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${sub.status === 'afgerond' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {sub.titel}
                          </p>
                          {sub.omschrijving && <p className="text-[11px] text-muted-foreground truncate">{sub.omschrijving}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-[10px] ${statusColors[sub.status]}`}>
                            {PROJECT_STATUSSEN.find(s => s.value === sub.status)?.label}
                          </Badge>
                          {sub.eigenaar && <span className="text-[11px] text-muted-foreground hidden md:block">{sub.eigenaar.full_name}</span>}
                          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sidebar — Taken */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="card-base overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
                <CardTitle className="section-header">Taken</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <TakenSectie gerelateerType="project" gerelateerdeId={id} />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Nieuw subproject dialog */}
      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent className="sm:!max-w-md">
          <DialogHeader><DialogTitle>Nieuw subproject</DialogTitle></DialogHeader>
          <form onSubmit={handleSubCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Titel *</Label>
              <Input value={subTitel} onChange={e => setSubTitel(e.target.value)} required className="h-9 text-sm" placeholder="Subproject naam" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Omschrijving</Label>
              <Textarea value={subOmschrijving} onChange={e => setSubOmschrijving(e.target.value)} className="text-sm min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <Select value={subStatus} onValueChange={v => setSubStatus((v ?? 'gepland') as ProjectStatus)}>
                  <SelectTrigger className="h-9 text-sm">{PROJECT_STATUSSEN.find(s => s.value === subStatus)?.label}</SelectTrigger>
                  <SelectContent>{PROJECT_STATUSSEN.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Eigenaar</Label>
                <Select value={subEigenaar} onValueChange={v => setSubEigenaar(v ?? '')}>
                  <SelectTrigger className="h-9 text-sm">{users.find(u => u.id === subEigenaar)?.full_name || 'Selecteer...'}</SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSubOpen(false)}>Annuleren</Button>
              <Button type="submit" className="bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] shadow-md shadow-[#3A6FD8]/15" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Aanmaken
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
