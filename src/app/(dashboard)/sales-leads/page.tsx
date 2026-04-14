'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { BedrijfFilter } from '@/components/bedrijf-filter'
import { BedrijfBadge } from '@/components/bedrijf-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LeadForm } from '@/components/lead-form'
import { Plus, LayoutList, Kanban, Search, GripVertical } from 'lucide-react'
import { dagenInFase, formatValuta } from '@/lib/format'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { BedrijfTag, SalesFase, SalesLead, User } from '@/lib/types'
import { SALES_FASES } from '@/lib/types'
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SalesKanbanCard({ lead, onClick }: { lead: SalesLead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id, data: { type: 'lead', lead },
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style}
      className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-sm cursor-pointer hover:border-[#1F8A9B]/30 transition-colors"
      onClick={onClick}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#0B0D0E] truncate">{lead.naam}</p>
          <p className="text-xs text-[#6B7280] truncate">{lead.bedrijf}</p>
        </div>
        <div {...attributes} {...listeners} className="shrink-0 cursor-grab text-[#9CA3AF]">
          <GripVertical className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {lead.maandelijks_bedrag && (
            <span className="text-[10px] text-[#1F8A9B] font-medium">{formatValuta(lead.maandelijks_bedrag)}/m</span>
          )}
        </div>
        <span className="text-[10px] text-[#9CA3AF]">{dagenInFase(lead.fase_gewijzigd_op)}d</span>
      </div>
    </div>
  )
}

export default function SalesLeadsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [view, setView] = useState<'list' | 'kanban'>('kanban')
  const [leads, setLeads] = useState<SalesLead[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [bedrijfFilter, setBedrijfFilter] = useState<BedrijfTag | 'alle'>('alle')
  const [faseFilter, setFaseFilter] = useState<SalesFase | 'alle'>('alle')
  const [eigenaarFilter, setEigenaarFilter] = useState('alle')
  const [zoek, setZoek] = useState('')
  const [activeDrag, setActiveDrag] = useState<SalesLead | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('sales_leads').select('*, eigenaar:users(*)').order('created_at', { ascending: false })
    if (bedrijfFilter !== 'alle') query = query.eq('bedrijf_tag', bedrijfFilter)
    if (faseFilter !== 'alle') query = query.eq('fase', faseFilter)
    if (eigenaarFilter !== 'alle') query = query.eq('eigenaar_id', eigenaarFilter)

    const { data } = await query
    let filtered = data || []
    if (zoek) {
      const s = zoek.toLowerCase()
      filtered = filtered.filter(l => l.naam.toLowerCase().includes(s) || l.bedrijf.toLowerCase().includes(s))
    }
    setLeads(filtered)
    setLoading(false)
  }, [supabase, bedrijfFilter, faseFilter, eigenaarFilter, zoek])

  useEffect(() => { fetchLeads() }, [fetchLeads])
  useEffect(() => { supabase.from('users').select('*').then(({ data }) => setUsers(data || [])) }, [supabase])

  function handleDragStart(event: DragStartEvent) {
    setActiveDrag(leads.find(l => l.id === event.active.id) || null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null)
    const { active, over } = event
    if (!over) return
    const leadId = active.id as string
    let targetFase: SalesFase | null = null
    const faseValues = SALES_FASES.map(f => f.value)
    if (faseValues.includes(over.id as SalesFase)) {
      targetFase = over.id as SalesFase
    } else {
      const overLead = leads.find(l => l.id === over.id)
      if (overLead) targetFase = overLead.fase
    }
    if (!targetFase) return
    const currentLead = leads.find(l => l.id === leadId)
    if (!currentLead || currentLead.fase === targetFase) return

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, fase: targetFase! } : l))
    const { error } = await supabase.from('sales_leads').update({ fase: targetFase }).eq('id', leadId)
    if (error) { toast.error('Fase wijzigen mislukt'); fetchLeads() }
    else toast.success(`Verplaatst naar ${SALES_FASES.find(f => f.value === targetFase)?.label}`)
  }

  const leadsPerFase = (fase: SalesFase) => leads.filter(l => l.fase === fase)

  return (
    <>
      <PageHeader title="Sales leads" description="Beheer en volg sales leads">
        <BedrijfFilter value={bedrijfFilter} onChange={setBedrijfFilter} />
        <div className="flex items-center bg-white border border-[#E5E7EB] rounded-lg p-0.5">
          <button onClick={() => setView('list')} className={`p-1.5 rounded-md ${view === 'list' ? 'bg-[#1F8A9B] text-white' : 'text-[#6B7280]'}`}>
            <LayoutList className="w-4 h-4" />
          </button>
          <button onClick={() => setView('kanban')} className={`p-1.5 rounded-md ${view === 'kanban' ? 'bg-[#1F8A9B] text-white' : 'text-[#6B7280]'}`}>
            <Kanban className="w-4 h-4" />
          </button>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-[#1F8A9B] to-[#176C79] hover:from-[#176C79] hover:to-[#125B65] shadow-md shadow-[#1F8A9B]/15 text-sm" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Nieuwe lead
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <Input placeholder="Zoek op naam of bedrijf..." value={zoek} onChange={(e) => setZoek(e.target.value)} className="pl-8 h-9 text-sm w-[220px]" />
        </div>
        {view === 'list' && (
          <Select value={faseFilter} onValueChange={(v) => setFaseFilter(v as SalesFase | 'alle')}>
            <SelectTrigger className="h-9 text-sm w-[160px]"><SelectValue placeholder="Fase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle fases</SelectItem>
              {SALES_FASES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={eigenaarFilter} onValueChange={(v) => setEigenaarFilter(v ?? 'alle')}>
          <SelectTrigger className="h-9 text-sm w-[160px]"><SelectValue placeholder="Eigenaar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle eigenaren</SelectItem>
            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : view === 'list' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F4F6F7]">
                  <TableHead className="text-xs font-semibold">Naam</TableHead>
                  <TableHead className="text-xs font-semibold">Bedrijf</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Eigenaar</TableHead>
                  <TableHead className="text-xs font-semibold">Fase</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Maandelijks</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Tag</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Dagen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-[#6B7280] py-8">Geen leads gevonden</TableCell></TableRow>
                ) : leads.map(lead => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-[#F4F6F7]" onClick={() => router.push(`/sales-leads/${lead.id}`)}>
                    <TableCell className="text-sm font-medium">{lead.naam}</TableCell>
                    <TableCell className="text-sm text-[#6B7280]">{lead.bedrijf}</TableCell>
                    <TableCell className="hidden md:table-cell"><span className="text-xs text-[#6B7280]">{lead.eigenaar?.full_name}</span></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{SALES_FASES.find(f => f.value === lead.fase)?.label}</Badge></TableCell>
                    <TableCell className="text-xs text-[#6B7280] hidden lg:table-cell">{lead.maandelijks_bedrag ? formatValuta(lead.maandelijks_bedrag) : '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell"><BedrijfBadge tag={lead.bedrijf_tag} /></TableCell>
                    <TableCell className="text-xs text-right text-[#6B7280]">{dagenInFase(lead.fase_gewijzigd_op)}d</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {SALES_FASES.map(fase => (
              <div key={fase.value} className="flex flex-col min-w-[260px] max-w-[300px] shrink-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">{fase.label}</h3>
                  <Badge variant="secondary" className="text-[10px]">{leadsPerFase(fase.value).length}</Badge>
                </div>
                <SortableContext items={leadsPerFase(fase.value).map(l => l.id)} strategy={verticalListSortingStrategy} id={fase.value}>
                  <div className="space-y-2 min-h-[100px] p-1 rounded-lg bg-[#F4F6F7]/50">
                    {leadsPerFase(fase.value).map(lead => (
                      <SalesKanbanCard key={lead.id} lead={lead} onClick={() => router.push(`/sales-leads/${lead.id}`)} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            ))}
          </div>
          <DragOverlay>
            {activeDrag && (
              <div className="bg-white border border-[#1F8A9B] rounded-lg p-3 shadow-lg w-[260px]">
                <p className="text-sm font-medium">{activeDrag.naam}</p>
                <p className="text-xs text-[#6B7280]">{activeDrag.bedrijf}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Nieuwe lead popup */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nieuwe sales lead</DialogTitle>
          </DialogHeader>
          <LeadForm type="sales" onSuccess={() => { setCreateOpen(false); fetchLeads() }} />
        </DialogContent>
      </Dialog>
    </>
  )
}
