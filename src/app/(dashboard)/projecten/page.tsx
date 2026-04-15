'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { PageHeader } from '@/components/page-header'
import { BedrijfFilter } from '@/components/bedrijf-filter'
import { BedrijfBadge } from '@/components/bedrijf-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, Loader2, FolderKanban, Calendar, DollarSign } from 'lucide-react'
import { formatDatum, formatValuta } from '@/lib/format'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Project, ProjectStatus, BedrijfTag, User, Klant } from '@/lib/types'
import { PROJECT_STATUSSEN } from '@/lib/types'

const statusColors: Record<ProjectStatus, string> = {
  gepland: 'bg-blue-100 text-blue-800',
  actief: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  afgerond: 'bg-gray-100 text-gray-800',
  geannuleerd: 'bg-red-100 text-red-800',
}

export default function ProjectenPage() {
  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuth()
  const [projecten, setProjecten] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [klanten, setKlanten] = useState<{ id: string; naam: string; bedrijf: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [bedrijfFilter, setBedrijfFilter] = useState<BedrijfTag | 'alle'>('alle')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'alle'>('alle')
  const [zoek, setZoek] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form
  const [titel, setTitel] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('gepland')
  const [klantId, setKlantId] = useState('')
  const [klantZoek, setKlantZoek] = useState('')
  const [startDatum, setStartDatum] = useState('')
  const [eindDatum, setEindDatum] = useState('')
  const [eigenaarId, setEigenaarId] = useState('')
  const [tag, setTag] = useState<BedrijfTag>('river_digital')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [projRes, usersRes, klantenRes] = await Promise.all([
      supabase.from('projecten').select('*, klant:klanten(*), eigenaar:users(*)').order('created_at', { ascending: false }),
      supabase.from('users').select('*'),
      supabase.from('klanten').select('id, naam, bedrijf'),
    ])
    setProjecten(projRes.data || [])
    setUsers(usersRes.data || [])
    setKlanten(klantenRes.data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { if (user && !eigenaarId) setEigenaarId(user.id) }, [user, eigenaarId])

  const filtered = projecten
    .filter(p => bedrijfFilter === 'alle' || p.bedrijf_tag === bedrijfFilter)
    .filter(p => statusFilter === 'alle' || p.status === statusFilter)
    .filter(p => !zoek || p.titel.toLowerCase().includes(zoek.toLowerCase()) || (p.klant?.naam || '').toLowerCase().includes(zoek.toLowerCase()))

  const actief = filtered.filter(p => p.status === 'actief').length

  const filteredKlanten = klantZoek.length >= 2
    ? klanten.filter(k => k.naam.toLowerCase().includes(klantZoek.toLowerCase()) || k.bedrijf.toLowerCase().includes(klantZoek.toLowerCase())).slice(0, 8)
    : []

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('projecten').insert({
      titel, omschrijving: omschrijving || null, status,
      klant_id: klantId || null, eigenaar_id: eigenaarId || null,
      start_datum: startDatum || null, eind_datum: eindDatum || null,
      bedrijf_tag: tag,
    })
    if (error) toast.error('Fout: ' + error.message)
    else {
      toast.success('Project aangemaakt')
      setCreateOpen(false)
      setTitel(''); setOmschrijving(''); setKlantId(''); setStartDatum(''); setEindDatum(''); setKlantZoek('')
      fetchData()
    }
    setSaving(false)
  }

  return (
    <>
      <PageHeader title="Projecten" description="Beheer alle projecten">
        <BedrijfFilter value={bedrijfFilter} onChange={setBedrijfFilter} />
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] shadow-md shadow-[#3A6FD8]/15 text-sm" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nieuw project
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input placeholder="Zoek project of klant..." value={zoek} onChange={e => setZoek(e.target.value)} className="pl-8 h-9 text-sm w-[220px]" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter((v ?? 'alle') as ProjectStatus | 'alle')}>
          <SelectTrigger className="h-9 text-sm w-[140px]">
            {statusFilter === 'alle' ? 'Alle statussen' : PROJECT_STATUSSEN.find(s => s.value === statusFilter)?.label}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle statussen</SelectItem>
            {PROJECT_STATUSSEN.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {!loading && (
          <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
            <span>{filtered.length} projecten</span>
            <span>·</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{actief} actief</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><FolderKanban className="empty-state-icon" /><p className="text-muted-foreground">Geen projecten gevonden</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="card-interactive" onClick={() => router.push(`/projecten/${p.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">{p.titel}</h3>
                      {p.klant && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{p.klant.naam} — {p.klant.bedrijf}</p>}
                    </div>
                    <Badge className={`text-[10px] shrink-0 ml-2 ${statusColors[p.status]}`}>
                      {PROJECT_STATUSSEN.find(s => s.value === p.status)?.label}
                    </Badge>
                  </div>
                  {p.omschrijving && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.omschrijving}</p>}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    {p.start_datum && (
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDatum(p.start_datum)}</span>
                    )}
                    {p.eigenaar && <span>{p.eigenaar.full_name}</span>}
                  </div>
                  <div className="mt-3"><BedrijfBadge tag={p.bedrijf_tag} /></div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Nieuw project dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:!max-w-xl">
          <DialogHeader><DialogTitle>Nieuw project</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Titel *</Label>
              <Input value={titel} onChange={e => setTitel(e.target.value)} required className="h-9 text-sm" placeholder="Projectnaam" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Omschrijving</Label>
              <Textarea value={omschrijving} onChange={e => setOmschrijving(e.target.value)} className="text-sm min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Klant</Label>
              {klantId ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-accent border border-primary/20">
                  <span className="text-sm flex-1">{klanten.find(k => k.id === klantId)?.naam}</span>
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-6" onClick={() => { setKlantId(''); setKlantZoek('') }}>Wijzig</Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <Input value={klantZoek} onChange={e => setKlantZoek(e.target.value)} placeholder="Zoek klant..." className="pl-8 h-9 text-sm" />
                  {filteredKlanten.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-[180px] overflow-y-auto">
                      {filteredKlanten.map(k => (
                        <button key={k.id} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors"
                          onClick={() => { setKlantId(k.id); setKlantZoek('') }}>
                          {k.naam} <span className="text-muted-foreground text-xs">— {k.bedrijf}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={v => setStatus((v ?? 'gepland') as ProjectStatus)}>
                  <SelectTrigger className="h-9 text-sm">{PROJECT_STATUSSEN.find(s => s.value === status)?.label}</SelectTrigger>
                  <SelectContent>{PROJECT_STATUSSEN.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Startdatum</Label>
                <Input type="date" value={startDatum} onChange={e => setStartDatum(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Einddatum</Label>
                <Input type="date" value={eindDatum} onChange={e => setEindDatum(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Eigenaar</Label>
                <Select value={eigenaarId} onValueChange={v => setEigenaarId(v ?? '')}>
                  <SelectTrigger className="h-9 text-sm">{users.find(u => u.id === eigenaarId)?.full_name || 'Selecteer...'}</SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Bedrijf tag</Label>
                <Select value={tag} onValueChange={v => setTag((v ?? 'river_digital') as BedrijfTag)}>
                  <SelectTrigger className="h-9 text-sm">{tag === 'river_digital' ? 'River Digital' : 'River Software'}</SelectTrigger>
                  <SelectContent><SelectItem value="river_digital">River Digital</SelectItem><SelectItem value="river_software">River Software</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuleren</Button>
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
