import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (dbUser?.role !== 'admin') return NextResponse.json({ error: 'Alleen admins' }, { status: 403 })

  const { email, full_name, role } = await request.json()

  const serviceClient = await createServiceClient()

  // Create auth user with invite
  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email)
  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 400 })

  // Create user record
  if (inviteData.user) {
    await serviceClient.from('users').upsert({
      id: inviteData.user.id,
      email,
      full_name: full_name || '',
      role: role || 'user',
    })
  }

  return NextResponse.json({ success: true })
}
