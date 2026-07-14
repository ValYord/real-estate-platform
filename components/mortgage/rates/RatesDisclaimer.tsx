import { formatRateDate } from '@/lib/mortgage/rates/format'

interface RatesDisclaimerProps {
  updatedAt: string | null
}

/**
 * Always-visible informational disclaimer + "Updated: {date}" badge (§5.6).
 * Pure-props Server Component — no state, no client JS needed.
 */
export default function RatesDisclaimer({ updatedAt }: RatesDisclaimerProps) {
  return (
    <div className="text-xs text-gray-400 leading-relaxed mt-8 space-y-2">
      <p>
        Interest rates shown are informational and provided by partner banks or entered manually;
        they may change and do not constitute an official offer. Actual terms are determined by the
        bank at the time of application.
      </p>
      <span className="inline-block text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
        Updated: {formatRateDate(updatedAt)}
      </span>
    </div>
  )
}
