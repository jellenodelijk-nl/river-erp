'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export default function InstellingenPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('users').update({ full_name: fullName }).eq('id', user.id)
    if (error) toast.error('Opslaan mislukt')
    else toast.success('Profiel bijgewerkt')
    setSaving(false)
  }

  return (
    <>
      <PageHeader title="Instellingen" description="Beheer je profiel" />

      <div className="max-w-lg space-y-6">
        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Profiel</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">E-mailadres</Label>
                <Input value={user?.email || ''} disabled className="h-9 text-sm bg-[#F4F6F7]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Volledige naam</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9 text-sm" />
              </div>
              <Button type="submit" className="bg-[#3A6FD8] hover:bg-[#2F57AA]" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Opslaan
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Beveiliging</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Twee-factor authenticatie</p>
                <p className="text-xs text-[#6B7280]">TOTP via authenticator app</p>
              </div>
              {user?.totp_enabled ? (
                <Badge className="bg-green-100 text-green-800"><ShieldCheck className="w-3 h-3 mr-1" />Actief</Badge>
              ) : (
                <Badge variant="outline" className="text-[#9CA3AF]">Niet actief</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Rol</p>
                <p className="text-xs text-[#6B7280]">Je huidige rechten in het systeem</p>
              </div>
              <Badge className="bg-[#C9D9FF] text-[#3A6FD8] capitalize">{user?.role}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
