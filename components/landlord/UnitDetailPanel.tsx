'use client'

import { useState } from 'react'
import Dialog, { DialogTitle, DialogBody } from '@/components/ui/Dialog'
import Badge from '@/components/ui/Badge'
import Tabs from '@/components/ui/Tabs'
import { formatMoney, formatDate } from '@/lib/landlord/format'
import type { RentalUnitSummary } from '@/lib/landlord/types'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'payments', label: 'Payments' },
] as const

type TabValue = (typeof TABS)[number]['value']

const PAYMENT_LABEL: Record<NonNullable<RentalUnitSummary['paymentStatus']>, string> = {
  paid: 'Paid',
  pending: 'Pending',
  overdue: 'Overdue',
}

const PAYMENT_VARIANT: Record<NonNullable<RentalUnitSummary['paymentStatus']>, 'success' | 'neutral' | 'danger'> = {
  paid: 'success',
  pending: 'neutral',
  overdue: 'danger',
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-text">{value}</span>
    </div>
  )
}

/**
 * Unit detail (§3.2 "Unit detail (click)"): tabs Overview · Tenant ·
 * Payments (Documents and Lease tabs are deferred — Lease ships with the
 * lease-generation task, §5 component tree). Every field degrades
 * gracefully when null rather than crashing (spec §4 "no crashes on
 * nulls").
 */
export default function UnitDetailPanel({
  unit,
  onClose,
}: {
  unit: RentalUnitSummary
  onClose: () => void
}) {
  const [tab, setTab] = useState<TabValue>('overview')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogTitle>{unit.address}</DialogTitle>
      <DialogBody className="w-full sm:min-w-[28rem]">
        <Tabs options={[...TABS]} value={tab} onChange={(v) => setTab(v as TabValue)} label="Unit detail" className="mb-4" />

        {tab === 'overview' && (
          <div role="tabpanel" aria-label="Overview">
            <Row label="Address" value={unit.address} />
            <Row label="Type" value={unit.type} />
            <Row label="Area" value={unit.areaM2 ? `${unit.areaM2} m²` : '—'} />
            <Row label="Rent" value={formatMoney(unit.rent, unit.currency)} />
            <Row
              label="Status"
              value={unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
            />
          </div>
        )}

        {tab === 'tenant' && (
          <div role="tabpanel" aria-label="Tenant">
            {unit.tenantName ? (
              <>
                <Row label="Name" value={unit.tenantName} />
                <Row label="Contact" value={unit.tenantContact ?? '—'} />
                <Row label="Lease ends" value={formatDate(unit.leaseEnd)} />
              </>
            ) : (
              <p className="text-sm text-muted py-4">No tenant on file for this unit yet.</p>
            )}
          </div>
        )}

        {tab === 'payments' && (
          <div role="tabpanel" aria-label="Payments">
            {unit.paymentStatus ? (
              <>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted">Status</span>
                  <Badge variant={PAYMENT_VARIANT[unit.paymentStatus]}>
                    {PAYMENT_LABEL[unit.paymentStatus]}
                  </Badge>
                </div>
                <Row label="Next payment due" value={formatDate(unit.nextPaymentDue)} />
              </>
            ) : (
              <p className="text-sm text-muted py-4">No payment history for this unit yet.</p>
            )}
          </div>
        )}
      </DialogBody>
    </Dialog>
  )
}
