import { z } from 'zod';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slug = z.string().max(120, 'is too long').regex(SLUG_RE, 'must be a kebab-case slug');
export const slugParams = z.object({ slug });

/**
 * Comma-separated query list: `?difficulty=easy,hard` or repeated keys (`?difficulty=easy&difficulty=hard`).
 * Empty values are ignored; result is de-duplicated.
 */
export function csv<T extends z.ZodType<string>>(item: T, max = 50) {
  return z.preprocess(
    (v) => {
      if (v === undefined || v === null) return undefined;
      const parts = (Array.isArray(v) ? v : [v]).flatMap((s) => String(s).split(','));
      const cleaned = [...new Set(parts.map((s) => s.trim()).filter(Boolean))];
      return cleaned.length ? cleaned : undefined;
    },
    z.array(item).max(max, `at most ${max} values`).optional(),
  );
}

/** Single query value (first one wins if a key is repeated). */
export function single<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (Array.isArray(v) ? v[0] : v), schema);
}

const boundedInt = (min: number, max: number) =>
  single(
    z.coerce
      .number({ error: 'must be a number' })
      .int('must be an integer')
      .min(min, `must be ≥ ${min}`)
      .max(max, `must be ≤ ${max}`),
  );

/** Integer query value with bounds and a default. */
export const intQuery = (min: number, max: number, def: number) => boundedInt(min, max).default(def);

/** Optional integer query value with bounds. */
export const optionalIntQuery = (min: number, max: number) => boundedInt(min, max).optional();

export const boolQuery = single(z.enum(['true', 'false', '1', '0']))
  .optional()
  .transform((v) => v === 'true' || v === '1');
