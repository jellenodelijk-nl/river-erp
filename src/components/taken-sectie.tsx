'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, CheckCircle, Circle, Clock } from 'lucide-react'
import { formatDatum } from '@/lib/format'
import { toast } from 'sonner'
import type { TaakGerelateerd, TaakStatus, TaakPrioriteit, Taak } from '@/lib/types'
import { PRIORITEITEN } from '@/lib/types'

const statusIcons: Record<TaakStatus, React.ReactNode> = {
  open: <Circle className="w-4 h-4 text-[#6B7280]" />,
  in_progress: <Clock className="w-4 h-4 text-[#D97706]" />,
  afgerond: <CheckCircle className="w-4 h-4 text-[#059669]" />,
}

interface Props {
  gerelateerType: TaakGerelateerd
  gerelateerdeId: string
}

export function TakenSectie({ gerelateerType, gerelateerdeId }: Props) {
  const { user } = useAuth()
  const supabase = createClient()
  const [items, setItems] = useState<Taak[]>([])
  const [showForm, setShowForm] = useState(false)
  const [titel, setTitel] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [deadline, setDeadline] = useState('')
  const [prioriteit, setPrioriteit] = useState<TaakPrioriteit>('normaal')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [gerelateerdeId])

  async function fetchData() {
    const { data } = await supabase
      .from('taken')
      .select('*')
      .eq('gerelateerd_type', gerelateerType)
      .eq('gerelateerd_id', gerelateerdeId)
      .order('created_at', { ascending: false })
    setItems(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    const { error } = await supabase.from('taken').insert({
      titel,
      omschrijving: omschrijving || null,
      toegewezen_aan: user.id,
      gerelateerd_type: gerelateerType,
      gerelateerd_id: gerelateerdeId,
      deadline: deadline || null,
      prioriteit,
    })

    if (error) {
      toast.error('Fout bij opslaan')
    } else {
      toast.success('Taak toegevoegd')
      setShowForm(false)
      setTitel('')
      setOmschrijving('')
      setDeadline('')
      fetchData()
    }
    setSaving(false)
  }

  async function toggleStatus(taak: Taak) {
    const newStatus: TaakStatus = taak.status === 'afgerond' ? 'open' : 'afgerond'
    await supabase.from('taken').update({ status: newStatus }).eq('id', taak.id)
    fetchData()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#0B0D0E]">Taken</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Nieuw
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-3 bg-[#F4F6F7] rounded-lg space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Titel</Label>
            <Input
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="Taaknaam..."
              className="h-8 text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Omschrijving</Label>
            <Textarea
              value={omschrijving}
              onChange={(e) => setOmschrijving(e.target.value)}
              className="text-xs min-h-[40px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Deadline</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prioriteit</Label>
              <Select value={prioriteit} onValueChange={(v) => setPrioriteit(v as TaakPrioriteit)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITEITEN.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="text-xs bg-[#3A6FD8] hover:bg-[#2F57AA]" disabled={saving}>
              Opslaan
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setShowForm(false)}>
              Annuleren
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-[#6B7280]">Geen gekoppelde taken</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((taak) => (
            <div
              key={taak.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F4F6F7] transition-colors"
            >
              <button onClick={() => toggleStatus(taak)} className="shrink-0">
                {statusIcons[taak.status]}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-medium ${taak.status === 'afgerond' ? 'line-through text-[#9CA3AF]' : 'text-[#0B0D0E]'}`}>
                  {taak.titel}
                </p>
              </div>
              {taak.deadline && (
                <span className="text-[10px] text-[#6B7280] shrink-0">{formatDatum(taak.deadline)}</span>
              )}
              <Badge
                variant="outline"
                className={`text-[10px] shrink-0 ${
                  taak.prioriteit === 'hoog'
                    ? 'border-red-200 text-red-600'
                    : taak.prioriteit === 'normaal'
                    ? 'border-yellow-200 text-yellow-600'
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                {taak.prioriteit}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
