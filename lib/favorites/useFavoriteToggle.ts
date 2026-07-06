'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from '@/i18n/navigation'

interface UseFavoriteToggleOptions {
  /** Called after a successful add. */
  onAdded?: (propertyId: string) => void
  /** Called after a successful remove. */
  onRemoved?: (propertyId: string) => void
  /** Called on API error. */
  onError?: (error: Error) => void
}

interface UseFavoriteToggleResult {
  isFavorited: boolean
  isLoading: boolean
  handleToggle: (e?: React.MouseEvent) => void
}

/**
 * Reusable ♡ toggle hook for use on search, home, and property-detail pages.
 *
 * Behaviour:
 * - Authenticated user: calls POST/DELETE /api/favorites and invalidates the
 *   shared `['favorites-count']` and `['dashboard-overview']` cache keys.
 * - Unauthenticated guest: redirects to /auth/login?next=<currentPath>&fav=<id>
 *   so that after login the LoginForm reads `fav` and auto-saves the property.
 *
 * NOTE: On the Favorites page itself, use the inline remove logic in
 * FavoritesGrid which handles the more complex optimistic-remove + undo flow.
 */
export function useFavoriteToggle(
  propertyId: string,
  initialFavorited: boolean,
  options?: UseFavoriteToggleOptions,
): UseFavoriteToggleResult {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()

  const [isFavorited, setIsFavorited] = useState(initialFavorited)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault()
      e?.stopPropagation()

      if (isLoading) return

      // Check auth by inspecting whether a Supabase session cookie exists.
      // The Supabase session cookie is named `sb-<ref>-auth-token` but since
      // we can't know the project ref at build time, we check for ANY cookie
      // starting with `sb-` and ending with `-auth-token`.
      const hasCookie = document.cookie
        .split(';')
        .some((c) => c.trim().match(/^sb-.+-auth-token=/))

      if (!hasCookie) {
        // Guest: redirect to login, preserve current path and property intent.
        // Uses `next=` (matching LoginForm's searchParams.get('next')) and
        // `fav=` so LoginForm auto-saves the property after sign-in.
        const loginUrl =
          `/auth/login?next=${encodeURIComponent(pathname)}&fav=${propertyId}` as Parameters<
            typeof router.push
          >[0]
        router.push(loginUrl)
        return
      }

      const nextState = !isFavorited
      // Optimistic update
      setIsFavorited(nextState)
      setIsLoading(true)

      const perform = async () => {
        try {
          let res: Response
          if (nextState) {
            res = await fetch('/api/favorites', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ propertyId }),
            })
          } else {
            res = await fetch(`/api/favorites/${propertyId}`, { method: 'DELETE' })
          }

          if (!res.ok) {
            throw new Error(`Favorites API error: ${res.status}`)
          }

          // Invalidate counters shared across the dashboard and sidebar
          await queryClient.invalidateQueries({ queryKey: ['favorites-count'] })
          await queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })
          await queryClient.invalidateQueries({ queryKey: ['favorites'] })

          if (nextState) {
            options?.onAdded?.(propertyId)
          } else {
            options?.onRemoved?.(propertyId)
          }
        } catch (err) {
          // Rollback optimistic update
          setIsFavorited(!nextState)
          options?.onError?.(err instanceof Error ? err : new Error(String(err)))
        } finally {
          setIsLoading(false)
        }
      }

      void perform()
    },
    [isFavorited, isLoading, propertyId, pathname, router, queryClient, options],
  )

  return { isFavorited, isLoading, handleToggle }
}
