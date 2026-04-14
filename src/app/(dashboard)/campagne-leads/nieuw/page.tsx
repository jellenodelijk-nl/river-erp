'use client'

import { PageHeader } from '@/components/page-header'
import { LeadForm } from '@/components/lead-form'

export default function NieuweCampagneLeadPage() {
  return (
    <>
      <PageHeader title="Nieuwe campagne lead" />
      <LeadForm type="campagne" />
    </>
  )
}
