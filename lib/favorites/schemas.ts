import { z } from 'zod'

/** Valid sort options for the favorites list */
export const favoriteSortSchema = z
  .enum(['recent', 'price_asc', 'price_desc', 'price_drop'])
  .default('recent')

/** Query params for GET /api/favorites */
export const favoritesQuerySchema = z.object({
  sort: favoriteSortSchema,
  page: z.coerce.number().int().min(1).default(1),
})

export type FavoritesQueryInput = z.infer<typeof favoritesQuerySchema>

/** Body for POST /api/favorites */
export const addFavoriteSchema = z.object({
  propertyId: z.string().uuid('propertyId must be a UUID'),
})

export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>
