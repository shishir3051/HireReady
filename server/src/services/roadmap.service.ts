import { notFound } from '../lib/errors';
import { ROADMAP_KEY, RoadmapModel, type RoadmapDoc } from '../models';
import type { ApiRoadmap } from '../types/api';
import { toRoadmap } from './mappers';
import { dbState } from '../db/connect';
import { getLocalRoadmap, getLocalRoadmapDayCount } from '../content/localContent';

export async function findRoadmap(): Promise<RoadmapDoc | null> {
  if (dbState() !== 'connected') {
    try {
      return getLocalRoadmap() as unknown as RoadmapDoc;
    } catch {
      return null;
    }
  }
  try {
    return await RoadmapModel.findOne({ key: ROADMAP_KEY }).lean<RoadmapDoc>();
  } catch (err) {
    console.warn(`[db] findRoadmap fallback to local files: ${(err as Error).message}`);
    try {
      return getLocalRoadmap() as unknown as RoadmapDoc;
    } catch {
      return null;
    }
  }
}

/** GET /api/roadmap — 404 until the roadmap has been seeded. */
export async function getRoadmap(): Promise<ApiRoadmap> {
  if (dbState() !== 'connected') {
    return getLocalRoadmap();
  }
  try {
    const roadmap = await RoadmapModel.findOne({ key: ROADMAP_KEY }).lean<RoadmapDoc>();
    if (!roadmap) return getLocalRoadmap();
    return toRoadmap(roadmap);
  } catch (err) {
    console.warn(`[db] getRoadmap fallback to local files: ${(err as Error).message}`);
    return getLocalRoadmap();
  }
}

/** Number of days in the seeded roadmap (0 when not seeded). */
export async function roadmapDayCount(): Promise<number> {
  if (dbState() !== 'connected') {
    return getLocalRoadmapDayCount();
  }
  try {
    const [row] = await RoadmapModel.aggregate<{ n: number }>([
      { $match: { key: ROADMAP_KEY } },
      { $project: { _id: 0, n: { $size: { $ifNull: ['$days', []] } } } },
    ]);
    return row?.n ?? getLocalRoadmapDayCount();
  } catch (err) {
    console.warn(`[db] roadmapDayCount fallback to local files: ${(err as Error).message}`);
    return getLocalRoadmapDayCount();
  }
}
