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

export async function connectDb(uri: string, opts: { quiet?: boolean } = {}): Promise<typeof mongoose> {
  if (!listenersAttached && !opts.quiet) {
    listenersAttached = true;
    mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
    mongoose.connection.on('reconnected', () => console.log('[db] reconnected'));
    mongoose.connection.on('error', (err: Error) => console.error('[db] error:', err.message));
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  if (!opts.quiet) console.log(`[db] connected to ${redactUri(uri)}`);
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export function dbState(): 'connected' | 'disconnected' {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected ? 'connected' : 'disconnected';
}
