import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MONEYBIRD_API = 'https://moneybird.com/api/v2'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = process.env.MONEYBIRD_API_TOKEN
  const adminId = process.env.MONEYBIRD_ADMINISTRATION_ID

  if (!token || !adminId) {
    return NextResponse.json({ error: 'Moneybird niet geconfigureerd' }, { status: 500 })
  }

  try {
    // Fetch all contacts (paginated, max 100 per page)
    const allContacts: Record<string, unknown>[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const res = await fetch(
        `${MONEYBIRD_API}/${adminId}/contacts.json?per_page=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!res.ok) {
        return NextResponse.json({ error: `Moneybird API fout: ${res.status}` }, { status: res.status })
      }

      const contacts = await res.json()
      if (contacts.length === 0) {
        hasMore = false
      } else {
        allContacts.push(...contacts)
        page++
      }

      // Safety limit
      if (page > 20) break
    }

    // Map to our format
    const mapped = allContacts.map((c: Record<string, unknown>) => ({
      moneybird_id: String(c.id),
      bedrijf: (c.company_name as string) || '',
      naam: [c.firstname, c.lastname].filter(Boolean).join(' ') || (c.company_name as string) || '',
      email: (c.email as string) || (c.send_invoices_to_email as string) || null,
      telefoonnummer: (c.phone as string) || null,
      url: null as string | null,
      straat: (c.address1 as string) || null,
      huisnummer: null as string | null,
      postcode: (c.zipcode as string) || null,
      plaats: (c.city as string) || null,
      provincie: null as string | null,
      land: (c.country as string) || null,
      kvk: (c.chamber_of_commerce as string) || null,
      btw_nummer: (c.tax_number as string) || null,
      klant_nummer_moneybird: (c.customer_id as string) || null,
      sepa_active: c.sepa_active as boolean,
    }))

    return NextResponse.json(mapped)
  } catch (err) {
    return NextResponse.json({ error: 'Fout bij ophalen contacten' }, { status: 500 })
  }
}
