export * from './content';
export * from './user';

import { QuestionModel, QuizQuestionModel, RoadmapModel, TopicModel } from './content';
import {
  ActivityModel,
  AiUsageModel,
  MockSessionModel,
  QuestionProgressModel,
  QuizAttemptModel,
  RoadmapProgressModel,
  UserModel,
} from './user';

export const contentModels = [TopicModel, QuestionModel, QuizQuestionModel, RoadmapModel] as const;
export const userModels = [
  UserModel,
  QuestionProgressModel,
  RoadmapProgressModel,
  QuizAttemptModel,
  MockSessionModel,
  ActivityModel,
  AiUsageModel,
] as const;

/** Builds every declared index (idempotent). */
export async function ensureIndexes(): Promise<void> {
  await Promise.all([...contentModels, ...userModels].map((m) => (m as { init(): Promise<unknown> }).init()));
}
