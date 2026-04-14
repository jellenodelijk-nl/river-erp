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
    return NextResponse.json({ error: 'Geen TOTP secret gevonden' }, { status: 400 })
  }

  const isValid = verifySync({ token: code, secret: dbUser.totp_secret })

  if (isValid) {
    await serviceClient
      .from('users')
      .update({ totp_enabled: true })
      .eq('id', user.id)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false })
}
