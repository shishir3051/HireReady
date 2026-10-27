import { Types } from 'mongoose';
import { addDays, utcDay } from '../lib/dates';
import { ActivityModel } from '../models';

/**
 * +1 on the user's activity counter for today's UTC day (one document per user per day).
 * Never fails the calling request: activity is secondary to the action that produced it.
 */
export async function recordActivity(userId: string, now = new Date()): Promise<void> {
  const date = utcDay(now);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await ActivityModel.updateOne({ user: userId, date }, { $inc: { count: 1 } }, { upsert: true });
      return;
    } catch (err) {
      // two concurrent upserts can race on the unique {user, date} index; the retry hits the update path
      if ((err as { code?: number }).code === 11000 && attempt === 0) continue;
      console.error('[activity] failed to record activity:', (err as Error).message);
      return;
    }
  }
}

/** All active days for the user (for streaks), oldest first. */
export async function getActivityDays(userId: string): Promise<{ date: string; count: number }[]> {
  return ActivityModel.aggregate<{ date: string; count: number }>([
    { $match: { user: new Types.ObjectId(userId) } },
    { $sort: { date: 1 } },
    { $project: { _id: 0, date: 1, count: 1 } },
  ]);
}

/** Days with activity in the last `days` days including today (UTC), newest first. */
export function recentActivity(all: { date: string; count: number }[], days = 120, today = utcDay()) {
  const from = addDays(today, -(days - 1));
  return all
    .filter((a) => a.date >= from && a.date <= today && a.count > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((a) => ({ date: a.date, count: a.count }));
}
