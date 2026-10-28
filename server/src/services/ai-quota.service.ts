import mongoose from 'mongoose';
import { env } from '../config/env';
import { utcDay } from '../lib/dates';
import { tooManyRequests } from '../lib/errors';
import { AiUsageModel } from '../models';

export type AiFeature = 'chat' | 'evaluate';

export interface AiUsage {
  used: number;
  limit: number;
}

const limitFor = (feature: AiFeature) => (feature === 'chat' ? env.AI_DAILY_CHAT_LIMIT : env.AI_DAILY_EVAL_LIMIT);

function usedUpMessage(feature: AiFeature, limit: number, lang: 'en' | 'bn'): string {
  if (lang === 'bn') {
    return feature === 'chat'
      ? `আজকের জন্য হীরার সাথে আপনার ${limit}টি মেসেজ শেষ। লিমিট রিসেট হয় UTC মধ্যরাতে (বাংলাদেশ সময় সকাল ৬টায়)।`
      : `আজকের জন্য হীরার ${limit}টি মূল্যায়ন শেষ। লিমিট রিসেট হয় UTC মধ্যরাতে (বাংলাদেশ সময় সকাল ৬টায়)।`;
  }
  return feature === 'chat'
    ? `You've used all ${limit} messages with Hira for today. The limit resets at midnight UTC (6 AM in Bangladesh).`
    : `You've used all ${limit} reviews from Hira for today. The limit resets at midnight UTC (6 AM in Bangladesh).`;
}

/**
 * Counts one AI request against the user's daily limit, atomically: the update only matches while the counter is
 * below the limit, and when it is not, the upsert collides with the unique (user, day) index — so concurrent
 * requests can never push a user past the limit.
 */
export async function consumeAiQuota(userId: string, feature: AiFeature, lang: 'en' | 'bn' = 'en'): Promise<AiUsage> {
  const limit = limitFor(feature);
  if (limit <= 0) {
    throw tooManyRequests(lang === 'bn' ? 'এই সার্ভারে এই AI ফিচারটি বন্ধ আছে।' : 'This AI feature is turned off on this server.');
  }
  const day = utcDay();
  const user = new mongoose.Types.ObjectId(userId);
  try {
    const doc = await AiUsageModel.findOneAndUpdate(
      { user, day, [feature]: mongoose.trusted({ $lt: limit }) },
      { $inc: { [feature]: 1 } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();
    return { used: doc?.[feature] ?? 1, limit };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw tooManyRequests(usedUpMessage(feature, limit, lang));
    throw err;
  }
}

/** Gives one request back when the AI call failed before producing anything (the user got no answer). */
export async function refundAiQuota(userId: string, feature: AiFeature): Promise<void> {
  await AiUsageModel.updateOne(
    { user: new mongoose.Types.ObjectId(userId), day: utcDay(), [feature]: mongoose.trusted({ $gt: 0 }) },
    { $inc: { [feature]: -1 } },
  ).catch(() => {});
}

/** Today's usage for the status endpoint (no counting). */
export async function getAiUsage(userId: string): Promise<Record<AiFeature, AiUsage>> {
  const doc = await AiUsageModel.findOne({ user: new mongoose.Types.ObjectId(userId), day: utcDay() }).lean();
  return {
    chat: { used: doc?.chat ?? 0, limit: env.AI_DAILY_CHAT_LIMIT },
    evaluate: { used: doc?.evaluate ?? 0, limit: env.AI_DAILY_EVAL_LIMIT },
  };
}
