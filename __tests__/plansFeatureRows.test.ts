import { describe, it, expect } from 'vitest'
import { FEATURE_ROW_KEYS, formatFeatureValue } from '@/lib/plans/featureRows'
import { DEFAULT_PLANS } from '@/lib/plans/defaultPlans'

const free = DEFAULT_PLANS.find((p) => p.tier === 'free')!
const pro = DEFAULT_PLANS.find((p) => p.tier === 'pro')!
const premium = DEFAULT_PLANS.find((p) => p.tier === 'premium')!

describe('formatFeatureValue', () => {
  it('renders unlimited listings (Premium) as a text cell', () => {
    expect(formatFeatureValue('listings', premium)).toEqual({ kind: 'text', value: 'unlimited' })
  })

  it('renders a numeric listings cap (Free/Pro) as a number cell', () => {
    expect(formatFeatureValue('listings', free)).toEqual({ kind: 'number', value: 3 })
    expect(formatFeatureValue('listings', pro)).toEqual({ kind: 'number', value: 25 })
  })

  it('renders a zero count (no featured listings on Free) as a dash', () => {
    expect(formatFeatureValue('featuredPerMonth', free)).toEqual({ kind: 'dash' })
  })

  it('renders a positive count as a number cell', () => {
    expect(formatFeatureValue('featuredPerMonth', pro)).toEqual({ kind: 'number', value: 2 })
  })

  it('renders boolean features as check/dash', () => {
    expect(formatFeatureValue('proBadge', free)).toEqual({ kind: 'dash' })
    expect(formatFeatureValue('proBadge', pro)).toEqual({ kind: 'check' })
    expect(formatFeatureValue('bulkUpload', pro)).toEqual({ kind: 'dash' })
    expect(formatFeatureValue('bulkUpload', premium)).toEqual({ kind: 'check' })
    expect(formatFeatureValue('placementGuarantee', pro)).toEqual({ kind: 'dash' })
    expect(formatFeatureValue('placementGuarantee', premium)).toEqual({ kind: 'check' })
  })

  it('renders enum-valued features as translation-key text cells per tier', () => {
    expect(formatFeatureValue('analytics', free)).toEqual({ kind: 'text', value: 'analytics_basic' })
    expect(formatFeatureValue('analytics', pro)).toEqual({ kind: 'text', value: 'analytics_extended' })
    expect(formatFeatureValue('analytics', premium)).toEqual({ kind: 'text', value: 'analytics_full' })

    expect(formatFeatureValue('rankingPriority', free)).toEqual({ kind: 'dash' })
    expect(formatFeatureValue('rankingPriority', pro)).toEqual({ kind: 'text', value: 'ranking_medium' })
    expect(formatFeatureValue('rankingPriority', premium)).toEqual({ kind: 'text', value: 'ranking_high' })

    expect(formatFeatureValue('support', free)).toEqual({ kind: 'dash' })
    expect(formatFeatureValue('support', pro)).toEqual({ kind: 'text', value: 'support_email' })
    expect(formatFeatureValue('support', premium)).toEqual({ kind: 'text', value: 'support_email_phone' })
  })

  it('renders leadInbox: none as dash, standard as check, priority as a text cell', () => {
    expect(formatFeatureValue('leadInbox', free)).toEqual({ kind: 'dash' })
    expect(formatFeatureValue('leadInbox', pro)).toEqual({ kind: 'check' })
    expect(formatFeatureValue('leadInbox', premium)).toEqual({ kind: 'text', value: 'leadInboxPriority' })
  })

  it('covers every declared feature row key for every seeded tier without throwing', () => {
    for (const plan of DEFAULT_PLANS) {
      for (const key of FEATURE_ROW_KEYS) {
        const cell = formatFeatureValue(key, plan)
        expect(['check', 'dash', 'number', 'text']).toContain(cell.kind)
      }
    }
  })
})
