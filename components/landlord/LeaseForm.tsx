'use client'

import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Stagger from '@/components/motion/Stagger'
import { RENTAL_UNIT_CURRENCIES, LEASE_PET_POLICIES, LEASE_YES_NO, type LeaseFieldsInput } from '@/lib/landlord/schemas'

const PET_LABEL: Record<(typeof LEASE_PET_POLICIES)[number], string> = {
  allowed: 'Allowed',
  not_allowed: 'Not allowed',
  case_by_case: 'Case-by-case',
}

const YES_NO_LABEL: Record<(typeof LEASE_YES_NO)[number], string> = {
  allowed: 'Allowed',
  not_allowed: 'Not allowed',
}

/**
 * The `/landlord/lease` fillable-fields form (§3.4 "Lease form (fields →
 * document)": parties, property, term, rent, deposit, utilities, rules).
 * Presentational — the parent (`LeaseDashboard`) owns the `react-hook-form`
 * instance so it can also drive `[Generate / Preview]` / `[Download PDF]` /
 * `[💾 Save draft]` from the same validated values.
 */
export default function LeaseForm({
  register,
  errors,
}: {
  register: UseFormRegister<LeaseFieldsInput>
  errors: FieldErrors<LeaseFieldsInput>
}) {
  return (
    <Stagger gap={0.05}>
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-text">Parties</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Landlord name" htmlFor="lease-landlord-name" error={errors.landlordName?.message}>
            <Input id="lease-landlord-name" aria-invalid={!!errors.landlordName} {...register('landlordName')} />
          </Field>
          <Field label="Landlord contact" htmlFor="lease-landlord-contact" error={errors.landlordContact?.message}>
            <Input id="lease-landlord-contact" aria-invalid={!!errors.landlordContact} {...register('landlordContact')} />
          </Field>
          <Field label="Tenant name" htmlFor="lease-tenant-name" error={errors.tenantName?.message}>
            <Input id="lease-tenant-name" aria-invalid={!!errors.tenantName} {...register('tenantName')} />
          </Field>
          <Field label="Tenant contact" htmlFor="lease-tenant-contact" error={errors.tenantContact?.message}>
            <Input id="lease-tenant-contact" aria-invalid={!!errors.tenantContact} {...register('tenantContact')} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 mt-6">
        <legend className="text-sm font-semibold text-text">Property</legend>
        <Field label="Address" htmlFor="lease-property-address" error={errors.propertyAddress?.message}>
          <Input id="lease-property-address" aria-invalid={!!errors.propertyAddress} {...register('propertyAddress')} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Area (m²)" htmlFor="lease-property-area" hint="Optional" error={errors.propertyAreaM2?.message}>
            <Input id="lease-property-area" type="number" min={0} step="0.1" aria-invalid={!!errors.propertyAreaM2} {...register('propertyAreaM2')} />
          </Field>
        </div>
        <Field label="Description" htmlFor="lease-property-description" hint="Optional" error={errors.propertyDescription?.message}>
          <Input id="lease-property-description" aria-invalid={!!errors.propertyDescription} {...register('propertyDescription')} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 mt-6">
        <legend className="text-sm font-semibold text-text">Term</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Start date" htmlFor="lease-start-date" error={errors.startDate?.message}>
            <Input id="lease-start-date" type="date" aria-invalid={!!errors.startDate} {...register('startDate')} />
          </Field>
          <Field label="End date" htmlFor="lease-end-date" error={errors.endDate?.message}>
            <Input id="lease-end-date" type="date" aria-invalid={!!errors.endDate} {...register('endDate')} />
          </Field>
        </div>
        <Field label="Renewal condition" htmlFor="lease-renewal" hint="Optional" error={errors.renewalCondition?.message}>
          <Input id="lease-renewal" aria-invalid={!!errors.renewalCondition} {...register('renewalCondition')} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 mt-6">
        <legend className="text-sm font-semibold text-text">Rent &amp; deposit</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Rent" htmlFor="lease-rent" error={errors.rent?.message}>
            <Input id="lease-rent" type="number" min={0} step="1" aria-invalid={!!errors.rent} {...register('rent')} />
          </Field>
          <Field label="Currency" htmlFor="lease-currency" error={errors.currency?.message}>
            <Select id="lease-currency" aria-invalid={!!errors.currency} {...register('currency')}>
              {RENTAL_UNIT_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Payment day" htmlFor="lease-payment-day" hint="1–31" error={errors.paymentDay?.message}>
            <Input id="lease-payment-day" type="number" min={1} max={31} step="1" aria-invalid={!!errors.paymentDay} {...register('paymentDay')} />
          </Field>
        </div>
        <Field label="Late penalty" htmlFor="lease-late-penalty" hint="Optional" error={errors.latePenalty?.message}>
          <Input id="lease-late-penalty" aria-invalid={!!errors.latePenalty} {...register('latePenalty')} />
        </Field>
        <Field label="Security deposit" htmlFor="lease-deposit" error={errors.deposit?.message}>
          <Input id="lease-deposit" type="number" min={0} step="1" aria-invalid={!!errors.deposit} {...register('deposit')} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 mt-6">
        <legend className="text-sm font-semibold text-text">Utilities</legend>
        <Field label="Who pays" htmlFor="lease-utilities" hint="e.g. Tenant pays electricity/water; landlord pays building fees" error={errors.utilities?.message}>
          <Input id="lease-utilities" aria-invalid={!!errors.utilities} {...register('utilities')} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 mt-6">
        <legend className="text-sm font-semibold text-text">Rules</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Pets" htmlFor="lease-pets" error={errors.pets?.message}>
            <Select id="lease-pets" aria-invalid={!!errors.pets} {...register('pets')}>
              {LEASE_PET_POLICIES.map((policy) => (
                <option key={policy} value={policy}>
                  {PET_LABEL[policy]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subletting" htmlFor="lease-subletting" error={errors.subletting?.message}>
            <Select id="lease-subletting" aria-invalid={!!errors.subletting} {...register('subletting')}>
              {LEASE_YES_NO.map((value) => (
                <option key={value} value={value}>
                  {YES_NO_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Smoking" htmlFor="lease-smoking" error={errors.smoking?.message}>
            <Select id="lease-smoking" aria-invalid={!!errors.smoking} {...register('smoking')}>
              {LEASE_YES_NO.map((value) => (
                <option key={value} value={value}>
                  {YES_NO_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Repair responsibility" htmlFor="lease-repair" hint="Optional" error={errors.repairResponsibility?.message}>
          <Input id="lease-repair" aria-invalid={!!errors.repairResponsibility} {...register('repairResponsibility')} />
        </Field>
      </fieldset>
    </Stagger>
  )
}
