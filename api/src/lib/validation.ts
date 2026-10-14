import { z } from 'zod';
import { ApiError, type ErrorDetail } from './errors';

export const GENRES = ['music', 'gaming', 'education', 'sports', 'tech', 'comedy'] as const;
export const MAX_LIMIT = 50;

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(MAX_LIMIT).default(10);
const order = z.enum(['asc', 'desc']);

// strictObject so unknown query params give a 400 instead of being ignored
export const listVideosQuery = z.strictObject({
  genre: z.enum(GENRES).optional(),
  channelId: z.coerce.number().int().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  q: z.string().trim().min(2).max(100).optional(),
  sortBy: z.enum(['title', 'views', 'rating', 'publishedAt']).default('publishedAt'),
  order: order.default('desc'),
  page,
  limit,
});

export const listChannelsQuery = z.strictObject({
  country: z.string().regex(/^[A-Z]{2}$/, 'country must be a 2-letter uppercase ISO code').optional(),
  verified: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  sortBy: z.enum(['name', 'subscribers']).default('name'),
  order: order.default('asc'),
  page,
  limit,
});

export const idParams = z.object({ id: z.coerce.number().int().positive() });

// zod errors -> 400 with a list of which params were wrong
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const details: ErrorDetail[] = result.error.issues.flatMap((issue) =>
    issue.code === 'unrecognized_keys'
      ? issue.keys.map((key) => ({ field: key, message: `Unsupported parameter '${key}'` }))
      : [{ field: issue.path.join('.'), message: issue.message }],
  );
  throw new ApiError(400, 'VALIDATION_ERROR', 'One or more request parameters are invalid', details);
}
