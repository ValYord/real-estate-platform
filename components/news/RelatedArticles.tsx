import ArticleCard from './ArticleCard'
import type { BlogPostCard } from '@/lib/blog/types'

interface RelatedArticlesProps {
  posts: BlogPostCard[]
}

/**
 * "Read also" — same-category articles, most recent first (fetched
 * server-side by the article page via GET /api/news/[slug]/related; kept
 * SSR rather than a client React Query fetch so it stays crawlable and
 * avoids an extra client-side round trip for a fully server-rendered page).
 */
export default function RelatedArticles({ posts }: RelatedArticlesProps) {
  if (posts.length === 0) return null

  return (
    <section aria-label="Related articles" className="mt-12">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Read also</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <ArticleCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  )
}
