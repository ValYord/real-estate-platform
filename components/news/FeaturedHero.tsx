import { Link } from '@/i18n/navigation'
import { formatArticleDate } from '@/lib/blog/format'
import { BLOG_CATEGORY_LABELS } from '@/lib/blog/types'
import type { BlogPostCard } from '@/lib/blog/types'

interface FeaturedHeroProps {
  post: BlogPostCard
}

/** Full-width featured article hero at the top of the index (docs/en/pages/15-blog.md §3.2). */
export default function FeaturedHero({ post }: FeaturedHeroProps) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className="group relative block h-[240px] md:h-[420px] rounded-2xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {post.cover ? (
        // eslint-disable-next-line @next/next/no-img-element -- LCP hero image sourced from arbitrary remote hosts (seed content).
        <img
          src={post.cover}
          alt={post.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-100" aria-hidden="true" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 text-white">
        <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
          {BLOG_CATEGORY_LABELS[post.category]}
        </span>
        <h2 className="mt-3 text-xl md:text-2xl font-bold leading-tight">{post.title}</h2>
        <p className="mt-2 hidden md:block max-w-2xl text-white/80 line-clamp-2">{post.excerpt}</p>
        <div className="mt-3 flex items-center gap-2 text-sm text-white/80">
          <span>{post.author.name}</span>
          <span aria-hidden="true">·</span>
          <span>{formatArticleDate(post.publishedAt)}</span>
        </div>
      </div>
    </Link>
  )
}
