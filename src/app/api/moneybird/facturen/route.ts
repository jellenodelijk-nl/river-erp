import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MONEYBIRD_API = 'https://moneybird.com/api/v2'

export async function GET(request: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const contactId = searchParams.get('contact_id')

  const token = process.env.MONEYBIRD_API_TOKEN
  const adminId = process.env.MONEYBIRD_ADMINISTRATION_ID

  if (!token || !adminId) {
    return NextResponse.json({ error: 'Moneybird niet geconfigureerd' }, { status: 500 })
  }

  try {
    let url = `${MONEYBIRD_API}/${adminId}/sales_invoices.json?per_page=50`
    if (contactId) {
      url += `&filter=contact_id:${contactId}`
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 }, // Cache 5 min
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Moneybird API fout' }, { status: res.status })
    }

    const invoices = await res.json()

    const facturen = invoices.map((inv: Record<string, unknown>) => ({
      id: inv.id,
      invoice_id: inv.invoice_id,
      factuurnummer: inv.invoice_id,
      datum: inv.invoice_date,
      bedrag: parseFloat(inv.total_price_excl_tax as string) || 0,
      btw: parseFloat(inv.total_tax as string) || 0,
      totaal: parseFloat(inv.total_price_incl_tax as string) || 0,
      vervaldatum: inv.due_date,
      status: inv.state,
      betaald_op: inv.paid_at || null,
    }))

    return NextResponse.json(facturen)
  } catch {
    return NextResponse.json({ error: 'Fout bij ophalen facturen' }, { status: 500 })
  }
}
