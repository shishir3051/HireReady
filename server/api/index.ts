/**
 * Vercel serverless entry point. Vercel routes every request here (see vercel.json) and
 * calls the exported Express app as a request handler. The MongoDB connection is opened
 * lazily and reused across warm invocations; if it fails, the API keeps serving the bundled
 * local content (same fallback as `src/index.ts`).
 */
import type { NextFunction, Request, Response } from 'express';
import { env } from '../src/config/env';
import { createApp } from '../src/app';
import { connectDb, dbState, redactUri } from '../src/db/connect';

let connecting: Promise<unknown> | null = null;

async function ensureDb(): Promise<void> {
  if (dbState() === 'connected') return;
  if (!connecting) {
    connecting = connectDb(env.MONGODB_URI, { quiet: true }).catch((err: Error) => {
      console.error(`[db] could not connect to ${redactUri(env.MONGODB_URI)}: ${err.message}`);
    });
  }
  await connecting;
  connecting = null;
}

const app = createApp();

const handler = async (req: Request, res: Response, next?: NextFunction) => {
  await ensureDb();
  return (app as unknown as (req: Request, res: Response, next?: NextFunction) => void)(req, res, next);
};

export default handler;

