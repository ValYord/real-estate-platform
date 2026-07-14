import type { BlogAuthor } from '@/lib/blog/types'

interface AuthorBioProps {
  author: BlogAuthor
}

/**
 * Author bio card shown at the end of an article — simple embedded fields,
 * no author-profile pages/system (out of scope for Page 15 MVP; E-E-A-T
 * signal per docs/en/pages/15-blog.md §3.11 / §8).
 */
export default function AuthorBio({ author }: AuthorBioProps) {
  if (!author.bio && !author.credentials) return null

  return (
    <div className="mt-10 flex gap-4 rounded-xl border border-gray-200 p-5">
      <div className="w-14 h-14 shrink-0 rounded-full bg-gray-100 overflow-hidden">
        {author.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- small avatar from arbitrary remote host (seed content).
          <img src={author.avatar} alt={author.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 font-semibold" aria-hidden="true">
            {author.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-gray-900">{author.name}</p>
        {author.credentials && <p className="text-sm text-primary">{author.credentials}</p>}
        {author.bio && <p className="mt-1 text-sm text-gray-600">{author.bio}</p>}
      </div>
    </div>
  )
}
