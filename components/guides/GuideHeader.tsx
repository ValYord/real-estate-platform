import Image from 'next/image'

interface GuideHeaderProps {
  title: string
  intro?: string
  updatedAt: string
  readingTime: number
  authorName: string | null
  authorCredentials: string | null
  coverUrl: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** H1 + meta line (updated date · reading time · author) + intro + cover. */
export function GuideHeader({
  title,
  intro,
  updatedAt,
  readingTime,
  authorName,
  authorCredentials,
  coverUrl,
}: GuideHeaderProps) {
  return (
    <header>
      <h1 className="text-2xl sm:text-4xl font-bold leading-tight text-gray-900">{title}</h1>

      <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
        <span>Updated {formatDate(updatedAt)}</span>
        <span aria-hidden="true">·</span>
        <span>{readingTime} min read</span>
        {authorName && (
          <>
            <span aria-hidden="true">·</span>
            <span>
              by {authorName}
              {authorCredentials ? ` (${authorCredentials})` : ''}
            </span>
          </>
        )}
      </div>

      {intro && <p className="text-base text-gray-700 leading-relaxed mt-4">{intro}</p>}

      {coverUrl && (
        <div className="relative w-full h-[220px] sm:h-[420px] rounded-xl overflow-hidden mt-6">
          <Image src={coverUrl} alt={title} fill priority className="object-cover" />
        </div>
      )}
    </header>
  )
}
