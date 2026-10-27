import type { CookieOptions, RequestHandler, Response } from 'express';
import { appUrl, googleEnabled, isProduction, smtpEnabled } from '../config/env';
import { notFound } from '../lib/errors';
import { AUTH_COOKIE, authCookieOptions, authUser, clearCookieOptions, signToken } from '../middleware/auth';
import { input } from '../middleware/validate';
import * as auth from '../services/auth.service';
import * as google from '../services/google.service';
import { authUserToApi } from '../services/mappers';
import * as passwordReset from '../services/password-reset.service';
import type { ApiUser } from '../types/api';
import type { ForgotPasswordBody, GoogleStartQuery, LoginBody, RegisterBody, ResetPasswordBody } from '../validators/schemas';

function startSession(res: Response, user: ApiUser) {
  res.cookie(AUTH_COOKIE, signToken(user.id), authCookieOptions());
}

export const register: RequestHandler = async (req, res) => {
  const user = await auth.register(input<RegisterBody>(req, 'body'));
  startSession(res, user);
  res.status(201).json({ user });
};

export const login: RequestHandler = async (req, res) => {
  const user = await auth.login(input<LoginBody>(req, 'body'));
  startSession(res, user);
  res.json({ user });
};

export const logout: RequestHandler = (_req, res) => {
  res.clearCookie(AUTH_COOKIE, clearCookieOptions());
  res.json({ ok: true });
};

export const me: RequestHandler = (req, res) => {
  res.json({ user: authUserToApi(authUser(req)) });
};

/** Which sign-in methods the web app should show, and whether reset emails can actually be delivered. */
export const providers: RequestHandler = (_req, res) => {
  res.json({ google: googleEnabled, email: smtpEnabled });
};

// ---------------------------------------------------------------- password reset

/** Always 200 with the same body, whether or not the email has an account. */
export const forgotPassword: RequestHandler = async (req, res) => {
  await passwordReset.requestPasswordReset(input<ForgotPasswordBody>(req, 'body').email);
  res.json({ ok: true });
};

/** Sets the new password and logs the user in (all older sessions are revoked). */
export const resetPassword: RequestHandler = async (req, res) => {
  const { token, password } = input<ResetPasswordBody>(req, 'body');
  const user = await passwordReset.resetPassword(token, password);
  startSession(res, user);
  res.json({ user });
};

// ---------------------------------------------------------------- Google OAuth

const oauthCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax', // sent on Google's top-level redirect back to us
  secure: isProduction,
  path: google.OAUTH_COOKIE_PATH,
  maxAge: google.OAUTH_TTL_MS,
});
const clearOAuthCookie = (res: Response) => res.clearCookie(google.OAUTH_COOKIE, { ...oauthCookieOptions(), maxAge: undefined });

/** GET /auth/google?next=/path → redirect to Google's consent screen. */
export const googleStart: RequestHandler = async (req, res) => {
  if (!googleEnabled) throw notFound('Google sign-in is not configured');
  const { next } = input<GoogleStartQuery>(req, 'query');
  const { url, cookie } = await google.startGoogleLogin(google.safeNext(next));
  res.cookie(google.OAUTH_COOKIE, cookie, oauthCookieOptions());
  res.redirect(302, url);
};

/** GET /auth/google/callback?code&state → session cookie + redirect into the app (or back to /login?error=google). */
export const googleCallback: RequestHandler = async (req, res) => {
  const saved = google.readOAuthCookie(req.cookies?.[google.OAUTH_COOKIE]);
  clearOAuthCookie(res);
  const { code, state } = req.query;
  const fail = () => res.redirect(302, `${appUrl}/login?error=google`);
  // missing/expired cookie, a mismatched state (CSRF) or the user pressing "Cancel" on Google's screen
  if (!googleEnabled || !saved || typeof code !== 'string' || typeof state !== 'string' || state !== saved.state) return fail();
  try {
    const user = await google.finishGoogleLogin(code, saved.verifier);
    startSession(res, user);
    res.redirect(302, `${appUrl}${saved.next}`);
  } catch (err) {
    console.warn('[google] sign-in failed:', err instanceof Error ? err.message : err);
    fail();
  }
};
