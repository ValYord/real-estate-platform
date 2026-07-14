import type {
  AnalyticsResponse,
  ApiErrorResponse,
  OverviewResponse,
  ProAnalyticsMetric,
  ProDateRange,
} from './types'

/**
 * Thrown by the fetch helpers below when `GET /api/pro/*` responds with a
 * non-2xx status. Carries the HTTP status and the parsed `error` code so
 * callers can distinguish "tier_insufficient" (→ render `<UpgradeOverlay>`)
 * from any other failure (→ render the generic per-widget retry state).
 */
export class ProApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.name = 'ProApiError'
    this.status = status
    this.code = code
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    let code = 'request_failed'
    try {
      const body = (await res.json()) as ApiErrorResponse
      if (body?.error) code = body.error
    } catch {
      // Response body wasn't JSON — keep the generic code.
    }
    throw new ProApiError(res.status, code)
  }
  return res.json() as Promise<T>
}

export function fetchProOverview(range: ProDateRange): Promise<OverviewResponse> {
  return getJson<OverviewResponse>(`/api/pro/overview?range=${range}`)
}

export function fetchProAnalytics(
  range: ProDateRange,
  metric: ProAnalyticsMetric,
): Promise<AnalyticsResponse> {
  return getJson<AnalyticsResponse>(`/api/pro/analytics?range=${range}&metric=${metric}`)
}
