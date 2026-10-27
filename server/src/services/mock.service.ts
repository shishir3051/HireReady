import { badRequest } from '../lib/errors';
import { round1, uniq } from '../lib/util';
import { MockSessionModel, type MockSessionDoc } from '../models';
import type { ApiMockSession } from '../types/api';
import type { MockSessionBody } from '../validators/schemas';
import { recordActivity } from './activity.service';
import { toMockSession } from './mappers';
import { findQuestionRefs } from './question.service';

/** POST /api/mock-sessions — title/kind are filled from the questions; avgRating = mean selfRating (1 decimal). */
export async function createSession(userId: string, body: MockSessionBody): Promise<ApiMockSession> {
  const refs = await findQuestionRefs(uniq(body.items.map((i) => i.slug)));
  const unknown = uniq(body.items.map((i) => i.slug).filter((s) => !refs.has(s)));
  if (unknown.length) {
    throw badRequest(`Unknown question slug(s): ${unknown.join(', ')}`, [
      { path: 'body.items', message: `unknown question slug(s): ${unknown.join(', ')}`, code: 'invalid_value' },
    ]);
  }

  const items = body.items.map((i) => {
    const q = refs.get(i.slug)!;
    return { slug: i.slug, title: q.title, kind: q.kind, selfRating: i.selfRating, timeSpentSec: i.timeSpentSec, revealed: i.revealed };
  });
  const avgRating = round1(items.reduce((sum, i) => sum + i.selfRating, 0) / items.length);

  const doc = await MockSessionModel.create({
    user: userId,
    config: body.config,
    items,
    durationSec: body.durationSec,
    avgRating,
  });
  await recordActivity(userId);
  return toMockSession(doc.toObject() as MockSessionDoc);
}

/** GET /api/mock-sessions — latest 20, newest first. */
export async function listSessions(userId: string): Promise<ApiMockSession[]> {
  const docs = await MockSessionModel.find({ user: userId }).sort({ createdAt: -1, _id: -1 }).limit(20).lean<MockSessionDoc[]>();
  return docs.map(toMockSession);
}
