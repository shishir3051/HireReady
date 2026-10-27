import nodemailer, { type Transporter } from 'nodemailer';
import { env, isProduction, smtpEnabled } from '../config/env';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let transporter: Transporter | undefined;

const isGmail = () => /(^|\.)gmail\.com$|(^|\.)googlemail\.com$/i.test(env.SMTP_HOST ?? '');

function getTransporter(): Transporter {
  // Google shows app passwords as "abcd efgh ijkl mnop"; the spaces are not part of the password.
  const pass = isGmail() ? env.SMTP_PASS?.replace(/\s+/g, '') : env.SMTP_PASS;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // 465 = implicit TLS; 587/25 upgrade with STARTTLS
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass } : undefined,
  });
  return transporter;
}

/** Logs in to the SMTP server at startup (sends nothing) so a wrong password shows up immediately, not on the first reset. */
export async function verifyMailer(): Promise<void> {
  if (!smtpEnabled) {
    console.log('[mail] SMTP not configured; password-reset links will be printed here instead of emailed');
    return;
  }
  if (isGmail()) {
    const letters = (env.SMTP_PASS ?? '').replace(/\s+/g, '').length;
    if (letters !== 16) {
      console.warn(
        `[mail] SMTP_PASS has ${letters} characters, but a Gmail App Password has exactly 16 (shown as 4 groups of 4). ` +
          'Create a new one at https://myaccount.google.com/apppasswords on the SMTP_USER account and paste all of it.',
      );
      return;
    }
  }
  try {
    await getTransporter().verify();
    console.log(`[mail] SMTP ready (${env.SMTP_HOST} as ${env.SMTP_USER})`);
  } catch (err) {
    const e = err as { responseCode?: number; message?: string };
    const hint =
      e.responseCode === 535 && isGmail()
        ? ' (Gmail rejected the login: SMTP_PASS must be a 16-letter App Password created on the SMTP_USER account, with 2-Step Verification on)'
        : '';
    console.warn(`[mail] SMTP login failed: ${String(e.message ?? err).split('\n')[0]}${hint}`);
  }
}

/**
 * Sends an email through SMTP. Without SMTP settings the message is printed to the console in development
 * (so the reset flow can be tried locally) and dropped with a warning in production.
 * Never throws: callers answer the user the same way whether or not delivery worked.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (!smtpEnabled) {
    if (isProduction) console.warn(`[mail] SMTP is not configured; could not send "${mail.subject}"`);
    else console.log(`\n[mail] SMTP not configured, printing instead.\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
    return;
  }
  try {
    await getTransporter().sendMail({
      from: env.MAIL_FROM ?? (env.SMTP_USER ? `HireReady <${env.SMTP_USER}>` : 'HireReady <no-reply@localhost>'),
      ...mail,
    });
  } catch (err) {
    console.error(`[mail] sending "${mail.subject}" failed:`, err instanceof Error ? err.message : err);
  }
}
