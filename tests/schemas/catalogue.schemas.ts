import { z } from 'zod';

// written separately from the api code on purpose - if the tests imported the
// api schemas they would just agree with whatever bugs are in them

const pageMeta = z.strictObject({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const videoSchema = z.strictObject({
  id: z.number().int().positive(),
  title: z.string().min(1),
  channelId: z.number().int().positive(),
  genre: z.string().min(1),
  durationSec: z.number().int().positive(),
  views: z.number().int().min(0),
  rating: z.number().min(0).max(5),
  publishedAt: z.iso.date(),
});

export const channelSchema = z.strictObject({
  id: z.number().int().positive(),
  name: z.string().min(1),
  country: z.string().length(2),
  subscribers: z.number().int().min(0),
  verified: z.boolean(),
});

export const errorSchema = z.strictObject({
  error: z.strictObject({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.array(z.strictObject({ field: z.string(), message: z.string() })),
  }),
});

export const responseSchemas = {
  'video list': z.strictObject({ data: z.array(videoSchema), meta: pageMeta }),
  video: z.strictObject({ data: videoSchema }),
  'channel list': z.strictObject({ data: z.array(channelSchema), meta: pageMeta }),
  channel: z.strictObject({ data: channelSchema }),
  error: errorSchema,
} as const;

export type ResponseSchemaName = keyof typeof responseSchemas;
export type Video = z.infer<typeof videoSchema>;
export type ErrorBody = z.infer<typeof errorSchema>;
