import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { TOTP, generateSecret, generateURI } from 'otplib'
import QRCode from 'qrcode'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const secret = generateSecret()
  const otpauth = generateURI({
    issuer: 'River ERP',
    label: user.email || 'user',
    secret,
    algorithm: 'sha1',
    digits: 6,
    period: 30,
    strategy: 'totp',
  })
  const qrDataUrl = await QRCode.toDataURL(otpauth)

  const serviceClient = await createServiceClient()
  await serviceClient
    .from('users')
    .update({ totp_secret: secret })
    .eq('id', user.id)

  return NextResponse.json({ qrDataUrl })
}
