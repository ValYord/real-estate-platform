import type { LeaseDocument } from '@/lib/landlord/leaseDocument'

/**
 * `/landlord/lease` "live PDF preview" (§3.4 "[Generate / Preview] → render
 * the lease document (PDF preview)", §4 "Lease draft | Live PDF preview
 * next to the form"). Renders the same `LeaseDocument` structure the PDF
 * download endpoint renders from `lib/landlord/leaseDocument.ts`, so the
 * on-screen preview and the downloaded file never disagree. Accessibility
 * §7: "a 'Download PDF' textual fallback — the preview is decorative, not
 * the only access" — this preview is plain readable text/markup, not a
 * canvas/image, so it's accessible on its own besides the download button.
 */
export default function LeasePdfPreview({ document }: { document: LeaseDocument | null }) {
  if (!document) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-neutral-50 p-8 text-center text-sm text-muted">
        Fill in the form and click &ldquo;Generate / Preview&rdquo; to see the lease document here.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6 space-y-5" data-testid="lease-preview">
      <h2 className="text-lg font-semibold text-text">{document.title}</h2>
      {document.sections.map((section) => (
        <div key={section.heading}>
          <h3 className="text-sm font-semibold text-text border-b border-border pb-1 mb-2">{section.heading}</h3>
          <dl className="space-y-1">
            {section.fields.map((field) => (
              <div key={field.label} className="flex items-start justify-between gap-4 text-sm">
                <dt className="text-muted flex-shrink-0">{field.label}</dt>
                <dd className="text-text text-right">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}
