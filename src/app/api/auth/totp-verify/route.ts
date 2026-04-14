import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { verifySync } from 'otplib'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const { code } = await request.json()

  const serviceClient = await createServiceClient()
  const { data: dbUser } = await serviceClient
    .from('users')
    .select('totp_secret')
    .eq('id', user.id)
    .single()

  if (!dbUser?.totp_secret) {
    return NextResponse.json({ success: false })
  }

  const isValid = verifySync({ token: code, secret: dbUser.totp_secret })
  return NextResponse.json({ success: isValid })
}
