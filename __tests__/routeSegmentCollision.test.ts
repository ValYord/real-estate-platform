import { readdirSync, statSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

/**
 * Regression guard for a runtime-only Next.js crash that `next build` does NOT
 * catch: two dynamic route segments with different slug names at the same path
 * level (e.g. `app/api/agents/[id]` next to `app/api/agents/[slug]`). At runtime
 * Next.js throws `You cannot use different slug names for the same dynamic path`
 * on EVERY request, taking the whole site down. Build + lint + test all pass, so
 * without this test the failure only surfaces in a running server. See the
 * root-cause writeup in the PR that added this file.
 */

const APP_DIR = resolve(__dirname, '..', 'app')

/** Extract the slug name from a dynamic segment folder, or null if it isn't one.
 *  Handles `[id]`, catch-all `[...id]`, and optional catch-all `[[...id]]`. */
function dynamicSlugName(dir: string): string | null {
  const match = dir.match(/^\[+(?:\.\.\.)?([^\]]+)\]+$/)
  return match ? match[1] : null
}

/** Walk every directory under `app/` and, for each level, collect the distinct
 *  slug names of its immediate dynamic-segment children. */
function findCollisions(dir: string, relPath = 'app'): string[] {
  const collisions: string[] = []
  const entries = readdirSync(dir).filter((name) => {
    try {
      return statSync(resolve(dir, name)).isDirectory()
    } catch {
      return false
    }
  })

  const slugNames = new Set<string>()
  for (const name of entries) {
    const slug = dynamicSlugName(name)
    if (slug) slugNames.add(slug)
  }
  if (slugNames.size > 1) {
    collisions.push(`${relPath}: conflicting dynamic segments [${[...slugNames].join(', ')}]`)
  }

  for (const name of entries) {
    collisions.push(...findCollisions(resolve(dir, name), `${relPath}/${name}`))
  }
  return collisions
}

describe('App Router dynamic segment naming', () => {
  it('never places two differently-named dynamic segments at the same path level', () => {
    const collisions = findCollisions(APP_DIR)
    expect(collisions).toEqual([])
  })
})
