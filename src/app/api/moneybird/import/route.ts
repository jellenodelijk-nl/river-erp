import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const MONEYBIRD_API = 'https://moneybird.com/api/v2'

async function fetchAllContacts(token: string, adminId: string) {
  const allContacts: Record<string, unknown>[] = []
  let page = 1

  while (true) {
    const res = await fetch(
      `${MONEYBIRD_API}/${adminId}/contacts.json?per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    )
    if (!res.ok) break
    const contacts = await res.json()
    if (contacts.length === 0) break
    allContacts.push(...contacts)
    page++
    if (page > 50) break
  }
  return allContacts
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (dbUser?.role !== 'admin') return NextResponse.json({ error: 'Alleen admins' }, { status: 403 })

  const token = process.env.MONEYBIRD_API_TOKEN
  const adminId = process.env.MONEYBIRD_ADMINISTRATION_ID
  if (!token || !adminId) return NextResponse.json({ error: 'Moneybird niet geconfigureerd' }, { status: 500 })

  try {
    const allContacts = await fetchAllContacts(token, adminId)

    const serviceClient = await createServiceClient()

    // Get ALL existing klanten by moneybird_id to check duplicates
    const { data: existing } = await serviceClient.from('klanten').select('id, moneybird_id')
    const existingByMbId = new Map((existing || []).filter(k => k.moneybird_id).map(k => [k.moneybird_id, k.id]))

    let imported = 0
    let updated = 0
    let skipped = 0

    for (const c of allContacts) {
      const mbId = String(c.id)
      const naam = [c.firstname, c.lastname].filter(Boolean).join(' ') || (c.company_name as string) || ''
      const bedrijf = (c.company_name as string) || ''

      if (!naam && !bedrijf) { skipped++; continue }

      const klantnummer = (c.customer_id as string) || `MB-${mbId.slice(-6)}`

      // Build contact personen array from Moneybird contact_people
      const contactPersonen = Array.isArray(c.contact_people)
        ? (c.contact_people as Record<string, unknown>[]).map(cp => ({
            naam: [cp.firstname, cp.lastname].filter(Boolean).join(' '),
            email: cp.email || null,
            telefoon: cp.phone || null,
            afdeling: cp.department || null,
          })).filter(cp => cp.naam)
        : []

      const payload = {
        moneybird_id: mbId,
        klantnummer,
        naam: naam || bedrijf,
        bedrijf,
        email: (c.email as string) || (c.send_invoices_to_email as string) || null,
        telefoonnummer: (c.phone as string) || null,
        straat: (c.address1 as string) || null,
        postcode: (c.zipcode as string) || null,
        plaats: (c.city as string) || null,
        sbi: (c.chamber_of_commerce as string) || null,
        rechtsvorm: (c.tax_number as string) || null,
        bedrijf_tag: 'river_digital' as const,
        facturatie_moment: 'achteraf' as const,
        contactpersonen: contactPersonen.length > 0 ? JSON.stringify(contactPersonen) : null,
      }

      if (existingByMbId.has(mbId)) {
        // UPDATE existing record
        const klantId = existingByMbId.get(mbId)
        const { klantnummer: _, ...updatePayload } = payload
        await serviceClient.from('klanten').update(updatePayload).eq('id', klantId)
        updated++
      } else {
        // INSERT new record
        const { error } = await serviceClient.from('klanten').insert(payload)
        if (error) {
          // Duplicate klantnummer — adjust
          await serviceClient.from('klanten').insert({ ...payload, klantnummer: `MB-${mbId.slice(-8)}` })
        }
        imported++
      }
    }

    return NextResponse.json({
      success: true,
      totaal: allContacts.length,
      imported,
      updated,
      skipped,
    })
  } catch {
    return NextResponse.json({ error: 'Import mislukt' }, { status: 500 })
  }
}
