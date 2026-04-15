import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MONEYBIRD_API = 'https://moneybird.com/api/v2'

export async function GET(request: Request) {
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
    const allInvoices: Record<string, unknown>[] = []
    let page = 1

    while (true) {
      let url = `${MONEYBIRD_API}/${adminId}/sales_invoices.json?per_page=100&page=${page}`
      if (contactId) {
        url += `&filter=contact_id:${contactId}`
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        if (page === 1) return NextResponse.json({ error: `Moneybird API fout: ${res.status}` }, { status: res.status })
        break
      }

      const invoices = await res.json()
      if (!Array.isArray(invoices) || invoices.length === 0) break

      allInvoices.push(...invoices)
      page++

      // Safety limit
      if (page > 30) break
    }

    // Map Moneybird states to our statuses
    // Moneybird states: draft, open, scheduled, pending_payment, late, reminded, paid, uncollectible
    function mapStatus(state: string, dueDate: string | null): string {
      if (state === 'paid') return 'paid'
      if (state === 'uncollectible') return 'paid' // treat as closed
      if (state === 'late' || state === 'reminded') return 'late'
      // Check if overdue based on due date
      if (dueDate && new Date(dueDate) < new Date() && state !== 'paid') return 'late'
      return 'open'
    }

    const facturen = allInvoices.map((inv) => ({
      id: inv.id,
      invoice_id: inv.invoice_id,
      factuurnummer: inv.invoice_id || inv.reference,
      datum: inv.invoice_date,
      bedrag: parseFloat(inv.total_price_excl_tax as string) || 0,
      btw: parseFloat(inv.total_tax as string) || 0,
      totaal: parseFloat(inv.total_price_incl_tax as string) || 0,
      vervaldatum: inv.due_date,
      status: mapStatus(inv.state as string, inv.due_date as string | null),
      moneybird_status: inv.state,
      betaald_op: inv.paid_at || null,
      contact_id: inv.contact_id,
      contact_naam: (inv.contact as Record<string, unknown>)?.company_name ||
                     [(inv.contact as Record<string, unknown>)?.firstname, (inv.contact as Record<string, unknown>)?.lastname].filter(Boolean).join(' ') || null,
    }))

    // Sort by date descending
    facturen.sort((a, b) => String(b.datum || '').localeCompare(String(a.datum || '')))

    return NextResponse.json(facturen)
  } catch {
    return NextResponse.json({ error: 'Fout bij ophalen facturen' }, { status: 500 })
  }
}
