'use client'

import { PageHeader } from '@/components/page-header'
import { LeadForm } from '@/components/lead-form'

export default function NieuweSalesLeadPage() {
  return (
    <>
      <PageHeader title="Nieuwe sales lead" />
      <LeadForm type="sales" />
    </>
  )
}
