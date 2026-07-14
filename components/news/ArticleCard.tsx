import { Link } from '@/i18n/navigation'
import { formatArticleDate } from '@/lib/blog/format'
import { BLOG_CATEGORY_LABELS } from '@/lib/blog/types'
import type { BlogPostCard } from '@/lib/blog/types'

interface ArticleCardProps {
  post: BlogPostCard
}

/** A single article card in the index/category grid and related-articles lists. */
export default function ArticleCard({ post }: ArticleCardProps) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className="group block shadow-sm border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-[16/9] bg-gray-100">
        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- decorative card thumbnails from arbitrary remote hosts (seed content); avoids extending next/image remotePatterns for demo data.
          <img src={post.cover} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-100" aria-hidden="true" />
        )}
        <span className="absolute top-3 left-3 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm bg-white/70">
          {BLOG_CATEGORY_LABELS[post.category]}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{post.excerpt}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <span>{post.author.name}</span>
          <span aria-hidden="true">·</span>
          <span>{formatArticleDate(post.publishedAt)}</span>
          <span aria-hidden="true">·</span>
          <span>{post.readingTime} min read</span>
        </div>
      </div>
    </Link>
  )
}
