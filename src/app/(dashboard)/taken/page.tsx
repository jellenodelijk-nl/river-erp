'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, CheckCircle, Circle, Clock, Loader2 } from 'lucide-react'
import { formatDatum } from '@/lib/format'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { Taak, TaakStatus, TaakPrioriteit, TaakGerelateerd, User } from '@/lib/types'
import { TAAK_STATUSSEN, PRIORITEITEN } from '@/lib/types'

const statusIcons: Record<TaakStatus, React.ReactNode> = {
  open: <Circle className="w-4 h-4 text-[#6B7280]" />,
  in_progress: <Clock className="w-4 h-4 text-[#D97706]" />,
  afgerond: <CheckCircle className="w-4 h-4 text-[#059669]" />,
}

export default function TakenPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [taken, setTaken] = useState<Taak[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [zoek, setZoek] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaakStatus | 'alle'>('alle')
  const [prioriteitFilter, setPrioriteitFilter] = useState<TaakPrioriteit | 'alle'>('alle')
  const [eigenaarFilter, setEigenaarFilter] = useState('alle')
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form
  const [titel, setTitel] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [deadline, setDeadline] = useState('')
  const [prioriteit, setPrioriteit] = useState<TaakPrioriteit>('normaal')
  const [toegewezenAan, setToegewezenAan] = useState('')

  const fetchTaken = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('taken').select('*, toegewezen_gebruiker:users!taken_toegewezen_aan_fkey(*)').order('created_at', { ascending: false })
    if (statusFilter !== 'alle') query = query.eq('status', statusFilter)
    if (prioriteitFilter !== 'alle') query = query.eq('prioriteit', prioriteitFilter)
    if (eigenaarFilter !== 'alle') query = query.eq('toegewezen_aan', eigenaarFilter)

    const { data } = await query
    let filtered = data || []
    if (zoek) {
      const s = zoek.toLowerCase()
      filtered = filtered.filter(t => t.titel.toLowerCase().includes(s))
    }
    setTaken(filtered)
    setLoading(false)
  }, [supabase, statusFilter, prioriteitFilter, eigenaarFilter, zoek])

  useEffect(() => { fetchTaken() }, [fetchTaken])
  useEffect(() => {
    supabase.from('users').select('*').then(({ data }) => {
      setUsers(data || [])
      if (user && !toegewezenAan) setToegewezenAan(user.id)
    })
  }, [supabase, user, toegewezenAan])

  async function handleStatusChange(taakId: string, newStatus: TaakStatus) {
    setTaken(prev => prev.map(t => t.id === taakId ? { ...t, status: newStatus } : t))
    const { error } = await supabase.from('taken').update({ status: newStatus }).eq('id', taakId)
    if (error) { toast.error('Status wijzigen mislukt'); fetchTaken() }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('taken').insert({
      titel,
      omschrijving: omschrijving || null,
      toegewezen_aan: toegewezenAan || null,
      deadline: deadline || null,
      prioriteit,
      gerelateerd_type: 'geen',
    })
    if (error) toast.error('Fout: ' + error.message)
    else {
      toast.success('Taak aangemaakt')
      setCreateOpen(false)
      setTitel(''); setOmschrijving(''); setDeadline('')
      fetchTaken()
    }
    setSaving(false)
  }

  function getGerelateerdeLink(taak: Taak) {
    if (taak.gerelateerd_type === 'geen' || !taak.gerelateerd_id) return null
    const base = taak.gerelateerd_type === 'campagne_lead' ? '/campagne-leads' :
                 taak.gerelateerd_type === 'sales_lead' ? '/sales-leads' : '/klanten'
    return `${base}/${taak.gerelateerd_id}`
  }

  return (
    <>
      <PageHeader title="Taken" description="Beheer alle taken">
        <Button onClick={() => setCreateOpen(true)} className="bg-[#3A6FD8] hover:bg-[#2F57AA] text-sm" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nieuwe taak
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <Input placeholder="Zoek op titel..." value={zoek} onChange={(e) => setZoek(e.target.value)} className="pl-8 h-9 text-sm w-[200px]" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaakStatus | 'alle')}>
          <SelectTrigger className="h-9 text-sm w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle statussen</SelectItem>
            {TAAK_STATUSSEN.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={prioriteitFilter} onValueChange={(v) => setPrioriteitFilter(v as TaakPrioriteit | 'alle')}>
          <SelectTrigger className="h-9 text-sm w-[140px]"><SelectValue placeholder="Prioriteit" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle prioriteiten</SelectItem>
            {PRIORITEITEN.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={eigenaarFilter} onValueChange={(v) => setEigenaarFilter(v ?? 'alle')}>
          <SelectTrigger className="h-9 text-sm w-[160px]"><SelectValue placeholder="Toegewezen aan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Iedereen</SelectItem>
            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F4F6F7]">
                  <TableHead className="text-xs font-semibold w-10"></TableHead>
                  <TableHead className="text-xs font-semibold">Titel</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Gerelateerd aan</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Toegewezen aan</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Deadline</TableHead>
                  <TableHead className="text-xs font-semibold">Prioriteit</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taken.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-[#6B7280] py-8">Geen taken gevonden</TableCell></TableRow>
                ) : taken.map(taak => (
                  <TableRow key={taak.id} className="hover:bg-[#F4F6F7]">
                    <TableCell>
                      <button onClick={() => handleStatusChange(taak.id, taak.status === 'afgerond' ? 'open' : 'afgerond')}>
                        {statusIcons[taak.status]}
                      </button>
                    </TableCell>
                    <TableCell className={`text-sm font-medium ${taak.status === 'afgerond' ? 'line-through text-[#9CA3AF]' : ''}`}>
                      {taak.titel}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {getGerelateerdeLink(taak) ? (
                        <Link href={getGerelateerdeLink(taak)!} className="text-xs text-[#3A6FD8] hover:underline capitalize">
                          {taak.gerelateerd_type.replace('_', ' ')}
                        </Link>
                      ) : <span className="text-xs text-[#9CA3AF]">-</span>}
                    </TableCell>
                    <TableCell className="text-xs text-[#6B7280] hidden md:table-cell">
                      {taak.toegewezen_gebruiker?.full_name || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-[#6B7280] hidden lg:table-cell">
                      {taak.deadline ? formatDatum(taak.deadline) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${
                        taak.prioriteit === 'hoog' ? 'border-red-200 text-red-600' :
                        taak.prioriteit === 'normaal' ? 'border-yellow-200 text-yellow-600' :
                        'border-gray-200 text-gray-500'
                      }`}>{taak.prioriteit}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={taak.status} onValueChange={(v) => handleStatusChange(taak.id, v as TaakStatus)}>
                        <SelectTrigger className="h-7 text-xs w-[110px] border-0 bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TAAK_STATUSSEN.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nieuwe taak</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Titel *</Label>
              <Input value={titel} onChange={(e) => setTitel(e.target.value)} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Omschrijving</Label>
              <Textarea value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Deadline</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prioriteit</Label>
                <Select value={prioriteit} onValueChange={(v) => setPrioriteit(v as TaakPrioriteit)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITEITEN.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Toegewezen aan</Label>
              <Select value={toegewezenAan} onValueChange={(v) => setToegewezenAan(v ?? '')}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecteer..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuleren</Button>
              <Button type="submit" className="bg-[#3A6FD8] hover:bg-[#2F57AA]" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Aanmaken
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
