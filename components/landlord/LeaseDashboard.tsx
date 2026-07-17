'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Select from '@/components/ui/Select'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import FadeIn from '@/components/motion/FadeIn'
import SlideIn from '@/components/motion/SlideIn'
import DisclaimerBanner from './DisclaimerBanner'
import LeaseForm from './LeaseForm'
import LeasePdfPreview from './LeasePdfPreview'
import { leaseFieldsSchema, type LeaseFieldsInput } from '@/lib/landlord/schemas'
import { buildLeaseDocument, type LeaseDocument } from '@/lib/landlord/leaseDocument'
import type { CreateLeaseResponse, LandlordUnitOption, LeaseTemplateSummary, TenantApplicationSummary } from '@/lib/landlord/types'

const DEFAULT_VALUES: Partial<LeaseFieldsInput> = {
  landlordName: '',
  landlordContact: '',
  tenantName: '',
  tenantContact: '',
  propertyAddress: '',
  currency: 'AMD',
  paymentDay: 1,
  deposit: 0,
  pets: 'not_allowed',
  subletting: 'not_allowed',
  smoking: 'not_allowed',
}

/**
 * `/landlord/lease` — Create a Lease (§3.4). Owns the `react-hook-form`
 * instance for the fillable fields (`LeaseForm`) plus the template/unit/
 * tenant-prefill selects, and drives the three actions:
 * `[Generate / Preview]` (client-side merge into `LeasePdfPreview`, no
 * network call needed), `[💾 Save draft]` and `[⬇️ Download PDF]` (both
 * `POST /api/landlord/leases`, the latter then following `pdfUrl`).
 */
export default function LeaseDashboard({
  units,
  templates,
  approvedApplications,
  initialUnitId,
  initialApplicationId,
}: {
  units: LandlordUnitOption[]
  templates: LeaseTemplateSummary[]
  approvedApplications: TenantApplicationSummary[]
  initialUnitId?: string
  initialApplicationId?: string
}) {
  const [unitId, setUnitId] = useState(initialUnitId ?? units[0]?.id ?? '')
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [applicationId, setApplicationId] = useState(initialApplicationId ?? '')
  const [preview, setPreview] = useState<LeaseDocument | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // D8 hand-off: arriving via `?unit=&application=` after an Approve
  // (ApplicationDetailPanel's "Create a lease →" link) prefills the tenant
  // party fields from that approved application (docs/en/pages/
  // 19-landlord.md §3.3 "Approve → move to lease creation (prefill tenant
  // data)"). Computed once for useForm's `defaultValues` — the initial
  // mount is the only time this hand-off applies.
  const initialApplication = approvedApplications.find((a) => a.id === initialApplicationId)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LeaseFieldsInput>({
    resolver: zodResolver(leaseFieldsSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      ...(initialApplication
        ? { tenantName: initialApplication.applicantName, tenantContact: initialApplication.contact }
        : {}),
    } as LeaseFieldsInput,
  })

  const applicationsForUnit = approvedApplications.filter((a) => a.unitId === unitId)
  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null

  const applyApplication = (id: string) => {
    setApplicationId(id)
    const application = approvedApplications.find((a) => a.id === id)
    if (application) {
      setValue('tenantName', application.applicantName)
      setValue('tenantContact', application.contact)
    }
  }

  const persist = async (values: LeaseFieldsInput): Promise<CreateLeaseResponse | null> => {
    if (!unitId || !templateId) return null
    try {
      const res = await fetch('/api/landlord/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId,
          templateId,
          applicationId: applicationId || undefined,
          fields: values,
        }),
      })
      if (!res.ok) return null
      return (await res.json()) as CreateLeaseResponse
    } catch {
      return null
    }
  }

  const onGeneratePreview = handleSubmit((values) => {
    setPreview(buildLeaseDocument(values, selectedTemplate?.name ?? 'Lease agreement'))
  })

  const onSaveDraft = handleSubmit(async (values) => {
    setStatus('saving')
    const result = await persist(values)
    setStatus(result ? 'saved' : 'error')
  })

  const onDownloadPdf = handleSubmit(async (values) => {
    setStatus('saving')
    const result = await persist(values)
    if (result) {
      setPreview(buildLeaseDocument(values, selectedTemplate?.name ?? 'Lease agreement'))
      setStatus('saved')
      window.location.href = result.pdfUrl
    } else {
      setStatus('error')
    }
  })

  const noUnits = units.length === 0
  const noTemplates = templates.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Create a lease</h1>
        <p className="text-muted mt-1">Fill in the fields to generate a lease document.</p>
      </div>

      <FadeIn>
        <DisclaimerBanner>
          <p>The template is advisory, not legal advice; check compliance with local law before use.</p>
        </DisclaimerBanner>
      </FadeIn>

      {noUnits && <p className="text-sm text-muted">Add a rental unit first to create a lease.</p>}
      {noTemplates && !noUnits && <p className="text-sm text-muted">No lease templates are available yet.</p>}

      {!noUnits && !noTemplates && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Unit" htmlFor="lease-unit">
              <Select id="lease-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.address}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Template" htmlFor="lease-template">
              <Select id="lease-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Prefill tenant from application" htmlFor="lease-application" hint="Optional">
              <Select id="lease-application" value={applicationId} onChange={(e) => applyApplication(e.target.value)}>
                <option value="">None</option>
                {applicationsForUnit.map((application) => (
                  <option key={application.id} value={application.id}>
                    {application.applicantName}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={(e) => e.preventDefault()} noValidate>
              <LeaseForm register={register} errors={errors} />

              <div className="flex flex-wrap items-center gap-3 mt-6">
                <Button type="button" onClick={onGeneratePreview}>
                  Generate / Preview
                </Button>
                <Button type="button" variant="secondary" loading={status === 'saving'} onClick={onDownloadPdf}>
                  ⬇️ Download PDF
                </Button>
                <Button type="button" variant="ghost" loading={status === 'saving'} onClick={onSaveDraft}>
                  💾 Save draft
                </Button>
                {status === 'saved' && <span className="text-sm text-success">Saved</span>}
                {status === 'error' && (
                  <span role="alert" className="text-sm text-danger">
                    Something went wrong. Please try again.
                  </span>
                )}
              </div>
            </form>

            <SlideIn direction="left">
              <LeasePdfPreview document={preview} />
            </SlideIn>
          </div>
        </>
      )}
    </div>
  )
}
