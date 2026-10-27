import type { CookieOptions, Request, RequestHandler } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { isValidObjectId } from 'mongoose';
import { env, isProduction } from '../config/env';
import { unauthenticated } from '../lib/errors';
import { UserModel } from '../models';
import type { AuthUser } from '../types/api';

export const AUTH_COOKIE = 'hr_token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function signToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

function baseCookieOptions(): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/' };
}

export const authCookieOptions = (): CookieOptions => ({ ...baseCookieOptions(), maxAge: COOKIE_MAX_AGE_MS });
export const clearCookieOptions = (): CookieOptions => baseCookieOptions();

/** Resolves the user from the `hr_token` cookie; null when absent, invalid, expired or the user no longer exists. */
async function userFromRequest(req: Request): Promise<AuthUser | null> {
  const token: unknown = req.cookies?.[AUTH_COOKIE];
  if (typeof token !== 'string' || !token) return null;
  let sub: string | undefined;
  let issuedAt: number | undefined;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    sub = typeof payload === 'object' ? payload.sub : undefined;
    issuedAt = typeof payload === 'object' ? payload.iat : undefined;
  } catch {
    return null;
  }
  if (!sub || !isValidObjectId(sub)) return null;
  const user = await UserModel.findById(sub, { name: 1, email: 1, createdAt: 1, passwordChangedAt: 1 }).lean();
  if (!user) return null;
  // a password reset revokes every session issued before it
  if (user.passwordChangedAt && (issuedAt ?? 0) * 1000 < user.passwordChangedAt.getTime()) return null;
  return { id: user._id.toString(), name: user.name, email: user.email, createdAt: user.createdAt };
}

/** 401 UNAUTHENTICATED unless a valid session cookie is present. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const user = await userFromRequest(req);
  if (!user) throw unauthenticated();
  req.user = user;
  next();
};

/** Sets `req.user` when a valid session cookie is present; otherwise continues anonymously. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const user = await userFromRequest(req);
  if (user) req.user = user;
  next();
};

/** For handlers behind requireAuth. */
export function authUser(req: Request): AuthUser {
  if (!req.user) throw unauthenticated();
  return req.user;
}
