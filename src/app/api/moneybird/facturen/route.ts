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

    if (contactId) {
      // For a specific contact, use filter
      let page = 1
      while (true) {
        const url = `${MONEYBIRD_API}/${adminId}/sales_invoices.json?per_page=100&page=${page}&filter=contact_id:${contactId}`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        if (!res.ok) break
        const data = await res.json()
        if (!Array.isArray(data) || data.length === 0) break
        allInvoices.push(...data)
        page++
        if (page > 20) break
      }
    } else {
      // For all invoices: use synchronization endpoint to get ALL invoice IDs first
      // Then fetch in batches. The sync endpoint returns all IDs across all years.
      try {
        const syncRes = await fetch(
          `${MONEYBIRD_API}/${adminId}/sales_invoices/synchronization.json`,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        )
        if (syncRes.ok) {
          const syncData: { id: string }[] = await syncRes.json()
          const allIds = syncData.map(s => s.id)

          // Fetch in batches of 100 IDs using the batch endpoint
          for (let i = 0; i < allIds.length; i += 100) {
            const batchIds = allIds.slice(i, i + 100)
            const batchRes = await fetch(
              `${MONEYBIRD_API}/${adminId}/sales_invoices/synchronization.json`,
              {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: batchIds }),
              }
            )
            if (batchRes.ok) {
              const batchData = await batchRes.json()
              if (Array.isArray(batchData)) allInvoices.push(...batchData)
            }
          }
        }
      } catch {
        // Fallback: paginate through regular endpoint with period filter going back to 2015
        for (let year = new Date().getFullYear(); year >= 2015; year--) {
          let page = 1
          while (true) {
            const url = `${MONEYBIRD_API}/${adminId}/sales_invoices.json?per_page=100&page=${page}&filter=period:${year}0101..${year}1231`
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            })
            if (!res.ok) break
            const data = await res.json()
            if (!Array.isArray(data) || data.length === 0) break
            allInvoices.push(...data)
            page++
            if (page > 10) break
          }
        }
      }
    }

    // Deduplicate by id
    const seen = new Set<string>()
    const unique = allInvoices.filter(inv => {
      const id = String(inv.id)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    function mapStatus(state: string, dueDate: string | null): string {
      if (state === 'paid') return 'paid'
      if (state === 'uncollectible') return 'paid'
      if (state === 'late' || state === 'reminded') return 'late'
      if (dueDate && new Date(dueDate) < new Date() && state !== 'paid' && state !== 'draft') return 'late'
      if (state === 'draft') return 'draft'
      return 'open'
    }

    const facturen = unique.map((inv) => ({
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
      contact_naam: typeof inv.contact === 'object' && inv.contact !== null
        ? ((inv.contact as Record<string, unknown>).company_name ||
           [(inv.contact as Record<string, unknown>).firstname, (inv.contact as Record<string, unknown>).lastname].filter(Boolean).join(' '))
        : null,
    }))

    facturen.sort((a, b) => String(b.datum || '').localeCompare(String(a.datum || '')))

    return NextResponse.json(facturen)
  } catch {
    return NextResponse.json({ error: 'Fout bij ophalen facturen' }, { status: 500 })
  }
}
