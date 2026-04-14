import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (dbUser?.role !== 'admin') return NextResponse.json({ error: 'Alleen admins' }, { status: 403 })

  const { userId, role } = await request.json()

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient.from('users').update({ role }).eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
