import type { Plan } from './types'

/** Ordered rows of the tier comparison table (docs/en/pages/17-pricing.md §3.3). */
export const FEATURE_ROW_KEYS = [
  'listings',
  'featuredPerMonth',
  'analytics',
  'proBadge',
  'rankingPriority',
  'leadInbox',
  'bulkUpload',
  'teamSeats',
  'support',
  'placementGuarantee',
] as const

export type FeatureRowKey = (typeof FEATURE_ROW_KEYS)[number]

export interface FeatureCell {
  kind: 'check' | 'dash' | 'number' | 'text'
  /**
   * Present only for kind 'number' | 'text'. For 'text', this is an i18n key
   * suffix into the `pro.featureValues` namespace (e.g. 'analytics_basic'),
   * not literal display copy — the component resolves it via useTranslations.
   */
  value?: number | string
}

/**
 * Pure mapping from a plan's typed features to a renderer-agnostic cell
 * shape. Keeps formatting logic out of JSX so it's directly unit-testable
 * (this repo's vitest setup has no DOM/jsdom — see __tests__/setup.ts).
 */
export function formatFeatureValue(key: FeatureRowKey, plan: Plan): FeatureCell {
  const f = plan.features
  switch (key) {
    case 'listings':
      if (f.listings === null) return { kind: 'text', value: 'unlimited' }
      return f.listings === 0 ? { kind: 'dash' } : { kind: 'number', value: f.listings }
    case 'featuredPerMonth':
      return f.featuredPerMonth === 0 ? { kind: 'dash' } : { kind: 'number', value: f.featuredPerMonth }
    case 'analytics':
      return { kind: 'text', value: `analytics_${f.analytics}` }
    case 'proBadge':
      return { kind: f.proBadge ? 'check' : 'dash' }
    case 'rankingPriority':
      return f.rankingPriority === 'none'
        ? { kind: 'dash' }
        : { kind: 'text', value: `ranking_${f.rankingPriority}` }
    case 'leadInbox':
      if (f.leadInbox === 'none') return { kind: 'dash' }
      return f.leadInbox === 'priority' ? { kind: 'text', value: 'leadInboxPriority' } : { kind: 'check' }
    case 'bulkUpload':
      return { kind: f.bulkUpload ? 'check' : 'dash' }
    case 'teamSeats':
      return f.teamSeats === 0 ? { kind: 'dash' } : { kind: 'number', value: f.teamSeats }
    case 'support':
      return f.support === 'community' ? { kind: 'dash' } : { kind: 'text', value: `support_${f.support}` }
    case 'placementGuarantee':
      return { kind: f.placementGuarantee ? 'check' : 'dash' }
    default:
      return { kind: 'dash' }
  }
}
