import { notFound } from '../lib/errors';
import { ROADMAP_KEY, RoadmapModel, type RoadmapDoc } from '../models';
import type { ApiRoadmap } from '../types/api';
import { toRoadmap } from './mappers';

export async function findRoadmap(): Promise<RoadmapDoc | null> {
  return RoadmapModel.findOne({ key: ROADMAP_KEY }).lean<RoadmapDoc>();
}

/** GET /api/roadmap — 404 until the roadmap has been seeded. */
export async function getRoadmap(): Promise<ApiRoadmap> {
  const roadmap = await findRoadmap();
  if (!roadmap) throw notFound('Roadmap not found (it has not been seeded yet)');
  return toRoadmap(roadmap);
}

/** Number of days in the seeded roadmap (0 when not seeded). */
export async function roadmapDayCount(): Promise<number> {
  const [row] = await RoadmapModel.aggregate<{ n: number }>([
    { $match: { key: ROADMAP_KEY } },
    { $project: { _id: 0, n: { $size: { $ifNull: ['$days', []] } } } },
  ]);
  return row?.n ?? 0;
}
