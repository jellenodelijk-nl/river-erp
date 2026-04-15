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
import { Plus, Search, CheckCircle, Circle, Clock, Loader2, Link2 } from 'lucide-react'
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

interface SearchResult {
  id: string
  naam: string
  type: TaakGerelateerd
  label: string
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
  const [gerelateerType, setGerelateerType] = useState<TaakGerelateerd>('geen')
  const [gerelateerdeId, setGerelateerdeId] = useState('')
  const [relatieZoek, setRelatieZoek] = useState('')
  const [relatieResults, setRelatieResults] = useState<SearchResult[]>([])
  const [gekozenRelatie, setGekozenRelatie] = useState<SearchResult | null>(null)

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

  // Search klanten/leads when typing
  useEffect(() => {
    if (relatieZoek.length < 2) { setRelatieResults([]); return }
    const s = relatieZoek.toLowerCase()

    async function search() {
      const results: SearchResult[] = []

      const { data: klanten } = await supabase.from('klanten').select('id, naam, bedrijf').or(`naam.ilike.%${s}%,bedrijf.ilike.%${s}%`).limit(5)
      klanten?.forEach(k => results.push({ id: k.id, naam: `${k.naam} — ${k.bedrijf}`, type: 'klant', label: 'Klant' }))

      const { data: sales } = await supabase.from('sales_leads').select('id, naam, bedrijf').or(`naam.ilike.%${s}%,bedrijf.ilike.%${s}%`).limit(5)
      sales?.forEach(l => results.push({ id: l.id, naam: `${l.naam} — ${l.bedrijf}`, type: 'sales_lead', label: 'Sales lead' }))

      const { data: campagne } = await supabase.from('campagne_leads').select('id, naam, bedrijf').or(`naam.ilike.%${s}%,bedrijf.ilike.%${s}%`).limit(5)
      campagne?.forEach(l => results.push({ id: l.id, naam: `${l.naam} — ${l.bedrijf}`, type: 'campagne_lead', label: 'Campagne lead' }))

      setRelatieResults(results)
    }
    search()
  }, [relatieZoek, supabase])

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
      gerelateerd_type: gekozenRelatie?.type || 'geen',
      gerelateerd_id: gekozenRelatie?.id || null,
    })
    if (error) toast.error('Fout: ' + error.message)
    else {
      toast.success('Taak aangemaakt')
      setCreateOpen(false)
      setTitel(''); setOmschrijving(''); setDeadline(''); setGekozenRelatie(null); setRelatieZoek('')
      fetchTaken()
    }
    setSaving(false)
  }

  function getGerelateerdeLink(taak: Taak) {
    if (taak.gerelateerd_type === 'geen' || !taak.gerelateerd_id) return null
    const routes: Record<string, string> = {
      campagne_lead: '/campagne-leads',
      sales_lead: '/sales-leads',
      klant: '/klanten',
      project: '/projecten',
      ops_item: '/ops',
    }
    const base = routes[taak.gerelateerd_type] || '/klanten'
    return `${base}/${taak.gerelateerd_id}`
  }

  const typeLabels: Record<string, string> = {
    campagne_lead: 'Campagne lead',
    sales_lead: 'Sales lead',
    klant: 'Klant',
    project: 'Project',
    ops_item: 'Ops',
    geen: '-',
  }

  const toegewezenNaam = users.find(u => u.id === toegewezenAan)?.full_name
  const prioriteitLabel = PRIORITEITEN.find(p => p.value === prioriteit)?.label

  return (
    <>
      <PageHeader title="Taken" description="Beheer alle taken">
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] hover:from-[#2F57AA] hover:to-[#254A99] shadow-md shadow-[#3A6FD8]/15 text-sm" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nieuwe taak
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <Input placeholder="Zoek op titel..." value={zoek} onChange={(e) => setZoek(e.target.value)} className="pl-8 h-9 text-sm w-[200px]" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v ?? 'alle') as TaakStatus | 'alle')}>
          <SelectTrigger className="h-9 text-sm w-[140px]">
            {statusFilter === 'alle' ? 'Alle statussen' : TAAK_STATUSSEN.find(s => s.value === statusFilter)?.label}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle statussen</SelectItem>
            {TAAK_STATUSSEN.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={prioriteitFilter} onValueChange={(v) => setPrioriteitFilter((v ?? 'alle') as TaakPrioriteit | 'alle')}>
          <SelectTrigger className="h-9 text-sm w-[140px]">
            {prioriteitFilter === 'alle' ? 'Alle prioriteiten' : PRIORITEITEN.find(p => p.value === prioriteitFilter)?.label}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle prioriteiten</SelectItem>
            {PRIORITEITEN.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={eigenaarFilter} onValueChange={(v) => setEigenaarFilter(v ?? 'alle')}>
          <SelectTrigger className="h-9 text-sm w-[160px]">
            {eigenaarFilter === 'alle' ? 'Iedereen' : users.find(u => u.id === eigenaarFilter)?.full_name}
          </SelectTrigger>
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
          <div className="bg-white border border-[#E5E7EB]/80 rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[#FAFBFC] to-white">
                  <TableHead className="text-xs font-semibold w-10"></TableHead>
                  <TableHead className="text-xs font-semibold">Titel</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Gekoppeld aan</TableHead>
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
                  <TableRow key={taak.id} className="hover:bg-[#F0F4FF]/30 transition-colors">
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
                        <Link href={getGerelateerdeLink(taak)!} className="text-xs text-[#3A6FD8] hover:underline flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          {taak.gerelateerd_type === 'klant' ? 'Klant' : taak.gerelateerd_type === 'sales_lead' ? 'Sales lead' : 'Campagne lead'}
                        </Link>
                      ) : <span className="text-xs text-[#D1D5DB]">-</span>}
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
                      <Select value={taak.status} onValueChange={(v) => handleStatusChange(taak.id, (v ?? 'open') as TaakStatus)}>
                        <SelectTrigger className="h-7 text-xs w-[110px] border-0 bg-transparent">
                          {TAAK_STATUSSEN.find(s => s.value === taak.status)?.label}
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
        <DialogContent className="sm:!max-w-xl">
          <DialogHeader><DialogTitle>Nieuwe taak</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Titel *</Label>
              <Input value={titel} onChange={(e) => setTitel(e.target.value)} required className="h-9 text-sm" placeholder="Wat moet er gebeuren?" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Omschrijving</Label>
              <Textarea value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} className="text-sm min-h-[60px]" placeholder="Extra details..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B7280]">Deadline</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#6B7280]">Prioriteit</Label>
                <Select value={prioriteit} onValueChange={(v) => setPrioriteit((v ?? 'normaal') as TaakPrioriteit)}>
                  <SelectTrigger className="h-9 text-sm">{prioriteitLabel}</SelectTrigger>
                  <SelectContent>
                    {PRIORITEITEN.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Toegewezen aan</Label>
              <Select value={toegewezenAan} onValueChange={(v) => setToegewezenAan(v ?? '')}>
                <SelectTrigger className="h-9 text-sm">
                  {toegewezenNaam || <span className="text-[#9CA3AF]">Selecteer...</span>}
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Koppelen aan klant/lead */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#6B7280]">Koppelen aan klant of lead</Label>
              {gekozenRelatie ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F0F4FF] border border-[#C9D9FF]">
                  <Link2 className="w-4 h-4 text-[#3A6FD8] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0B0D0E] truncate">{gekozenRelatie.naam}</p>
                    <p className="text-[11px] text-[#6B7280]">{gekozenRelatie.label}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="text-xs text-[#6B7280] shrink-0" onClick={() => { setGekozenRelatie(null); setRelatieZoek('') }}>
                    Verwijderen
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <Input
                    value={relatieZoek}
                    onChange={(e) => setRelatieZoek(e.target.value)}
                    placeholder="Zoek op klant- of bedrijfsnaam..."
                    className="pl-8 h-9 text-sm"
                  />
                  {relatieResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                      {relatieResults.map(r => (
                        <button
                          key={`${r.type}-${r.id}`}
                          type="button"
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#F0F4FF] transition-colors text-left"
                          onClick={() => {
                            setGekozenRelatie(r)
                            setRelatieZoek('')
                            setRelatieResults([])
                          }}
                        >
                          <span className="text-sm text-[#0B0D0E] truncate">{r.naam}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0 ml-2">{r.label}</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
