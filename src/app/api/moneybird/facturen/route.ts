import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MONEYBIRD_API = 'https://moneybird.com/api/v2'

// In-memory cache (persists between requests on same serverless instance)
let cachedFacturen: unknown[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const contactId = searchParams.get('contact_id')

  const token = process.env.MONEYBIRD_API_TOKEN
  const adminId = process.env.MONEYBIRD_ADMINISTRATION_ID
  if (!token || !adminId) return NextResponse.json({ error: 'Moneybird niet geconfigureerd' }, { status: 500 })

  try {
    let allInvoices: Record<string, unknown>[]

    if (contactId) {
      // For specific contact: always fetch fresh (small dataset)
      allInvoices = await fetchPaginated(`${MONEYBIRD_API}/${adminId}/sales_invoices.json?filter=contact_id:${contactId}`, token)
    } else {
      // For all: use cache
      const now = Date.now()
      if (cachedFacturen && (now - cacheTimestamp) < CACHE_TTL) {
        return NextResponse.json(cachedFacturen, {
          headers: { 'X-Cache': 'HIT', 'Cache-Control': 'private, max-age=300' }
        })
      }

      // Fetch all invoices using period filter per year (fastest method)
      allInvoices = []
      const currentYear = new Date().getFullYear()
      const fetchPromises = []

      for (let year = currentYear; year >= 2020; year--) {
        fetchPromises.push(
          fetchPaginated(
            `${MONEYBIRD_API}/${adminId}/sales_invoices.json?filter=period:${year}0101..${year}1231`,
            token
          )
        )
      }

      // Fetch all years in parallel
      const results = await Promise.all(fetchPromises)
      results.forEach(r => allInvoices.push(...r))

      // Deduplicate
      const seen = new Set<string>()
      allInvoices = allInvoices.filter(inv => {
        const id = String(inv.id)
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
    }

    const facturen = allInvoices.map(inv => mapInvoice(inv))
    facturen.sort((a, b) => String(b.datum || '').localeCompare(String(a.datum || '')))

    // Cache the result (only for all-invoices, not per-contact)
    if (!contactId) {
      cachedFacturen = facturen
      cacheTimestamp = Date.now()
    }

    return NextResponse.json(facturen, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'private, max-age=300' }
    })
  } catch {
    return NextResponse.json({ error: 'Fout bij ophalen facturen' }, { status: 500 })
  }
}

async function fetchPaginated(baseUrl: string, token: string): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  let page = 1
  while (true) {
    const separator = baseUrl.includes('?') ? '&' : '?'
    const res = await fetch(`${baseUrl}${separator}per_page=100&page=${page}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) break
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) break
    all.push(...data)
    page++
    if (page > 10) break
  }
  return all
}

function mapInvoice(inv: Record<string, unknown>) {
  const state = inv.state as string
  const dueDate = inv.due_date as string | null

  let status = 'open'
  if (state === 'paid' || state === 'uncollectible') status = 'paid'
  else if (state === 'late' || state === 'reminded') status = 'late'
  else if (dueDate && new Date(dueDate) < new Date() && state !== 'draft') status = 'late'
  else if (state === 'draft') status = 'draft'

  return {
    id: inv.id,
    invoice_id: inv.invoice_id,
    factuurnummer: inv.invoice_id || inv.reference,
    datum: inv.invoice_date,
    bedrag: parseFloat(inv.total_price_excl_tax as string) || 0,
    btw: parseFloat(inv.total_tax as string) || 0,
    totaal: parseFloat(inv.total_price_incl_tax as string) || 0,
    vervaldatum: inv.due_date,
    status,
    moneybird_status: inv.state,
    betaald_op: inv.paid_at || null,
    contact_id: inv.contact_id,
    contact_naam: typeof inv.contact === 'object' && inv.contact !== null
      ? ((inv.contact as Record<string, unknown>).company_name ||
         [(inv.contact as Record<string, unknown>).firstname, (inv.contact as Record<string, unknown>).lastname].filter(Boolean).join(' '))
      : null,
  }
}
