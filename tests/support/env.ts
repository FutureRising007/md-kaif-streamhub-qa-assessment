import { config } from 'dotenv';
import { z } from 'zod';

config({ quiet: true });

// throws straight away if a url in .env is broken
const envSchema = z.object({
  API_BASE_URL: z.url().default('http://localhost:3000'),
  UI_BASE_URL: z.url().default('https://emicalculator.net'),
});

export const env = envSchema.parse(process.env);
