import crypto from 'node:crypto';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { appUrl, env } from '../config/env';
import { UserModel, type UserDoc } from '../models';
import type { ApiUser } from '../types/api';
import { toUser } from './mappers';

/** Short-lived cookie that ties the Google callback to the browser that started the sign-in. */
export const OAUTH_COOKIE = 'hr_oauth';
export const OAUTH_COOKIE_PATH = '/api/auth/google';
export const OAUTH_TTL_MS = 10 * 60 * 1000;
const OAUTH_AUDIENCE = 'hireready-google-oauth';

interface OAuthState {
  state: string;
  verifier: string;
  next: string;
}

let client: OAuth2Client | undefined;
function getClient(): OAuth2Client {
  // the callback goes through the web app's /api proxy, so the session cookie lands on the web origin
  client ??= new OAuth2Client({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${appUrl}/api/auth/google/callback`,
  });
  return client;
}

/** Google consent URL (authorization code + PKCE) and the signed state for the OAuth cookie. */
export async function startGoogleLogin(next: string): Promise<{ url: string; cookie: string }> {
  const c = getClient();
  const { codeVerifier, codeChallenge } = await c.generateCodeVerifierAsync();
  const state = crypto.randomBytes(16).toString('base64url');
  const url = c.generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    prompt: 'select_account',
  });
  const payload: OAuthState = { state, verifier: codeVerifier, next };
  const cookie = jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    audience: OAUTH_AUDIENCE,
    expiresIn: Math.floor(OAUTH_TTL_MS / 1000),
  });
  return { url, cookie };
}

/** The verified OAuth cookie, or null when missing, tampered with or expired. */
export function readOAuthCookie(value: unknown): OAuthState | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    const p = jwt.verify(value, env.JWT_SECRET, { algorithms: ['HS256'], audience: OAUTH_AUDIENCE });
    if (typeof p !== 'object' || typeof p.state !== 'string' || typeof p.verifier !== 'string' || typeof p.next !== 'string') return null;
    return { state: p.state, verifier: p.verifier, next: p.next };
  } catch {
    return null;
  }
}

/** Exchanges the code, verifies Google's ID token and returns the matching (linked or new) user. */
export async function finishGoogleLogin(code: string, verifier: string): Promise<ApiUser> {
  const c = getClient();
  const { tokens } = await c.getToken({ code, codeVerifier: verifier });
  if (!tokens.id_token) throw new Error('Google returned no ID token');
  const ticket = await c.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID! });
  const p = ticket.getPayload();
  if (!p?.sub || !p.email || p.email_verified !== true) throw new Error('Google account has no verified email');
  const email = p.email.toLowerCase();

  const existing = await UserModel.findOne({ googleId: p.sub }).lean<UserDoc>();
  if (existing) return toUser(existing);

  // Same email, first Google sign-in: link it. HireReady never verified that email at sign-up, so the old password
  // (which someone else could have set) is removed and its sessions revoked; "Forgot password" can set a new one.
  const linked = await UserModel.findOneAndUpdate(
    { email },
    { $set: { googleId: p.sub, passwordChangedAt: new Date(Date.now() - 1000) }, $unset: { passwordHash: 1 } },
    { returnDocument: 'after' },
  ).lean<UserDoc>();
  if (linked) return toUser(linked);

  const created = await UserModel.create({ name: displayName(p.name, email), email, googleId: p.sub });
  return toUser(created);
}

function displayName(name: string | undefined, email: string): string {
  const n = (name ?? '').trim().slice(0, 60);
  if (n.length >= 2) return n;
  return (email.split('@')[0] ?? 'Learner').slice(0, 60).padEnd(2, '_');
}

/** Only same-site paths are allowed after sign-in ("/x" but not "//evil.com" or "/\evil.com"). */
export function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/dashboard';
  return next.slice(0, 500);
}
