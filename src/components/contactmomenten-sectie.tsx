'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Phone, Mail, Users, Link2, MessageSquare } from 'lucide-react'
import { dagenGeleden } from '@/lib/format'
import { toast } from 'sonner'
import type { ContactType, ContactMethode, Contactmoment } from '@/lib/types'
import { CONTACT_METHODES as METHODES } from '@/lib/types'

const methodeIcons: Record<ContactMethode, React.ReactNode> = {
  bellen: <Phone className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  meeting: <Users className="w-4 h-4" />,
  linkedin: <Link2 className="w-4 h-4" />,
  overig: <MessageSquare className="w-4 h-4" />,
}

interface Props {
  type: ContactType
  referentieId: string
}

export function ContactmomentenSectie({ type, referentieId }: Props) {
  const { user } = useAuth()
  const supabase = createClient()
  const [items, setItems] = useState<Contactmoment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [methode, setMethode] = useState<ContactMethode>('bellen')
  const [notities, setNotities] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [referentieId])

  async function fetchData() {
    const { data } = await supabase
      .from('contactmomenten')
      .select('*, gebruiker:users(*)')
      .eq('type', type)
      .eq('referentie_id', referentieId)
      .order('datum', { ascending: false })
    setItems(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    const { error } = await supabase.from('contactmomenten').insert({
      type,
      referentie_id: referentieId,
      gebruiker_id: user.id,
      type_contact: methode,
      notities,
    })

    if (error) {
      toast.error('Fout bij opslaan')
    } else {
      toast.success('Contactmoment toegevoegd')
      setShowForm(false)
      setNotities('')
      fetchData()
    }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#0B0D0E]">Contactmomenten</h3>
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
            <Label className="text-xs">Type contact</Label>
            <Select value={methode} onValueChange={(v) => setMethode(v as ContactMethode)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODES.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notities</Label>
            <Textarea
              value={notities}
              onChange={(e) => setNotities(e.target.value)}
              placeholder="Beschrijf het contactmoment..."
              className="text-xs min-h-[60px]"
            />
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
        <p className="text-xs text-[#6B7280]">Geen contactmomenten</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#F4F6F7] flex items-center justify-center text-[#6B7280]">
                  {methodeIcons[item.type_contact]}
                </div>
                <div className="w-px flex-1 bg-[#E5E7EB] mt-1" />
              </div>
              <div className="pb-4 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#0B0D0E] capitalize">{item.type_contact}</span>
                  <span className="text-xs text-[#6B7280]">·</span>
                  <span className="text-xs text-[#6B7280]">{dagenGeleden(item.datum)}</span>
                </div>
                {item.notities && (
                  <p className="text-xs text-[#6B7280] mt-1">{item.notities}</p>
                )}
                <p className="text-xs text-[#9CA3AF] mt-1">{item.gebruiker?.full_name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
