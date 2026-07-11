/**
 * Page 09 (Messages / Inbox) renders remote images via `next/image`:
 * attachment thumbnails (MessageBubble, AttachmentLightbox), the peer avatar
 * (ConversationRow, ThreadHeader), and the pinned property photo
 * (PinnedPropertyCard) — all sourced from Supabase Storage public URLs
 * (`https://<project>.supabase.co/storage/v1/object/public/...`).
 *
 * next/image hard-rejects ("hostname is not configured under images in your
 * next.config.js") any remote src whose hostname isn't allowlisted via
 * `images.remotePatterns`. This is a static check (reading next.config.ts's
 * source, since importing the next-intl-wrapped config needs a Next.js
 * runtime context) that the Supabase host is allowlisted, so attachment
 * thumbnails don't silently 400 in a real deployment.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const configSource = readFileSync(join(__dirname, '../next.config.ts'), 'utf-8')

describe('next.config.ts — images.remotePatterns allows Supabase Storage', () => {
  it('allowlists *.supabase.co over https', () => {
    expect(configSource).toMatch(/remotePatterns/)
    expect(configSource).toMatch(/hostname:\s*['"]\*\.supabase\.co['"]/)
    expect(configSource).toMatch(/protocol:\s*['"]https['"]/)
  })
})
