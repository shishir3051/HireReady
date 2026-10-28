import { z } from 'zod';
import { loadDotenv } from './dotenv';

loadDotenv();

const mongoUri = z
  .string()
  .trim()
  .min(1, 'is required')
  .refine((v) => v.startsWith('mongodb://') || v.startsWith('mongodb+srv://'), 'must start with mongodb:// or mongodb+srv://');

/** `TRUST_PROXY`: unset/false = do not trust X-Forwarded-For; true; a hop count ("1"); or names/CIDRs ("loopback"). */
const trustProxy = z
  .string()
  .trim()
  .optional()
  .transform((v): boolean | number | string => {
    if (!v || v === 'false' || v === '0') return false;
    if (v === 'true') return true;
    if (/^\d+$/.test(v)) return Number(v);
    return v;
  });

/** Optional setting: unset or empty string → undefined. */
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: mongoUri,
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters (generate a long random string)'),
  JWT_EXPIRES_IN: z
    .string()
    .trim()
    .regex(/^\d+(?:ms|s|m|h|d|w|y)?$/, 'must look like 7d, 12h, 3600 or 30m')
    .default('7d'),
  /** Allowed browser origin(s) for CORS; comma-separated for several. */
  CLIENT_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim().replace(/\/+$/, ''))
        .filter(Boolean),
    ),
  TRUST_PROXY: trustProxy,
  /** Public URL of the web app, used in emailed links and OAuth redirects. Defaults to the first CLIENT_ORIGIN. */
  APP_URL: optionalString.pipe(z.url({ error: 'must be a URL like http://localhost:3200' }).optional()),
  /** SMTP for password-reset emails. Unset → links are printed to the API console (development only). */
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  MAIL_FROM: optionalString,
  /** Google OAuth client (Google Cloud Console → Credentials). Both set → "Continue with Google" is enabled. */
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  /** Google Gemini AI API key for mock interview evaluation and AI tutoring. */
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: z.string().trim().default('gemini-3.5-flash-lite'),
  /** Used with the same key when GEMINI_MODEL is out of quota or overloaded (each model has its own limits); empty = off. */
  GEMINI_BACKUP_MODEL: z.string().trim().default('gemini-3.1-flash-lite'),
  /** Per-user daily AI limits (UTC day); protect the Gemini quota/bill. */
  AI_DAILY_CHAT_LIMIT: z.coerce.number().int().min(0).default(40),
  AI_DAILY_EVAL_LIMIT: z.coerce.number().int().min(0).default(15),
});

export type Env = z.infer<typeof EnvSchema>;

function parseEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(env)'}: ${i.message}`);
  console.error(
    `\nInvalid environment configuration (check server/.env or your shell variables):\n${lines.join('\n')}\n` +
      'See server/.env.example for the expected variables.\n',
  );
  process.exit(1);
}

export const env: Env = parseEnv();
export const isProduction = env.NODE_ENV === 'production';
/** Web app origin without a trailing slash, e.g. http://localhost:3200. */
export const appUrl = (env.APP_URL ?? env.CLIENT_ORIGIN[0] ?? 'http://localhost:3000').replace(/\/+$/, '');
export const smtpEnabled = Boolean(env.SMTP_HOST);
export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const geminiEnabled = Boolean(env.GEMINI_API_KEY);
