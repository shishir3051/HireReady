/** User-owned collections. Never touched by the seed script. */
import { Schema, model, type Types } from 'mongoose';
import { PROGRESS_STATUSES, type DifficultyT, type ProgressStatusT, type QuestionKindT } from '../types/api';

const ObjectId = Schema.Types.ObjectId;

// ---------------------------------------------------------------- users
export interface UserDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  /** absent for accounts created with Google until a password is set via "Forgot password" */
  passwordHash?: string;
  /** Google account id (`sub`) once the user has signed in with Google */
  googleId?: string;
  /** sessions issued before this instant are rejected (set on password reset) */
  passwordChangedAt?: Date;
  /** sha256 of the emailed reset token; the raw token is never stored */
  resetTokenHash?: string;
  resetTokenExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true },
    passwordChangedAt: { type: Date },
    resetTokenHash: { type: String, select: false, index: { sparse: true } },
    resetTokenExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.resetTokenHash;
        delete ret.resetTokenExpires;
        return ret;
      },
    },
  },
);
export const UserModel = model<UserDoc>('User', UserSchema);

// ---------------------------------------------------------------- question progress
export interface QuestionProgressDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  questionSlug: string;
  status: ProgressStatusT;
  bookmarked: boolean;
  notes: string;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionProgressSchema = new Schema<QuestionProgressDoc>(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    questionSlug: { type: String, required: true },
    status: { type: String, enum: PROGRESS_STATUSES, default: 'todo' },
    bookmarked: { type: Boolean, default: false },
    notes: { type: String, default: '', maxlength: 5000 },
    confidence: { type: Number, min: 1, max: 5, default: null },
  },
  { timestamps: true, versionKey: false },
);
QuestionProgressSchema.index({ user: 1, questionSlug: 1 }, { unique: true });
export const QuestionProgressModel = model<QuestionProgressDoc>('QuestionProgress', QuestionProgressSchema);

// ---------------------------------------------------------------- roadmap progress
export interface RoadmapProgressDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  days: number[];
  updatedAt: Date;
}

const RoadmapProgressSchema = new Schema<RoadmapProgressDoc>(
  {
    user: { type: ObjectId, ref: 'User', required: true, unique: true },
    days: { type: [Number], default: [] },
  },
  { timestamps: true, versionKey: false },
);
export const RoadmapProgressModel = model<RoadmapProgressDoc>('RoadmapProgress', RoadmapProgressSchema);

// ---------------------------------------------------------------- quiz attempts
export interface QuizAttemptDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  topic: string;
  score: number;
  total: number;
  pct: number;
  answers: { questionId: string; selected: number; correct: boolean }[];
  createdAt: Date;
}

const QuizAttemptSchema = new Schema<QuizAttemptDoc>(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    topic: { type: String, required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    pct: { type: Number, required: true },
    answers: [new Schema({ questionId: String, selected: Number, correct: Boolean }, { _id: false })],
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
QuizAttemptSchema.index({ user: 1, createdAt: -1 });
export const QuizAttemptModel = model<QuizAttemptDoc>('QuizAttempt', QuizAttemptSchema);

// ---------------------------------------------------------------- mock sessions
export interface MockSessionDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  config: { count: number; kinds: QuestionKindT[]; topics: string[]; difficulty: DifficultyT | 'mixed' };
  items: { slug: string; title: string; kind: QuestionKindT; selfRating: number; timeSpentSec: number; revealed: boolean }[];
  durationSec: number;
  avgRating: number;
  createdAt: Date;
}

const MockSessionSchema = new Schema<MockSessionDoc>(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    config: {
      type: new Schema({ count: Number, kinds: [String], topics: [String], difficulty: String }, { _id: false }),
      required: true,
    },
    items: [
      new Schema(
        { slug: String, title: String, kind: String, selfRating: Number, timeSpentSec: Number, revealed: Boolean },
        { _id: false },
      ),
    ],
    durationSec: { type: Number, required: true },
    avgRating: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
MockSessionSchema.index({ user: 1, createdAt: -1 });
export const MockSessionModel = model<MockSessionDoc>('MockSession', MockSessionSchema);

// ---------------------------------------------------------------- activity (streaks + heatmap)
export interface ActivityDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  /** YYYY-MM-DD (UTC) */
  date: string;
  count: number;
}

const ActivitySchema = new Schema<ActivityDoc>(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    count: { type: Number, default: 0 },
  },
  { versionKey: false },
);
ActivitySchema.index({ user: 1, date: 1 }, { unique: true });
export const ActivityModel = model<ActivityDoc>('Activity', ActivitySchema);

// ---------------------------------------------------------------- AI usage (per-user daily quota)
export interface AiUsageDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  /** YYYY-MM-DD (UTC) */
  day: string;
  chat: number;
  evaluate: number;
  createdAt: Date;
}

const AiUsageSchema = new Schema<AiUsageDoc>(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    day: { type: String, required: true },
    chat: { type: Number, default: 0 },
    evaluate: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
AiUsageSchema.index({ user: 1, day: 1 }, { unique: true });
// only today's counter matters; old days are cleaned up automatically
AiUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 });
export const AiUsageModel = model<AiUsageDoc>('AiUsage', AiUsageSchema);
