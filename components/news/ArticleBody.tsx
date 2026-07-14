interface ArticleBodyProps {
  html: string
}

/**
 * Renders the article body HTML.
 *
 * The HTML is authored server-side only (seed data / migration in this MVP;
 * the Page 24 CMS editor later sanitizes on save) — there is no path for a
 * site visitor's input to reach this column, so `dangerouslySetInnerHTML`
 * here does not introduce a stored-XSS risk in the current scope. If/when
 * Page 24 adds free-form author input, sanitize at write time (e.g. with a
 * server-side HTML sanitizer) before it ever reaches this component.
 *
 * No `@tailwindcss/typography` plugin is installed in this project, so
 * heading/paragraph/link spacing is applied via Tailwind's arbitrary
 * descendant-selector variants instead of the `prose` utility classes.
 */
export default function ArticleBody({ html }: ArticleBodyProps) {
  return (
    <div
      className="max-w-none text-gray-800 leading-relaxed
        [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-3
        [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-2
        [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
        [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
        [&_img]:rounded-xl [&_img]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
