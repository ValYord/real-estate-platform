'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Dialog, { DialogTitle, DialogBody } from '@/components/ui/Dialog'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import {
  createRentalUnitSchema,
  RENTAL_UNIT_TYPES,
  RENTAL_UNIT_CURRENCIES,
  type CreateRentalUnitInput,
} from '@/lib/landlord/schemas'
import type { RentalUnitSummary } from '@/lib/landlord/types'

const TYPE_LABEL: Record<(typeof RENTAL_UNIT_TYPES)[number], string> = {
  apartment: 'Apartment',
  house: 'House',
  studio: 'Studio',
  commercial: 'Commercial',
  other: 'Other',
}

interface AddUnitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (unit: RentalUnitSummary) => void
}

/** `[+ Add unit]` form (§3.2: "address, type, m², rent, currency"), posts to `POST /api/landlord/rentals`. */
export default function AddUnitDialog({ open, onOpenChange, onCreated }: AddUnitDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateRentalUnitInput>({
    resolver: zodResolver(createRentalUnitSchema),
    defaultValues: { address: '', type: 'apartment', rent: 0, currency: 'AMD' },
  })

  const close = () => {
    reset({ address: '', type: 'apartment', rent: 0, currency: 'AMD' })
    onOpenChange(false)
  }

  const onSubmit = async (values: CreateRentalUnitInput) => {
    try {
      const res = await fetch('/api/landlord/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (res.status === 201) {
        const body = (await res.json()) as { unit: RentalUnitSummary }
        onCreated(body.unit)
        close()
        return
      }

      if (res.status === 422) {
        const body = (await res.json()) as { fields?: Record<string, string[]> }
        for (const field of Object.keys(body.fields ?? {})) {
          setError(field as keyof CreateRentalUnitInput, { type: 'server' })
        }
        return
      }

      setError('root', { type: 'server', message: 'Something went wrong. Please try again.' })
    } catch {
      setError('root', { type: 'server', message: 'Something went wrong. Please try again.' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : close())}>
      <DialogTitle>Add a rental unit</DialogTitle>
      <DialogBody>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="text-sm text-danger">
              {errors.root.message}
            </p>
          )}

          <Field label="Address" htmlFor="unit-address" error={errors.address?.message}>
            <Input
              id="unit-address"
              aria-invalid={!!errors.address}
              placeholder="Arabkir, Komitas 12"
              {...register('address')}
            />
          </Field>

          <Field label="Property type" htmlFor="unit-type" error={errors.type?.message}>
            <Select id="unit-type" aria-invalid={!!errors.type} {...register('type')}>
              {RENTAL_UNIT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABEL[type]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Area (m²)" htmlFor="unit-area" hint="Optional" error={errors.areaM2?.message}>
            <Input
              id="unit-area"
              type="number"
              min={0}
              step="0.1"
              aria-invalid={!!errors.areaM2}
              {...register('areaM2')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Rent" htmlFor="unit-rent" error={errors.rent?.message}>
              <Input
                id="unit-rent"
                type="number"
                min={0}
                step="1"
                aria-invalid={!!errors.rent}
                {...register('rent')}
              />
            </Field>

            <Field label="Currency" htmlFor="unit-currency" error={errors.currency?.message}>
              <Select id="unit-currency" aria-invalid={!!errors.currency} {...register('currency')}>
                {RENTAL_UNIT_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Add unit
            </Button>
          </div>
        </form>
      </DialogBody>
    </Dialog>
  )
}
