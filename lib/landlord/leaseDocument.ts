import type { LeaseFieldsInput } from './schemas'

export interface LeaseDocumentField {
  label: string
  value: string
}

export interface LeaseDocumentSection {
  heading: string
  fields: LeaseDocumentField[]
}

export interface LeaseDocument {
  title: string
  sections: LeaseDocumentSection[]
}

const PET_LABEL: Record<LeaseFieldsInput['pets'], string> = {
  allowed: 'Allowed',
  not_allowed: 'Not allowed',
  case_by_case: 'Case-by-case',
}

const YES_NO_LABEL: Record<LeaseFieldsInput['subletting'], string> = {
  allowed: 'Allowed',
  not_allowed: 'Not allowed',
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Merges validated lease form fields into a structured document — the
 * "template merge" step of §3.4 ("Fields → template merge → PDF"). Shared by
 * `<LeasePdfPreview>` (renders it as a document-like card) and
 * `renderTextPdf` (flattened to lines via `leaseDocumentToLines` below), so
 * the on-screen preview and the downloaded PDF always show the same content.
 */
export function buildLeaseDocument(fields: LeaseFieldsInput, templateName: string): LeaseDocument {
  const rentLine = `${fields.rent.toLocaleString('en-US')} ${fields.currency} / month`
  const depositLine = `${fields.deposit.toLocaleString('en-US')} ${fields.currency}`

  return {
    title: `Residential Lease Agreement — ${templateName}`,
    sections: [
      {
        heading: 'Parties',
        fields: [
          { label: 'Landlord', value: fields.landlordName },
          { label: 'Landlord contact', value: fields.landlordContact },
          { label: 'Tenant', value: fields.tenantName },
          { label: 'Tenant contact', value: fields.tenantContact },
        ],
      },
      {
        heading: 'Property',
        fields: [
          { label: 'Address', value: fields.propertyAddress },
          ...(fields.propertyAreaM2 ? [{ label: 'Area', value: `${fields.propertyAreaM2} m²` }] : []),
          ...(fields.propertyDescription ? [{ label: 'Description', value: fields.propertyDescription }] : []),
        ],
      },
      {
        heading: 'Term',
        fields: [
          { label: 'Start date', value: formatDate(fields.startDate) },
          { label: 'End date', value: formatDate(fields.endDate) },
          ...(fields.renewalCondition ? [{ label: 'Renewal condition', value: fields.renewalCondition }] : []),
        ],
      },
      {
        heading: 'Rent & deposit',
        fields: [
          { label: 'Rent', value: rentLine },
          { label: 'Payment day', value: `Day ${fields.paymentDay} of each month` },
          ...(fields.latePenalty ? [{ label: 'Late penalty', value: fields.latePenalty }] : []),
          { label: 'Security deposit', value: depositLine },
        ],
      },
      {
        heading: 'Utilities',
        fields: [{ label: 'Who pays', value: fields.utilities || 'Not specified' }],
      },
      {
        heading: 'Rules',
        fields: [
          { label: 'Pets', value: PET_LABEL[fields.pets] },
          { label: 'Subletting', value: YES_NO_LABEL[fields.subletting] },
          { label: 'Smoking', value: YES_NO_LABEL[fields.smoking] },
          ...(fields.repairResponsibility ? [{ label: 'Repair responsibility', value: fields.repairResponsibility }] : []),
        ],
      },
      {
        heading: 'Signatures',
        fields: [
          { label: 'Landlord signature', value: '_______________________' },
          { label: 'Tenant signature', value: '_______________________' },
        ],
      },
    ],
  }
}

/** Flattens a `LeaseDocument` to plain text lines for `renderTextPdf` (lib/landlord/pdf.ts). */
export function leaseDocumentToLines(doc: LeaseDocument): string[] {
  const lines: string[] = [doc.title, '']
  for (const section of doc.sections) {
    lines.push(section.heading)
    for (const field of section.fields) lines.push(`  ${field.label}: ${field.value}`)
    lines.push('')
  }
  return lines
}
