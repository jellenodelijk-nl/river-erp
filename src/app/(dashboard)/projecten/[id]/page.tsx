'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
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
  ArrowLeft, FolderKanban, Calendar, User2, Plus, Loader2,
  CheckCircle, Circle, Clock, ChevronDown, ChevronRight, Search,
} from 'lucide-react'
import { formatDatum } from '@/lib/format'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import type { Project, ProjectStatus, BedrijfTag, Taak, TaakStatus, TaakPrioriteit, User } from '@/lib/types'
import { PROJECT_STATUSSEN, PRIORITEITEN } from '@/lib/types'

const taakStatusIcons: Record<TaakStatus, React.ReactNode> = {
  open: <Circle className="w-4 h-4 text-muted-foreground" />,
  in_progress: <Clock className="w-4 h-4 text-yellow-600" />,
  afgerond: <CheckCircle className="w-4 h-4 text-green-600" />,
}

function TaakRij({ taak, subtaken, onToggle, onAddSub, onEdit, users }: {
  taak: Taak
  subtaken: Taak[]
  onToggle: (id: string, status: TaakStatus) => void
  onAddSub: (parentId: string) => void
  onEdit: (taak: Taak) => void
  users: User[]
}) {
  const [open, setOpen] = useState(subtaken.length > 0)
  const hasSubtaken = subtaken.length > 0

  return (
    <div className="border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 p-3 hover:bg-accent/30 transition-colors group">
        <button className="shrink-0 w-5 flex justify-center" onClick={() => setOpen(!open)}>
          {hasSubtaken ? (
            open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          ) : <span className="w-3.5" />}
        </button>
        <button onClick={() => onToggle(taak.id, taak.status === 'afgerond' ? 'open' : 'afgerond')} className="shrink-0">
          {taakStatusIcons[taak.status]}
        </button>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onEdit(taak)}>
          <p className={`text-sm font-medium ${taak.status === 'afgerond' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{taak.titel}</p>
          {taak.omschrijving && <p className="text-[11px] text-muted-foreground truncate">{taak.omschrijving}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {taak.toegewezen_gebruiker && <span className="text-[11px] text-muted-foreground hidden md:block">{taak.toegewezen_gebruiker.full_name}</span>}
          {taak.deadline && <span className="text-[11px] text-muted-foreground">{formatDatum(taak.deadline)}</span>}
          {taak.prioriteit === 'hoog' && <Badge variant="outline" className="text-[10px] border-red-200 text-red-600">Hoog</Badge>}
          <button onClick={() => onAddSub(taak.id)} className="text-muted-foreground/30 hover:text-primary transition-colors opacity-0 group-hover:opacity-100" title="Subtaak toevoegen">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subtaken */}
      <AnimatePresence initial={false}>
        {open && subtaken.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className="ml-9 border-l border-border/40">
              {subtaken.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 p-2 pl-3 hover:bg-accent/20 transition-colors cursor-pointer" onClick={() => onEdit(sub)}>
                  <button onClick={(e) => { e.stopPropagation(); onToggle(sub.id, sub.status === 'afgerond' ? 'open' : 'afgerond') }} className="shrink-0">
                    {taakStatusIcons[sub.status]}
                  </button>
                  <p className={`text-xs flex-1 ${sub.status === 'afgerond' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{sub.titel}</p>
                  {sub.deadline && <span className="text-[10px] text-muted-foreground">{formatDatum(sub.deadline)}</span>}
                  {sub.toegewezen_gebruiker && <span className="text-[10px] text-muted-foreground hidden md:block">{sub.toegewezen_gebruiker.full_name}</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuth()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [taken, setTaken] = useState<Taak[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [klanten, setKlanten] = useState<{ id: string; naam: string; bedrijf: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [taakOpen, setTaakOpen] = useState(false)
  const [taakEditOpen, setTaakEditOpen] = useState(false)
  const [editTaak, setEditTaak] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [klantZoek, setKlantZoek] = useState('')

  // Taak form
  const [taakTitel, setTaakTitel] = useState('')
  const [taakParentId, setTaakParentId] = useState<string | null>(null)
  const [taakOmschrijving, setTaakOmschrijving] = useState('')
  const [taakDeadline, setTaakDeadline] = useState('')
  const [taakPrioriteit, setTaakPrioriteit] = useState<TaakPrioriteit>('normaal')
  const [taakEigenaar, setTaakEigenaar] = useState('')

  useEffect(() => {
    async function fetchData() {
      const [projRes, takenRes, usersRes, klantenRes] = await Promise.all([
        supabase.from('projecten').select('*, klant:klanten(*), eigenaar:users(*)').eq('id', id).single(),
        supabase.from('taken').select('*, toegewezen_gebruiker:users!taken_toegewezen_aan_fkey(*)').eq('gerelateerd_type', 'project').eq('gerelateerd_id', id).order('created_at', { ascending: true }),
        supabase.from('users').select('*'),
        supabase.from('klanten').select('id, naam, bedrijf'),
      ])
      setProject(projRes.data)
      setTaken(takenRes.data || [])
      setUsers(usersRes.data || [])
      setKlanten(klantenRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [id, supabase])

  useEffect(() => { if (user && !taakEigenaar) setTaakEigenaar(user.id) }, [user, taakEigenaar])

  const hoofdTaken = taken.filter(t => !t.parent_id)
  const subtakenMap = taken.reduce<Record<string, Taak[]>>((acc, t) => {
    if (t.parent_id) { if (!acc[t.parent_id]) acc[t.parent_id] = []; acc[t.parent_id].push(t) }
    return acc
  }, {})

  const afgerond = taken.filter(t => t.status === 'afgerond').length
  const totaal = taken.length

  async function handleToggle(taakId: string, newStatus: TaakStatus) {
    setTaken(prev => prev.map(t => t.id === taakId ? { ...t, status: newStatus } : t))
    await supabase.from('taken').update({ status: newStatus }).eq('id', taakId)
  }

  function openTaakForm(parentId: string | null) {
    setTaakParentId(parentId)
    setTaakTitel('')
    setTaakOpen(true)
  }

  async function handleTaakCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('taken').insert({
      titel: taakTitel,
      omschrijving: taakOmschrijving || null,
      deadline: taakDeadline || null,
      toegewezen_aan: taakEigenaar || null,
      gerelateerd_type: 'project',
      gerelateerd_id: id,
      parent_id: taakParentId,
      prioriteit: taakPrioriteit,
    })
    if (error) toast.error('Fout: ' + error.message)
    else {
      toast.success(taakParentId ? 'Subtaak toegevoegd' : 'Taak toegevoegd')
      setTaakOpen(false)
      const { data } = await supabase.from('taken').select('*, toegewezen_gebruiker:users!taken_toegewezen_aan_fkey(*)').eq('gerelateerd_type', 'project').eq('gerelateerd_id', id).order('created_at', { ascending: true })
      setTaken(data || [])
    }
    setSaving(false)
  }

  function openTaakEdit(taak: Taak) {
    setEditTaak({
      id: taak.id,
      titel: taak.titel || '',
      omschrijving: taak.omschrijving || '',
      deadline: taak.deadline || '',
      prioriteit: taak.prioriteit || 'normaal',
      status: taak.status || 'open',
      toegewezen_aan: taak.toegewezen_aan || '',
    })
    setTaakEditOpen(true)
  }

  async function handleTaakEditSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('taken').update({
      titel: editTaak.titel,
      omschrijving: editTaak.omschrijving || null,
      deadline: editTaak.deadline || null,
      prioriteit: editTaak.prioriteit,
      status: editTaak.status,
      toegewezen_aan: editTaak.toegewezen_aan || null,
    }).eq('id', editTaak.id)
    if (error) toast.error('Opslaan mislukt')
    else {
      toast.success('Taak bijgewerkt'); setTaakEditOpen(false)
      const { data } = await supabase.from('taken').select('*, toegewezen_gebruiker:users!taken_toegewezen_aan_fkey(*)').eq('gerelateerd_type', 'project').eq('gerelateerd_id', id).order('created_at', { ascending: true })
      setTaken(data || [])
    }
    setSaving(false)
  }

  function openEdit() {
    if (!project) return
    setEditForm({
      titel: project.titel || '', omschrijving: project.omschrijving || '',
      status: project.status, eigenaar_id: project.eigenaar_id || '',
      klant_id: project.klant_id || '', start_datum: project.start_datum || '',
      eind_datum: project.eind_datum || '', bedrijf_tag: project.bedrijf_tag || 'river_digital',
    })
    setEditOpen(true)
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('projecten').update({
      titel: editForm.titel, omschrijving: editForm.omschrijving || null,
      status: editForm.status as ProjectStatus, eigenaar_id: editForm.eigenaar_id || null,
      klant_id: editForm.klant_id || null, start_datum: editForm.start_datum || null,
      eind_datum: editForm.eind_datum || null, bedrijf_tag: editForm.bedrijf_tag as BedrijfTag,
    }).eq('id', id)
    if (error) toast.error('Opslaan mislukt')
    else {
      toast.success('Project bijgewerkt'); setEditOpen(false)
      const { data } = await supabase.from('projecten').select('*, klant:klanten(*), eigenaar:users(*)').eq('id', id).single()
      setProject(data)
    }
    setSaving(false)
  }

  async function handleStatusChange(newStatus: string) {
    if (!project) return
    await supabase.from('projecten').update({ status: newStatus }).eq('id', id)
    setProject({ ...project, status: newStatus as ProjectStatus })
  }

  const filteredKlanten = klantZoek.length >= 2
    ? klanten.filter(k => k.naam.toLowerCase().includes(klantZoek.toLowerCase()) || k.bedrijf.toLowerCase().includes(klantZoek.toLowerCase())).slice(0, 8)
    : []

  if (loading) return <div className="space-y-4"><Skeleton className="h-48 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>
  if (!project) return <p className="text-muted-foreground">Project niet gevonden</p>

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
                    <Link href={`/klanten/${project.klant_id}`} className="text-white/70 text-sm hover:text-white">{project.klant.naam} — {project.klant.bedrijf}</Link>
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
                <Button variant="ghost" size="sm" onClick={openEdit} className="text-white/80 hover:text-white hover:bg-white/10 text-xs">Bewerken</Button>
              </div>
            </div>
            <div className="flex gap-6">
              {project.eigenaar && <div className="text-right"><p className="text-white/50 text-[11px] uppercase">Eigenaar</p><p className="text-white text-sm">{project.eigenaar.full_name}</p></div>}
              {project.start_datum && <div className="text-right"><p className="text-white/50 text-[11px] uppercase">Periode</p><p className="text-white text-sm">{formatDatum(project.start_datum)}{project.eind_datum ? ` — ${formatDatum(project.eind_datum)}` : ''}</p></div>}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Omschrijving + Taken — 1 blok */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="card-base overflow-hidden">
          {/* Omschrijving */}
          {project.omschrijving && (
            <div className="p-5 border-b border-border/50">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.omschrijving}</p>
            </div>
          )}

          {/* Taken header */}
          <CardHeader className="pb-2 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
            <CardTitle className="section-header flex items-center gap-2">
              Taken
              {totaal > 0 && (
                <span className="text-[11px] text-muted-foreground font-normal ml-1">{afgerond}/{totaal} afgerond</span>
              )}
              {totaal > 0 && (
                <div className="w-20 h-1.5 rounded-full bg-muted ml-2 overflow-hidden">
                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(afgerond / totaal) * 100}%` }} />
                </div>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => openTaakForm(null)} className="text-xs">
              <Plus className="w-3 h-3 mr-1" /> Taak
            </Button>
          </CardHeader>

          {/* Taken lijst */}
          <CardContent className="p-0">
            {hoofdTaken.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Nog geen taken</p>
                <Button variant="ghost" size="sm" onClick={() => openTaakForm(null)} className="mt-2 text-xs text-primary">
                  <Plus className="w-3 h-3 mr-1" /> Eerste taak toevoegen
                </Button>
              </div>
            ) : (
              hoofdTaken.map(taak => (
                <TaakRij key={taak.id} taak={taak} subtaken={subtakenMap[taak.id] || []}
                  onToggle={handleToggle} onAddSub={openTaakForm} onEdit={openTaakEdit} users={users} />
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Nieuwe taak/subtaak dialog */}
      <Dialog open={taakOpen} onOpenChange={setTaakOpen}>
        <DialogContent className="sm:!max-w-md">
          <DialogHeader><DialogTitle>{taakParentId ? 'Nieuwe subtaak' : 'Nieuwe taak'}</DialogTitle></DialogHeader>
          <form onSubmit={handleTaakCreate} className="space-y-4 py-2">
            {/* Show parent taak if subtaak */}
            {taakParentId && (() => {
              const parent = taken.find(t => t.id === taakParentId)
              return parent ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent border border-primary/20">
                  <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Subtaak van:</p>
                    <p className="text-sm font-medium text-foreground">{parent.titel}</p>
                  </div>
                </div>
              ) : null
            })()}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Titel *</Label>
              <Input value={taakTitel} onChange={e => setTaakTitel(e.target.value)} required className="h-9 text-sm" placeholder="Wat moet er gebeuren?" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Omschrijving</Label>
              <Textarea value={taakOmschrijving} onChange={e => setTaakOmschrijving(e.target.value)} className="text-sm min-h-[50px]" placeholder="Extra details..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Deadline</Label>
                <Input type="date" value={taakDeadline} onChange={e => setTaakDeadline(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Prioriteit</Label>
                <Select value={taakPrioriteit} onValueChange={v => setTaakPrioriteit((v ?? 'normaal') as TaakPrioriteit)}>
                  <SelectTrigger className="h-9 text-sm">{PRIORITEITEN.find(p => p.value === taakPrioriteit)?.label}</SelectTrigger>
                  <SelectContent>{PRIORITEITEN.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Toewijzen aan</Label>
                <Select value={taakEigenaar} onValueChange={v => setTaakEigenaar(v ?? '')}>
                  <SelectTrigger className="h-9 text-sm">{users.find(u => u.id === taakEigenaar)?.full_name || 'Selecteer...'}</SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTaakOpen(false)}>Annuleren</Button>
              <Button type="submit" className="bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] shadow-md shadow-[#3A6FD8]/15" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Toevoegen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit project dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:!max-w-2xl !w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Project bewerken</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Titel *</Label>
                <Input value={editForm.titel || ''} onChange={e => setEditForm(p => ({...p, titel: e.target.value}))} required className="h-9 text-sm" /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Omschrijving</Label>
                <Textarea value={editForm.omschrijving || ''} onChange={e => setEditForm(p => ({...p, omschrijving: e.target.value}))} className="text-sm min-h-[60px]" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(p => ({...p, status: v ?? 'gepland'}))}><SelectTrigger className="h-9 text-sm">{PROJECT_STATUSSEN.find(s => s.value === editForm.status)?.label}</SelectTrigger>
                <SelectContent>{PROJECT_STATUSSEN.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Eigenaar</Label>
                <Select value={editForm.eigenaar_id} onValueChange={v => setEditForm(p => ({...p, eigenaar_id: v ?? ''}))}><SelectTrigger className="h-9 text-sm">{users.find(u => u.id === editForm.eigenaar_id)?.full_name || 'Selecteer...'}</SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Klant</Label>
                {editForm.klant_id ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-accent border border-primary/20 h-9">
                    <span className="text-sm flex-1 truncate">{klanten.find(k => k.id === editForm.klant_id)?.naam}</span>
                    <button type="button" className="text-xs text-muted-foreground" onClick={() => setEditForm(p => ({...p, klant_id: ''}))}>Wijzig</button>
                  </div>
                ) : (
                  <div className="relative"><Input value={klantZoek} onChange={e => setKlantZoek(e.target.value)} placeholder="Zoek klant..." className="h-9 text-sm" />
                    {filteredKlanten.length > 0 && <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-[150px] overflow-y-auto">
                      {filteredKlanten.map(k => <button key={k.id} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm" onClick={() => { setEditForm(p => ({...p, klant_id: k.id})); setKlantZoek('') }}>{k.naam} <span className="text-xs text-muted-foreground">— {k.bedrijf}</span></button>)}
                    </div>}</div>
                )}</div>
              <div className="space-y-1.5"><Label className="text-xs">Bedrijf tag</Label>
                <Select value={editForm.bedrijf_tag} onValueChange={v => setEditForm(p => ({...p, bedrijf_tag: v ?? 'river_digital'}))}><SelectTrigger className="h-9 text-sm">{editForm.bedrijf_tag === 'river_digital' ? 'River Digital' : 'River Software'}</SelectTrigger>
                <SelectContent><SelectItem value="river_digital">River Digital</SelectItem><SelectItem value="river_software">River Software</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Startdatum</Label>
                <Input type="date" value={editForm.start_datum || ''} onChange={e => setEditForm(p => ({...p, start_datum: e.target.value}))} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Einddatum</Label>
                <Input type="date" value={editForm.eind_datum || ''} onChange={e => setEditForm(p => ({...p, eind_datum: e.target.value}))} className="h-9 text-sm" /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Annuleren</Button>
              <Button type="submit" className="bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA]" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit taak dialog */}
      <Dialog open={taakEditOpen} onOpenChange={setTaakEditOpen}>
        <DialogContent className="sm:!max-w-md">
          <DialogHeader><DialogTitle>Taak bewerken</DialogTitle></DialogHeader>
          <form onSubmit={handleTaakEditSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Titel *</Label>
              <Input value={editTaak.titel || ''} onChange={e => setEditTaak(p => ({...p, titel: e.target.value}))} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Omschrijving</Label>
              <Textarea value={editTaak.omschrijving || ''} onChange={e => setEditTaak(p => ({...p, omschrijving: e.target.value}))} className="text-sm min-h-[50px]" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Deadline</Label>
                <Input type="date" value={editTaak.deadline || ''} onChange={e => setEditTaak(p => ({...p, deadline: e.target.value}))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Prioriteit</Label>
                <Select value={editTaak.prioriteit} onValueChange={v => setEditTaak(p => ({...p, prioriteit: v ?? 'normaal'}))}>
                  <SelectTrigger className="h-9 text-sm">{PRIORITEITEN.find(pr => pr.value === editTaak.prioriteit)?.label}</SelectTrigger>
                  <SelectContent>{PRIORITEITEN.map(pr => <SelectItem key={pr.value} value={pr.value}>{pr.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <Select value={editTaak.status} onValueChange={v => setEditTaak(p => ({...p, status: v ?? 'open'}))}>
                  <SelectTrigger className="h-9 text-sm">{editTaak.status === 'open' ? 'Open' : editTaak.status === 'in_progress' ? 'In progress' : 'Afgerond'}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="afgerond">Afgerond</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Toegewezen aan</Label>
              <Select value={editTaak.toegewezen_aan} onValueChange={v => setEditTaak(p => ({...p, toegewezen_aan: v ?? ''}))}>
                <SelectTrigger className="h-9 text-sm">{users.find(u => u.id === editTaak.toegewezen_aan)?.full_name || 'Selecteer...'}</SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTaakEditOpen(false)}>Annuleren</Button>
              <Button type="submit" className="bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] shadow-md shadow-[#3A6FD8]/15" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Opslaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
