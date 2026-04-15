import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const MONEYBIRD_API = 'https://moneybird.com/api/v2'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (dbUser?.role !== 'admin') return NextResponse.json({ error: 'Alleen admins' }, { status: 403 })

  const token = process.env.MONEYBIRD_API_TOKEN
  const adminId = process.env.MONEYBIRD_ADMINISTRATION_ID

  if (!token || !adminId) {
    return NextResponse.json({ error: 'Moneybird niet geconfigureerd' }, { status: 500 })
  }

  try {
    // Fetch all contacts
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

      if (!res.ok) break

      const contacts = await res.json()
      if (contacts.length === 0) {
        hasMore = false
      } else {
        allContacts.push(...contacts)
        page++
      }
      if (page > 20) break
    }

    // Get existing klanten with moneybird_id to avoid duplicates
    const serviceClient = await createServiceClient()
    const { data: existing } = await serviceClient
      .from('klanten')
      .select('moneybird_id')

    const existingIds = new Set((existing || []).map(k => k.moneybird_id).filter(Boolean))

    // Filter out already imported contacts
    const newContacts = allContacts.filter(c => !existingIds.has(String(c.id)))

    let imported = 0
    let skipped = 0

    for (const c of newContacts) {
      const naam = [c.firstname, c.lastname].filter(Boolean).join(' ') || (c.company_name as string) || ''
      const bedrijf = (c.company_name as string) || ''

      // Skip contacts without name or company
      if (!naam && !bedrijf) {
        skipped++
        continue
      }

      // Generate klantnummer from Moneybird customer_id or sequential
      const klantnummer = (c.customer_id as string) || `MB-${String(c.id).slice(-6)}`

      const { error } = await serviceClient.from('klanten').insert({
        moneybird_id: String(c.id),
        klantnummer,
        naam: naam || bedrijf,
        bedrijf,
        email: (c.email as string) || (c.send_invoices_to_email as string) || null,
        telefoonnummer: (c.phone as string) || null,
        straat: (c.address1 as string) || null,
        postcode: (c.zipcode as string) || null,
        plaats: (c.city as string) || null,
        bedrijf_tag: 'river_digital',
        facturatie_moment: 'achteraf',
      })

      if (error) {
        // Likely duplicate klantnummer, try with prefix
        await serviceClient.from('klanten').insert({
          moneybird_id: String(c.id),
          klantnummer: `MB-${String(c.id).slice(-8)}`,
          naam: naam || bedrijf,
          bedrijf,
          email: (c.email as string) || (c.send_invoices_to_email as string) || null,
          telefoonnummer: (c.phone as string) || null,
          straat: (c.address1 as string) || null,
          postcode: (c.zipcode as string) || null,
          plaats: (c.city as string) || null,
          bedrijf_tag: 'river_digital',
          facturatie_moment: 'achteraf',
        })
      }

      imported++
    }

    return NextResponse.json({
      success: true,
      totaal: allContacts.length,
      imported,
      skipped,
      al_bestaand: existingIds.size,
    })
  } catch {
    return NextResponse.json({ error: 'Import mislukt' }, { status: 500 })
  }
}
