'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Shield, ShieldCheck, Loader2 } from 'lucide-react'
import { formatDatum } from '@/lib/format'
import { toast } from 'sonner'
import type { User, UserRole } from '@/lib/types'

export default function GebruikersPage() {
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invEmail, setInvEmail] = useState('')
  const [invName, setInvName] = useState('')
  const [invRole, setInvRole] = useState<UserRole>('user')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      router.push('/')
    }
  }, [currentUser, router])

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: true })
      setUsers(data || [])
      setLoading(false)
    }
    fetchUsers()
  }, [supabase])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invEmail, full_name: invName, role: invRole }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success('Uitnodiging verstuurd')
        setInviteOpen(false)
        setInvEmail(''); setInvName('')
        // Refresh
        const { data } = await supabase.from('users').select('*').order('created_at', { ascending: true })
        setUsers(data || [])
      } else {
        toast.error(result.error || 'Uitnodigen mislukt')
      }
    } catch {
      toast.error('Er ging iets mis')
    }
    setSaving(false)
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    const res = await fetch('/api/auth/update-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole }),
    })
    const result = await res.json()
    if (result.success) {
      toast.success('Rol gewijzigd')
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } else {
      toast.error('Wijzigen mislukt')
    }
  }

  if (currentUser?.role !== 'admin') return null

  return (
    <>
      <PageHeader title="Gebruikers" description="Beheer gebruikers en rechten">
        <Button onClick={() => setInviteOpen(true)} className="bg-[#3A6FD8] hover:bg-[#2F57AA] text-sm" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Uitnodigen
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F4F6F7]">
                  <TableHead className="text-xs font-semibold">Gebruiker</TableHead>
                  <TableHead className="text-xs font-semibold">E-mail</TableHead>
                  <TableHead className="text-xs font-semibold">Rol</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">2FA</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">Aangemaakt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-[#C9D9FF] text-[#3A6FD8] text-xs">
                            {u.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{u.full_name || 'Onbekend'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-[#6B7280]">{u.email}</TableCell>
                    <TableCell>
                      {u.id === currentUser?.id ? (
                        <Badge className="bg-[#C9D9FF] text-[#3A6FD8]">
                          <Shield className="w-3 h-3 mr-1" /> {u.role}
                        </Badge>
                      ) : (
                        <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as UserRole)}>
                          <SelectTrigger className="h-7 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {u.totp_enabled ? (
                        <Badge className="bg-green-100 text-green-800 text-xs"><ShieldCheck className="w-3 h-3 mr-1" />Actief</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-[#9CA3AF]">Niet actief</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-[#6B7280] hidden md:table-cell">
                      {formatDatum(u.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gebruiker uitnodigen</DialogTitle></DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">E-mailadres *</Label>
              <Input type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Volledige naam</Label>
              <Input value={invName} onChange={(e) => setInvName(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rol</Label>
              <Select value={invRole} onValueChange={(v) => setInvRole(v as UserRole)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Annuleren</Button>
              <Button type="submit" className="bg-[#3A6FD8] hover:bg-[#2F57AA]" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Uitnodigen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
