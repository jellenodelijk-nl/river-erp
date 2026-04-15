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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, Loader2, Wrench, Circle, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { formatDatum } from '@/lib/format'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { OpsItem, OpsStatus, OpsPrioriteit, BedrijfTag, User, Klant } from '@/lib/types'
import { OPS_STATUSSEN, OPS_PRIORITEITEN } from '@/lib/types'

const statusIcons: Record<OpsStatus, React.ReactNode> = {
  open: <Circle className="w-4 h-4 text-muted-foreground" />,
  in_progress: <Clock className="w-4 h-4 text-yellow-600" />,
  wacht_op_klant: <AlertTriangle className="w-4 h-4 text-orange-500" />,
  afgerond: <CheckCircle className="w-4 h-4 text-green-600" />,
}

const prioriteitColors: Record<OpsPrioriteit, string> = {
  laag: 'border-gray-200 text-gray-500',
  normaal: 'border-yellow-200 text-yellow-600',
  hoog: 'border-red-200 text-red-600',
  urgent: 'border-red-400 text-red-700 bg-red-50',
}

export default function OpsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuth()
  const [items, setItems] = useState<OpsItem[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [klanten, setKlanten] = useState<{ id: string; naam: string; bedrijf: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [bedrijfFilter, setBedrijfFilter] = useState<BedrijfTag | 'alle'>('alle')
  const [statusFilter, setStatusFilter] = useState<OpsStatus | 'alle'>('alle')
  const [zoek, setZoek] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form
  const [titel, setTitel] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [opsStatus, setOpsStatus] = useState<OpsStatus>('open')
  const [prioriteit, setPrioriteit] = useState<OpsPrioriteit>('normaal')
  const [klantId, setKlantId] = useState('')
  const [klantZoek, setKlantZoek] = useState('')
  const [deadline, setDeadline] = useState('')
  const [eigenaarId, setEigenaarId] = useState('')
  const [tag, setTag] = useState<BedrijfTag>('river_digital')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [opsRes, usersRes, klantenRes] = await Promise.all([
      supabase.from('ops_items').select('*, klant:klanten(id, naam, bedrijf), eigenaar:users(*)').order('created_at', { ascending: false }),
      supabase.from('users').select('*'),
      supabase.from('klanten').select('id, naam, bedrijf'),
    ])
    setItems(opsRes.data || [])
    setUsers(usersRes.data || [])
    setKlanten(klantenRes.data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { if (user && !eigenaarId) setEigenaarId(user.id) }, [user, eigenaarId])

  const filtered = items
    .filter(i => bedrijfFilter === 'alle' || i.bedrijf_tag === bedrijfFilter)
    .filter(i => statusFilter === 'alle' || i.status === statusFilter)
    .filter(i => !zoek || i.titel.toLowerCase().includes(zoek.toLowerCase()))

  const openCount = filtered.filter(i => i.status !== 'afgerond').length

  const filteredKlanten = klantZoek.length >= 2
    ? klanten.filter(k => k.naam.toLowerCase().includes(klantZoek.toLowerCase()) || k.bedrijf.toLowerCase().includes(klantZoek.toLowerCase())).slice(0, 8)
    : []

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('ops_items').insert({
      titel, omschrijving: omschrijving || null, status: opsStatus, prioriteit,
      klant_id: klantId || null, eigenaar_id: eigenaarId || null,
      deadline: deadline || null, bedrijf_tag: tag,
    })
    if (error) toast.error('Fout: ' + error.message)
    else {
      toast.success('Ops item aangemaakt')
      setCreateOpen(false)
      setTitel(''); setOmschrijving(''); setKlantId(''); setDeadline(''); setKlantZoek('')
      fetchData()
    }
    setSaving(false)
  }

  async function handleStatusChange(itemId: string, newStatus: OpsStatus) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i))
    const { error } = await supabase.from('ops_items').update({ status: newStatus }).eq('id', itemId)
    if (error) { toast.error('Status wijzigen mislukt'); fetchData() }
  }

  return (
    <>
      <PageHeader title="Ops" description="Operationele items en onderhoud">
        <BedrijfFilter value={bedrijfFilter} onChange={setBedrijfFilter} />
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-[#1F8A9B] to-[#176C79] shadow-md shadow-[#1F8A9B]/15 text-sm" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nieuw ops item
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input placeholder="Zoek..." value={zoek} onChange={e => setZoek(e.target.value)} className="pl-8 h-9 text-sm w-[200px]" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter((v ?? 'alle') as OpsStatus | 'alle')}>
          <SelectTrigger className="h-9 text-sm w-[150px]">
            {statusFilter === 'alle' ? 'Alle statussen' : OPS_STATUSSEN.find(s => s.value === statusFilter)?.label}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle statussen</SelectItem>
            {OPS_STATUSSEN.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {!loading && (
          <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
            <span>{filtered.length} items</span><span>·</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />{openCount} open</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><Wrench className="empty-state-icon" /><p className="text-muted-foreground">Geen ops items gevonden</p></div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="card-base overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="text-[11px] font-semibold w-10"></TableHead>
                  <TableHead className="text-[11px] font-semibold">Titel</TableHead>
                  <TableHead className="text-[11px] font-semibold hidden md:table-cell">Klant</TableHead>
                  <TableHead className="text-[11px] font-semibold hidden md:table-cell">Eigenaar</TableHead>
                  <TableHead className="text-[11px] font-semibold hidden lg:table-cell">Deadline</TableHead>
                  <TableHead className="text-[11px] font-semibold">Prioriteit</TableHead>
                  <TableHead className="text-[11px] font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => router.push(`/ops/${item.id}`)}>
                    <TableCell>
                      <button onClick={(e) => { e.stopPropagation(); handleStatusChange(item.id, item.status === 'afgerond' ? 'open' : 'afgerond') }}>
                        {statusIcons[item.status]}
                      </button>
                    </TableCell>
                    <TableCell>
                      <p className={`text-sm font-medium ${item.status === 'afgerond' ? 'line-through text-muted-foreground' : ''}`}>{item.titel}</p>
                      {item.omschrijving && <p className="text-[11px] text-muted-foreground truncate max-w-[300px]">{item.omschrijving}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{item.klant?.naam || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{item.eigenaar?.full_name || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{item.deadline ? formatDatum(item.deadline) : '-'}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${prioriteitColors[item.prioriteit]}`}>{item.prioriteit}</Badge></TableCell>
                    <TableCell>
                      <Select value={item.status} onValueChange={v => { handleStatusChange(item.id, (v ?? 'open') as OpsStatus) }}>
                        <SelectTrigger className="h-7 text-xs w-[120px] border-0 bg-transparent" onClick={e => e.stopPropagation()}>
                          {OPS_STATUSSEN.find(s => s.value === item.status)?.label}
                        </SelectTrigger>
                        <SelectContent>{OPS_STATUSSEN.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
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
          <DialogHeader><DialogTitle>Nieuw ops item</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Titel *</Label>
              <Input value={titel} onChange={e => setTitel(e.target.value)} required className="h-9 text-sm" placeholder="Wat moet er gebeuren?" />
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
                <Select value={opsStatus} onValueChange={v => setOpsStatus((v ?? 'open') as OpsStatus)}>
                  <SelectTrigger className="h-9 text-sm">{OPS_STATUSSEN.find(s => s.value === opsStatus)?.label}</SelectTrigger>
                  <SelectContent>{OPS_STATUSSEN.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Prioriteit</Label>
                <Select value={prioriteit} onValueChange={v => setPrioriteit((v ?? 'normaal') as OpsPrioriteit)}>
                  <SelectTrigger className="h-9 text-sm">{OPS_PRIORITEITEN.find(p => p.value === prioriteit)?.label}</SelectTrigger>
                  <SelectContent>{OPS_PRIORITEITEN.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Deadline</Label>
                <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Eigenaar</Label>
                <Select value={eigenaarId} onValueChange={v => setEigenaarId(v ?? '')}>
                  <SelectTrigger className="h-9 text-sm">{users.find(u => u.id === eigenaarId)?.full_name || 'Selecteer...'}</SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuleren</Button>
              <Button type="submit" className="bg-gradient-to-r from-[#1F8A9B] to-[#176C79] shadow-md shadow-[#1F8A9B]/15" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Aanmaken
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
