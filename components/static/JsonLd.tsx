/**
 * Renders a `<script type="application/ld+json">` tag for structured data.
 * Server component — safe to drop anywhere in the tree (no hydration cost).
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
