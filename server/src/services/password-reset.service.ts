import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { appUrl } from '../config/env';
import { HttpError } from '../lib/errors';
import { sendMail } from '../lib/mailer';
import { UserModel, type UserDoc } from '../models';
import type { ApiUser } from '../types/api';
import { BCRYPT_COST } from './auth.service';
import { toUser } from './mappers';

const TOKEN_TTL_MINUTES = 30;
const TOKEN_TTL_MS = TOKEN_TTL_MINUTES * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const invalidToken = () => new HttpError(400, 'This reset link is invalid or has expired. Request a new one.', 'INVALID_TOKEN');

/**
 * Emails a single-use reset link when the address belongs to an account. Callers always answer the same way,
 * so the endpoint can't be used to find out which emails are registered.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await UserModel.findOne({ email }).select('+resetTokenExpires').lean<UserDoc>();
  if (!user) return;
  // at most one email per minute per account, so nobody can flood an inbox
  const lastIssued = user.resetTokenExpires ? user.resetTokenExpires.getTime() - TOKEN_TTL_MS : 0;
  if (Date.now() - lastIssued < RESEND_COOLDOWN_MS) return;

  const token = crypto.randomBytes(32).toString('base64url');
  await UserModel.updateOne(
    { _id: user._id },
    { $set: { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + TOKEN_TTL_MS) } },
  );

  const link = `${appUrl}/reset-password?token=${token}`;
  const first = user.name.split(' ')[0];
  // not awaited: sending takes longer than the unknown-email path, and timing must not reveal which emails exist
  void sendMail({
    to: user.email,
    subject: 'Reset your HireReady password',
    text: [
      `Hi ${first},`,
      '',
      'Someone (hopefully you) asked to reset your HireReady password. Open this link to choose a new one:',
      link,
      '',
      `The link works once and expires in ${TOKEN_TTL_MINUTES} minutes. If you didn't ask for this, ignore this email; your password stays the same.`,
    ].join('\n'),
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;color:#1f2330">
  <p>Hi ${escapeHtml(first)},</p>
  <p>Someone (hopefully you) asked to reset your HireReady password.</p>
  <p><a href="${link}" style="display:inline-block;background:#5756e4;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Choose a new password</a></p>
  <p style="color:#5b6070;font-size:13px">The link works once and expires in ${TOKEN_TTL_MINUTES} minutes. If you didn't ask for this, ignore this email; your password stays the same.</p>
</div>`,
  });
}

/** Sets a new password from a valid reset token, then revokes the token and every earlier session. */
export async function resetPassword(token: string, password: string): Promise<ApiUser> {
  const tokenHash = sha256(token);
  const user = await UserModel.findOne({
    resetTokenHash: tokenHash,
    resetTokenExpires: mongoose.trusted({ $gt: new Date() }),
  }).lean<UserDoc>();
  if (!user) throw invalidToken();

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  // filtering on the hash again makes the token single-use even if two requests race
  const { matchedCount } = await UserModel.updateOne(
    { _id: user._id, resetTokenHash: tokenHash },
    {
      // 1 s in the past so the session issued right after this (iat is in whole seconds) stays valid
      $set: { passwordHash, passwordChangedAt: new Date(Date.now() - 1000) },
      $unset: { resetTokenHash: 1, resetTokenExpires: 1 },
    },
  );
  if (matchedCount === 0) throw invalidToken();
  return toUser(user);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
