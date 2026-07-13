/**
 * Phase-1 home-value heuristic (docs/en/pages/12-home-value.md §3.3):
 *
 *   base      = area_m2 × medianPricePerM2(district | city)
 *   estimate  = base × roomsCoeff × floorCoeff × ageCoeff × conditionCoeff
 *   estimate  = clamp(estimate, median ± 3σ)   // outlier guard
 *
 *   low  = estimate × (1 − margin)
 *   high = estimate × (1 + margin)             // margin ∈ [0.10, 0.20], comp-density dependent
 *
 * Pure function, no I/O — the district/city median lookup (a database query)
 * happens in lib/home-value/medianLookup.ts and is passed in here as plain
 * numbers. This keeps the actual valuation math isolated and unit-testable
 * without a database. Do NOT add a comparable-sales regression / ML model
 * here — that is explicitly Phase 3+ per the doc.
 */
import type {
  Confidence,
  EstimateFactor,
  FactorDirection,
  FallbackLevel,
  HomeValueCondition,
  PropertyAttributes,
} from './types'

export interface ComputeEstimateInput extends PropertyAttributes {
  /** District (or city-fallback) median price/m², in AMD. Must be > 0. */
  medianPricePerM2: number
  /** Number of comparable properties the median was computed from. */
  sampleCount: number
  /** Whether the median came from the district, a wider city fallback, or nothing at all. */
  fallbackLevel: FallbackLevel
  /**
   * Assumed relative standard deviation of price/m² within the sample, used
   * only for the outlier clamp (`median ± 3σ`). We don't have a real
   * computed σ at MVP stage (no sold-price time series yet), so this is a
   * documented, conservative default (20% of the median) rather than a
   * fabricated statistic. Override in tests / once real variance is tracked.
   */
  sigmaFraction?: number
  /** Injectable for deterministic tests; defaults to the current year. */
  currentYear?: number
}

export interface ComputeEstimateResult {
  estimate: number
  low: number
  high: number
  pricePerM2: number
  medianPricePerM2: number
  vsMedianPct: number
  confidence: Confidence
  compsCount: number
  fallbackLevel: FallbackLevel
  factors: EstimateFactor[]
}

const DEFAULT_SIGMA_FRACTION = 0.2
/** Typical Armenian-market m² per room, used only to derive a "neutral" room count for the coefficient. */
const M2_PER_ROOM_BASELINE = 30

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function round(value: number): number {
  return Math.round(value)
}

// ── Coefficients ─────────────────────────────────────────────────────────

/** ±2% per room away from the area-implied "expected" room count, capped at ±8%. */
function roomsCoefficient(areaM2: number, rooms: number | undefined): { coeff: number; weightPct: number } {
  if (rooms == null) return { coeff: 1, weightPct: 0 }
  const expectedRooms = Math.max(1, Math.round(areaM2 / M2_PER_ROOM_BASELINE))
  const delta = rooms - expectedRooms
  const coeff = 1 + clamp(delta * 0.02, -0.08, 0.08)
  return { coeff, weightPct: round((coeff - 1) * 100) }
}

/** First/last/basement floors are worth less; middle floors are neutral. */
function floorCoefficient(
  floor: number | undefined,
  floorsTotal: number | undefined,
): { coeff: number; weightPct: number } {
  if (floor == null) return { coeff: 1, weightPct: 0 }
  if (floor <= 0) return { coeff: 0.95, weightPct: -5 }
  if (floorsTotal != null && (floor === 1 || floor === floorsTotal)) {
    return { coeff: 0.97, weightPct: -3 }
  }
  return { coeff: 1, weightPct: 0 }
}

/** Newer buildings command a premium; older buildings a discount. */
function ageCoefficient(yearBuilt: number | undefined, currentYear: number): { coeff: number; weightPct: number } {
  if (yearBuilt == null) return { coeff: 1, weightPct: 0 }
  const age = currentYear - yearBuilt
  let coeff: number
  if (age <= 5) coeff = 1.05
  else if (age <= 15) coeff = 1.0
  else if (age <= 30) coeff = 0.97
  else coeff = 0.93
  return { coeff, weightPct: round((coeff - 1) * 100) }
}

const CONDITION_COEFF: Record<HomeValueCondition, number> = {
  new: 1.08,
  renovated: 1.06,
  good: 1.0,
  needs_renovation: 0.9,
}

function conditionCoefficient(condition: HomeValueCondition | undefined): { coeff: number; weightPct: number } {
  if (condition == null) return { coeff: 1, weightPct: 0 }
  const coeff = CONDITION_COEFF[condition]
  return { coeff, weightPct: round((coeff - 1) * 100) }
}

// ── Confidence & margin ─────────────────────────────────────────────────

function computeConfidence(sampleCount: number, fallbackLevel: FallbackLevel): Confidence {
  if (fallbackLevel === 'none') return 'low'
  let confidence: Confidence
  if (sampleCount >= 8) confidence = 'high'
  else if (sampleCount >= 3) confidence = 'medium'
  else confidence = 'low'
  // A city-wide fallback is a coarser, less locally-accurate sample — never
  // report "high" confidence off it, even with plenty of comps.
  if (fallbackLevel === 'city' && confidence === 'high') confidence = 'medium'
  return confidence
}

/** More comps → narrower range; fewer comps → wider range. Always within [0.10, 0.20]. */
function computeMargin(sampleCount: number): number {
  return clamp(0.2 - sampleCount * 0.02, 0.1, 0.2)
}

// ── Main entry point ─────────────────────────────────────────────────────

export function computeEstimate(input: ComputeEstimateInput): ComputeEstimateResult {
  const {
    areaM2,
    rooms,
    floor,
    floorsTotal,
    yearBuilt,
    condition,
    medianPricePerM2,
    sampleCount,
    fallbackLevel,
    sigmaFraction = DEFAULT_SIGMA_FRACTION,
    currentYear = new Date().getFullYear(),
  } = input

  if (!(areaM2 > 0)) throw new Error('areaM2 must be a positive number')
  if (!(medianPricePerM2 > 0)) throw new Error('medianPricePerM2 must be a positive number')

  const base = areaM2 * medianPricePerM2

  const rc = roomsCoefficient(areaM2, rooms)
  const fc = floorCoefficient(floor, floorsTotal)
  const ac = ageCoefficient(yearBuilt, currentYear)
  const cc = conditionCoefficient(condition)

  let estimate = base * rc.coeff * fc.coeff * ac.coeff * cc.coeff

  // Outlier guard: clamp(estimate, median ± 3σ).
  const sigma = medianPricePerM2 * sigmaFraction
  const lowerBound = (medianPricePerM2 - 3 * sigma) * areaM2
  const upperBound = (medianPricePerM2 + 3 * sigma) * areaM2
  estimate = clamp(estimate, Math.max(lowerBound, 0), upperBound)

  const margin = computeMargin(sampleCount)
  const low = estimate * (1 - margin)
  const high = estimate * (1 + margin)

  const pricePerM2 = estimate / areaM2
  const vsMedianPct = ((pricePerM2 - medianPricePerM2) / medianPricePerM2) * 100

  const confidence = computeConfidence(sampleCount, fallbackLevel)

  const direction = (weightPct: number): FactorDirection =>
    weightPct > 0 ? 'up' : weightPct < 0 ? 'down' : 'neutral'

  const factors: EstimateFactor[] = [
    {
      key: 'location',
      label: 'District',
      direction: 'neutral',
      weightPct: 100,
      tooltip:
        fallbackLevel === 'district'
          ? 'The district median price/m² is the primary driver of this estimate.'
          : fallbackLevel === 'city'
            ? 'Not enough district-level data — the city-wide median price/m² was used instead.'
            : 'No comparable data was available for this area; a fallback median was used.',
    },
    {
      key: 'rooms',
      label: 'Number of rooms',
      direction: direction(rc.weightPct),
      weightPct: rc.weightPct,
      tooltip: 'Deviation from the room count typical for this area.',
    },
    {
      key: 'floor',
      label: 'Floor',
      direction: direction(fc.weightPct),
      weightPct: fc.weightPct,
      tooltip: 'First, ground, or top floors are typically valued slightly lower.',
    },
    {
      key: 'age',
      label: 'Year built',
      direction: direction(ac.weightPct),
      weightPct: ac.weightPct,
      tooltip: 'Newer buildings command a premium; older buildings a discount.',
    },
    {
      key: 'condition',
      label: 'Condition',
      direction: direction(cc.weightPct),
      weightPct: cc.weightPct,
      tooltip: `${condition ?? 'Unspecified'} condition compared to the district average.`,
    },
  ]

  return {
    estimate,
    low,
    high,
    pricePerM2,
    medianPricePerM2,
    vsMedianPct,
    confidence,
    compsCount: sampleCount,
    fallbackLevel,
    factors,
  }
}
