'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, FormProvider, type FieldPath } from 'react-hook-form'
import { useRouter } from '@/i18n/navigation'

import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
} from '@/lib/listings/schemas'
import type { WizardFormData, SaveStatus, LimitReachedPayload, ListingDraft } from '@/lib/listings/types'

import WizardHeader from './WizardHeader'
import WizardProgressBar, { WIZARD_STEPS } from './WizardProgressBar'
import WizardSummary from './WizardSummary'
import WizardNav from './WizardNav'
import LimitReachedModal from './LimitReachedModal'
import Step1Type from './steps/Step1Type'
import Step2Location from './steps/Step2Location'
import Step3Details from './steps/Step3Details'
import Step4Media from './steps/Step4Media'
import Step5Price from './steps/Step5Price'
import Step6ContactPreview from './steps/Step6ContactPreview'

type WizardMode = 'create' | 'edit'

interface ListingWizardProps {
  mode: WizardMode
  listingId?: string
  draftId?: string
}

const TOTAL_STEPS = 6

const STEP_SCHEMAS = [
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
]

const DEFAULT_VALUES: Partial<WizardFormData> = {
  country: 'AM',
  hideExact: false,
  heating: false,
  balcony: false,
  parking: false,
  elevator: false,
  amenities: [],
  title: { hy: '', ru: '', en: '' },
  description: { hy: '', ru: '', en: '' },
  media: [],
  videoUrl: '',
  tour360Url: '',
  currency: 'AMD',
  negotiable: false,
  utilitiesIncluded: false,
  contactPreference: 'phone_and_chat',
}

function buildDefaultValues(draft: ListingDraft): Partial<WizardFormData> {
  return {
    ...DEFAULT_VALUES,
    dealType: draft.dealType,
    propertyType: draft.propertyType,
    country: draft.country ?? 'AM',
    city: draft.city ?? '',
    district: draft.district,
    address: draft.address,
    buildingApt: draft.buildingApt,
    lat: draft.lat ?? undefined,
    lng: draft.lng ?? undefined,
    hideExact: draft.hideExact ?? false,
    areaM2: draft.areaM2 ?? undefined,
    rooms: draft.rooms ?? undefined,
    bedrooms: draft.bedrooms ?? undefined,
    bathrooms: draft.bathrooms ?? undefined,
    floor: draft.floor ?? undefined,
    floorsTotal: draft.floorsTotal ?? undefined,
    yearBuilt: draft.yearBuilt ?? undefined,
    condition: (draft.condition as WizardFormData['condition']) ?? undefined,
    heating: draft.heating ?? false,
    balcony: draft.balcony ?? false,
    parking: draft.parking ?? false,
    elevator: draft.elevator ?? false,
    amenities: draft.amenities ?? [],
    title: {
      hy: draft.title?.hy ?? '',
      ru: draft.title?.ru ?? '',
      en: draft.title?.en ?? '',
    },
    description: {
      hy: draft.description?.hy ?? '',
      ru: draft.description?.ru ?? '',
      en: draft.description?.en ?? '',
    },
    media: draft.media ?? [],
    videoUrl: draft.videoUrl ?? '',
    tour360Url: draft.tour360Url ?? '',
    price: draft.price ?? undefined,
    currency: draft.currency ?? 'AMD',
    negotiable: draft.negotiable ?? false,
    utilitiesIncluded: draft.utilitiesIncluded ?? false,
    deposit: draft.deposit ?? undefined,
    minRentTermMonths: draft.minRentTermMonths ?? undefined,
    contactName: draft.contactName ?? '',
    contactPhone: draft.contactPhone ?? '',
    contactPreference: draft.contactPreference ?? 'phone_and_chat',
  }
}

export default function ListingWizard({ mode, listingId: initialListingId, draftId }: ListingWizardProps) {
  const router = useRouter()
  const stepTitleRef = useRef<HTMLDivElement>(null)

  const [currentStep, setCurrentStep] = useState(0)
  const [listingId, setListingId] = useState<string | null>(initialListingId ?? null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(
    mode === 'edit' ? new Set([0, 1, 2, 3, 4, 5]) : new Set([0]),
  )
  const [limitPayload, setLimitPayload] = useState<LimitReachedPayload | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [missingSteps, setMissingSteps] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(mode === 'edit' || Boolean(draftId))

  const form = useForm<WizardFormData>({
    defaultValues: DEFAULT_VALUES as WizardFormData,
  })

  const listingIdRef = useRef<string | null>(listingId)
  listingIdRef.current = listingId

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load draft/edit data ─────────────────────────────────────────────────
  useEffect(() => {
    const idToLoad = initialListingId ?? draftId
    if (!idToLoad) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    fetch(`/api/listings/${idToLoad}`)
      .then(async (res) => {
        if (!res.ok) return
        const draft = (await res.json()) as ListingDraft
        const values = buildDefaultValues(draft)
        form.reset(values as WizardFormData)
        if (!listingId) setListingId(draft.id)
        setSavedAt(draft.savedAt ?? null)
        if (draft.savedAt) setSaveStatus('saved')
      })
      .finally(() => setIsLoading(false))
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const doAutoSave = useCallback(async (values: Partial<WizardFormData>, id: string) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (res.ok) {
        const data = (await res.json()) as { id: string; status: string; savedAt: string }
        setSaveStatus('saved')
        setSavedAt(data.savedAt)
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
  }, [])

  // Subscribe to form changes for auto-save
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!listingIdRef.current) return
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        if (listingIdRef.current) {
          void doAutoSave(values as Partial<WizardFormData>, listingIdRef.current)
        }
      }, 1500)
    })
    return () => {
      subscription.unsubscribe()
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [form, doAutoSave])

  // ── Leave warning ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'saving' || saveStatus === 'error') {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveStatus])

  // ── Focus step title on navigation ────────────────────────────────────────
  useEffect(() => {
    if (stepTitleRef.current) {
      stepTitleRef.current.focus()
    }
  }, [currentStep])

  // ── Step validation ───────────────────────────────────────────────────────
  const validateCurrentStep = useCallback((): boolean => {
    const values = form.getValues()
    const schema = STEP_SCHEMAS[currentStep]
    if (!schema) return true
    const result = schema.safeParse(values)
    if (result.success) return true

    // Set field errors
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') as FieldPath<WizardFormData>
      if (path) {
        form.setError(path, { type: 'manual', message: issue.message })
      }
    }
    return false
  }, [currentStep, form])

  // Reactive canContinue for button disabled state — watch form
  const formValues = form.watch()
  const currentStepValid = (() => {
    const schema = STEP_SCHEMAS[currentStep]
    if (!schema) return true
    return schema.safeParse(formValues).success
  })()

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleBack = () => {
    setCurrentStep((s) => Math.max(0, s - 1))
  }

  const handleJump = (step: number) => {
    setCurrentStep(step)
  }

  const createDraft = async (): Promise<string | null> => {
    const values = form.getValues()
    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealType: values.dealType,
        propertyType: values.propertyType,
      }),
    })

    if (res.status === 403) {
      const payload = (await res.json()) as LimitReachedPayload
      setLimitPayload(payload)
      return null
    }

    if (!res.ok) return null

    const data = (await res.json()) as { id: string; status: string }
    return data.id
  }

  const handleContinue = async () => {
    if (!validateCurrentStep()) return

    // Step 1: create draft on first continue
    if (currentStep === 0 && !listingId) {
      const newId = await createDraft()
      if (!newId) return // limit reached → modal shown
      setListingId(newId)
      listingIdRef.current = newId
    }

    const nextStep = currentStep + 1
    setCurrentStep(nextStep)
    setVisitedSteps((prev) => {
      const next = new Set(prev)
      next.add(nextStep)
      return next
    })
  }

  const handlePublish = async () => {
    if (!listingId) return
    if (!validateCurrentStep()) return

    setIsPublishing(true)
    setMissingSteps([])

    try {
      const values = form.getValues()
      const res = await fetch(`/api/listings/${listingId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: values.contactName,
          contactPhone: values.contactPhone,
          contactPreference: values.contactPreference,
          termsAccepted: values.termsAccepted,
        }),
      })

      if (res.status === 422) {
        const err = (await res.json()) as { error: string; missing: string[] }
        setMissingSteps(err.missing ?? [])
        setIsPublishing(false)
        return
      }

      if (res.status === 403) {
        const payload = (await res.json()) as LimitReachedPayload
        setLimitPayload(payload)
        setIsPublishing(false)
        return
      }

      if (!res.ok) {
        setIsPublishing(false)
        return
      }

      const data = (await res.json()) as { id: string; status: string; slug: string }
      // Append ?published=1 so the property page shows the "Published 🎉" toast
      router.push(`/property/${data.id}/${data.slug}?published=1`)
    } catch {
      setIsPublishing(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!listingId) return
    setIsSavingDraft(true)
    try {
      await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.getValues()),
      })
      router.push('/dashboard')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const isLastStep = currentStep === TOTAL_STEPS - 1

  const jumpableSteps = mode === 'edit'
    ? new Set([0, 1, 2, 3, 4, 5])
    : new Set(Array.from(visitedSteps).filter((s) => s < currentStep))

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <FormProvider {...form}>
      <div
        className="min-h-screen bg-gray-50 flex flex-col"
        aria-label={`${mode === 'edit' ? 'Edit' : 'Create'} a listing, step ${currentStep + 1} of ${TOTAL_STEPS}`}
      >
        {/* Header */}
        <WizardHeader saveStatus={saveStatus} savedAt={savedAt} />

        {/* Progress bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-5xl mx-auto">
            <WizardProgressBar
              steps={WIZARD_STEPS}
              current={currentStep}
              jumpable={jumpableSteps}
              onJump={handleJump}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex gap-8">
          {/* Step content */}
          <main className="flex-1 max-w-2xl">
            <div ref={stepTitleRef} tabIndex={-1} className="outline-none">
              <div aria-live="polite" className="sr-only">
                Step {currentStep + 1} of {TOTAL_STEPS}: {WIZARD_STEPS[currentStep]?.label}
              </div>

              <div className="space-y-6">
                {currentStep === 0 && <Step1Type />}
                {currentStep === 1 && <Step2Location />}
                {currentStep === 2 && <Step3Details />}
                {currentStep === 3 && <Step4Media listingId={listingId} />}
                {currentStep === 4 && <Step5Price />}
                {currentStep === 5 && (
                  <Step6ContactPreview
                    missingSteps={missingSteps}
                    onJumpToStep={handleJump}
                    onSaveDraft={handleSaveDraft}
                    isSavingDraft={isSavingDraft}
                  />
                )}
              </div>
            </div>

            {/* Desktop nav */}
            <WizardNav
              step={currentStep}
              totalSteps={TOTAL_STEPS}
              canContinue={currentStepValid}
              isPublishing={isPublishing}
              onBack={handleBack}
              onContinue={isLastStep ? () => void handlePublish() : () => void handleContinue()}
            />
          </main>

          {/* Summary sidebar (desktop only) */}
          <WizardSummary
            data={formValues}
            saveStatus={saveStatus}
            savedAt={savedAt}
          />
        </div>

        {/* Mobile bottom padding for fixed nav */}
        <div className="md:hidden h-20" aria-hidden="true" />
      </div>

      {/* Limit reached modal */}
      {limitPayload && (
        <LimitReachedModal
          limit={limitPayload.limit}
          active={limitPayload.active}
          onClose={() => setLimitPayload(null)}
        />
      )}
    </FormProvider>
  )
}
