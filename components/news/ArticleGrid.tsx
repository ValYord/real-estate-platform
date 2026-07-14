import ArticleCard from './ArticleCard'
import type { BlogPostCard } from '@/lib/blog/types'

interface ArticleGridProps {
  posts: BlogPostCard[]
  emptyQuery?: string
}

export default function ArticleGrid({ posts, emptyQuery }: ArticleGridProps) {
  if (posts.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-600">
          {emptyQuery ? `Nothing found for "${emptyQuery}"` : 'No articles yet.'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <ArticleCard key={post.id} post={post} />
      ))}
    </div>
  )
}
