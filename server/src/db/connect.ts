import mongoose from 'mongoose';

// Query-selector injection guard: any `$`-keyed object coming from user input is wrapped in `$eq`.
// Code that builds operator filters on purpose must wrap them in `mongoose.trusted(...)`.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

/** `mongodb+srv://user:pass@host/db` → `mongodb+srv://host/db` for logs. */
export function redactUri(uri: string): string {
  return uri.replace(/\/\/[^@/]*@/, '//');
}

let listenersAttached = false;
let reconnectTimer: NodeJS.Timeout | null = null;
let isConnecting = false;

export function stopDbReconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

export function scheduleDbReconnect(uri: string, delayMs = 5000): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (mongoose.connection.readyState === mongoose.ConnectionStates.connected || isConnecting) {
      return;
    }
    isConnecting = true;
    try {
      console.log(`[db] attempting to reconnect to ${redactUri(uri)}...`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10 });
      console.log(`[db] connected to ${redactUri(uri)}`);
    } catch (err) {
      console.error(`[db] retry connection failed: ${(err as Error).message}`);
      const nextDelay = Math.min(Math.round(delayMs * 1.5), 30_000);
      scheduleDbReconnect(uri, nextDelay);
    } finally {
      isConnecting = false;
    }
  }, delayMs);
  reconnectTimer.unref();
}

export async function connectDb(uri: string, opts: { quiet?: boolean } = {}): Promise<typeof mongoose> {
  if (!listenersAttached && !opts.quiet) {
    listenersAttached = true;
    mongoose.connection.on('disconnected', () => {
      console.warn('[db] disconnected');
      scheduleDbReconnect(uri);
    });
    mongoose.connection.on('reconnected', () => console.log('[db] reconnected'));
    mongoose.connection.on('error', (err: Error) => console.error('[db] error:', err.message));
  }
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    return mongoose;
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10 });
  if (!opts.quiet) console.log(`[db] connected to ${redactUri(uri)}`);
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  stopDbReconnect();
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected) {
    await mongoose.disconnect();
  }
}

export function dbState(): 'connected' | 'disconnected' {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected ? 'connected' : 'disconnected';
}
