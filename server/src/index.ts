import type { Server } from 'node:http';
import { env } from './config/env';
import { createApp } from './app';
import { connectDb, disconnectDb, redactUri, scheduleDbReconnect } from './db/connect';
import { verifyMailer } from './lib/mailer';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main() {
  try {
    await connectDb(env.MONGODB_URI);
  } catch (err) {
    console.error(`[db] could not connect to ${redactUri(env.MONGODB_URI)}: ${(err as Error).message}`);
    console.log('[db] server will operate with resilient local content fallback and retry DB in background');
    scheduleDbReconnect(env.MONGODB_URI);
  }

  const app = createApp();
  const server: Server = app.listen(env.PORT, (err?: Error) => {
    if (err) return; // reported by the 'error' listener below
    console.log(`[api] HireReady API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    void verifyMailer();
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error(err.code === 'EADDRINUSE' ? `[api] port ${env.PORT} is already in use` : `[api] server error: ${err.message}`);
    process.exit(1);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[api] ${signal} received, shutting down...`);
    const force = setTimeout(() => {
      console.error('[api] graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    force.unref();
    server.close(async (closeErr) => {
      if (closeErr) console.error('[api] error while closing server:', closeErr.message);
      try {
        await disconnectDb();
        console.log('[api] shutdown complete');
        process.exit(closeErr ? 1 : 0);
      } catch (dbErr) {
        console.error('[api] error while disconnecting from MongoDB:', (dbErr as Error).message);
        process.exit(1);
      }
    });
    server.closeIdleConnections();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  console.error('[api] unhandled promise rejection:', reason);
});

void main();
