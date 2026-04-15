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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LeadForm } from '@/components/lead-form'
import { Plus, LayoutList, Kanban, Search, GripVertical } from 'lucide-react'
import { dagenInFase } from '@/lib/format'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { BedrijfTag, CampagneFase, CampagneLead, User } from '@/lib/types'
import { CAMPAGNE_FASES } from '@/lib/types'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function KanbanCard({ lead, onClick }: { lead: CampagneLead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'lead', lead },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-sm cursor-pointer hover:border-[#3A6FD8]/30 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#0B0D0E] truncate">{lead.naam}</p>
          <p className="text-xs text-[#6B7280] truncate">{lead.bedrijf}</p>
        </div>
        <div {...attributes} {...listeners} className="shrink-0 cursor-grab active:cursor-grabbing text-[#9CA3AF] hover:text-[#6B7280]">
          <GripVertical className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        {lead.eigenaar && (
          <Avatar className="w-5 h-5">
            <AvatarFallback className="bg-[#C9D9FF] text-[#3A6FD8] text-[8px]">
              {lead.eigenaar.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        )}
        <span className="text-[10px] text-[#9CA3AF]">{dagenInFase(lead.fase_gewijzigd_op)}d</span>
      </div>
    </div>
  )
}

function KanbanColumn({
  fase,
  leads,
  onCardClick,
}: {
  fase: { value: CampagneFase; label: string }
  leads: CampagneLead[]
  onCardClick: (id: string) => void
}) {
  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px] shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">{fase.label}</h3>
        <Badge variant="secondary" className="text-[10px]">{leads.length}</Badge>
      </div>
      <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy} id={fase.value}>
        <div className="space-y-2 min-h-[100px] p-1 rounded-lg bg-[#F4F6F7]/50">
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} onClick={() => onCardClick(lead.id)} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

export default function CampagneLeadsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [view, setView] = useState<'list' | 'kanban'>('kanban')
  const [leads, setLeads] = useState<CampagneLead[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [bedrijfFilter, setBedrijfFilter] = useState<BedrijfTag | 'alle'>('alle')
  const [faseFilter, setFaseFilter] = useState<CampagneFase | 'alle'>('alle')
  const [eigenaarFilter, setEigenaarFilter] = useState('alle')
  const [zoek, setZoek] = useState('')
  const [activeDrag, setActiveDrag] = useState<CampagneLead | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('campagne_leads')
      .select('*, eigenaar:users(*)')
      .order('created_at', { ascending: false })

    if (bedrijfFilter !== 'alle') query = query.eq('bedrijf_tag', bedrijfFilter)
    if (faseFilter !== 'alle') query = query.eq('fase', faseFilter)
    if (eigenaarFilter !== 'alle') query = query.eq('eigenaar_id', eigenaarFilter)

    const { data } = await query
    let filtered = data || []
    if (zoek) {
      const s = zoek.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          l.naam.toLowerCase().includes(s) ||
          l.bedrijf.toLowerCase().includes(s)
      )
    }
    setLeads(filtered)
    setLoading(false)
  }, [supabase, bedrijfFilter, faseFilter, eigenaarFilter, zoek])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  useEffect(() => {
    supabase.from('users').select('*').then(({ data }) => setUsers(data || []))
  }, [supabase])

  function handleDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === event.active.id)
    setActiveDrag(lead || null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    // Determine target fase from the over container
    let targetFase: CampagneFase | null = null

    // Check if dropped over a column
    const faseValues = CAMPAGNE_FASES.map(f => f.value)
    if (faseValues.includes(over.id as CampagneFase)) {
      targetFase = over.id as CampagneFase
    } else {
      // Dropped on another card — find which fase that card is in
      const overLead = leads.find(l => l.id === over.id)
      if (overLead) targetFase = overLead.fase
    }

    if (!targetFase) return
    const currentLead = leads.find(l => l.id === leadId)
    if (!currentLead || currentLead.fase === targetFase) return

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, fase: targetFase! } : l))

    const { error } = await supabase
      .from('campagne_leads')
      .update({ fase: targetFase })
      .eq('id', leadId)

    if (error) {
      toast.error('Fase wijzigen mislukt')
      fetchLeads()
    } else {
      toast.success(`Verplaatst naar ${CAMPAGNE_FASES.find(f => f.value === targetFase)?.label}`)
    }
  }

  const leadsPerFase = (fase: CampagneFase) => leads.filter((l) => l.fase === fase)

  return (
    <>
      <PageHeader title="Campagne leads" description="Beheer en volg campagne leads">
        <BedrijfFilter value={bedrijfFilter} onChange={setBedrijfFilter} />
        <div className="flex items-center bg-white border border-[#E5E7EB] rounded-lg p-0.5">
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-md ${view === 'list' ? 'bg-[#3A6FD8] text-white' : 'text-[#6B7280]'}`}
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`p-1.5 rounded-md ${view === 'kanban' ? 'bg-[#3A6FD8] text-white' : 'text-[#6B7280]'}`}
          >
            <Kanban className="w-4 h-4" />
          </button>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-gradient-to-r from-[#3A6FD8] to-[#2F57AA] hover:from-[#2F57AA] hover:to-[#254A99] shadow-md shadow-[#3A6FD8]/15 text-sm"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nieuwe lead
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <Input
            placeholder="Zoek op naam of bedrijf..."
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            className="pl-8 h-9 text-sm w-[220px]"
          />
        </div>
        {view === 'list' && (
          <Select value={faseFilter} onValueChange={(v) => setFaseFilter(v as CampagneFase | 'alle')}>
            <SelectTrigger className="h-9 text-sm w-[160px]">
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle fases</SelectItem>
              {CAMPAGNE_FASES.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={eigenaarFilter} onValueChange={(v) => setEigenaarFilter(v ?? 'alle')}>
          <SelectTrigger className="h-9 text-sm w-[160px]">
            <SelectValue placeholder="Eigenaar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle eigenaren</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
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
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Bron</TableHead>
                  <TableHead className="text-xs font-semibold hidden lg:table-cell">Tag</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Dagen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-[#6B7280] py-8">
                      Geen leads gevonden
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-[#F4F6F7]"
                      onClick={() => router.push(`/campagne-leads/${lead.id}`)}
                    >
                      <TableCell className="text-sm font-medium">{lead.naam}</TableCell>
                      <TableCell className="text-sm text-[#6B7280]">{lead.bedrijf}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {lead.eigenaar && (
                          <span className="text-xs text-[#6B7280]">{lead.eigenaar.full_name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {CAMPAGNE_FASES.find(f => f.value === lead.fase)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#6B7280] hidden lg:table-cell">{lead.bron}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <BedrijfBadge tag={lead.bedrijf_tag} />
                      </TableCell>
                      <TableCell className="text-xs text-right text-[#6B7280]">{dagenInFase(lead.fase_gewijzigd_op)}d</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {CAMPAGNE_FASES.map((fase) => (
              <KanbanColumn
                key={fase.value}
                fase={fase}
                leads={leadsPerFase(fase.value)}
                onCardClick={(id) => router.push(`/campagne-leads/${id}`)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDrag && (
              <div className="bg-white border border-[#3A6FD8] rounded-lg p-3 shadow-lg w-[260px]">
                <p className="text-sm font-medium">{activeDrag.naam}</p>
                <p className="text-xs text-[#6B7280]">{activeDrag.bedrijf}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Nieuwe lead popup */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:!max-w-3xl !w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nieuwe campagne lead</DialogTitle>
          </DialogHeader>
          <LeadForm type="campagne" onSuccess={() => { setCreateOpen(false); fetchLeads() }} />
        </DialogContent>
      </Dialog>
    </>
  )
}
