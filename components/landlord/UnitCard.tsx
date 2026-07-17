'use client'

import Image from 'next/image'
import Card, { CardBody } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatMoney, formatDate } from '@/lib/landlord/format'
import type { RentalUnitSummary } from '@/lib/landlord/types'

const STATUS_LABEL: Record<RentalUnitSummary['status'], string> = {
  occupied: 'Occupied',
  vacant: 'Vacant',
  listed: 'Listed',
}

const STATUS_VARIANT: Record<RentalUnitSummary['status'], 'success' | 'neutral' | 'primary'> = {
  occupied: 'success',
  vacant: 'neutral',
  listed: 'primary',
}

/** One unit in the `/landlord/rentals` grid (§3.2: photo, address, status, rent, tenant, lease end). */
export default function UnitCard({ unit, onOpen }: { unit: RentalUnitSummary; onOpen: () => void }) {
  return (
    <Card variant="interactive" className="overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
      >
        <div className="relative w-full aspect-[4/3] bg-neutral-100 rounded-t-lg overflow-hidden">
          {unit.photoUrl ? (
            <Image src={unit.photoUrl} alt={unit.address} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-3xl" aria-hidden="true">
              🏢
            </div>
          )}
        </div>
        <CardBody className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-text">{unit.address}</h3>
            <Badge variant={STATUS_VARIANT[unit.status]}>{STATUS_LABEL[unit.status]}</Badge>
          </div>
          <p className="text-base font-bold text-text">{formatMoney(unit.rent, unit.currency)}<span className="text-sm font-normal text-muted">/mo</span></p>
          <p className="text-sm text-muted">
            Tenant: {unit.tenantName ?? 'None'}
          </p>
          <p className="text-sm text-muted">
            Lease ends: {formatDate(unit.leaseEnd)}
          </p>
        </CardBody>
      </button>
    </Card>
  )
}
