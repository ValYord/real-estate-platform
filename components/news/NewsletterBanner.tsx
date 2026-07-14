import NewsletterForm from './NewsletterForm'

interface NewsletterBannerProps {
  source: 'news_index' | 'article' | 'footer'
}

/** Inline newsletter capture banner shown on the index and article pages. */
export default function NewsletterBanner({ source }: NewsletterBannerProps) {
  return (
    <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6 my-10">
      <h2 className="text-lg font-semibold text-gray-900">Get market news in your inbox</h2>
      <p className="mt-1 text-sm text-gray-600">
        Monthly trends, buyer/seller tips and product updates. No spam, unsubscribe any time.
      </p>
      <div className="mt-4">
        <NewsletterForm source={source} />
      </div>
    </div>
  )
}
