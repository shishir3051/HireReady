/**
 * Content collections (seeded from server/src/data/content). Shapes are validated by the zod content
 * schema before seeding, so deeply nested, heterogeneous parts (visuals) are stored as Mixed.
 * `minimize: false` keeps empty objects (e.g. `vars: {}`) exactly as authored.
 */
import { Schema, model, type Types } from 'mongoose';
import type { ApiRoadmap, CategoryT, DifficultyT, FrequencyT, QuestionKindT } from '../types/api';
import type { QuestionT, QuizQuestionT, TopicT } from '../content/schema';

const opts = { minimize: false, versionKey: false } as const;

const CodeSnippetSchema = new Schema({ language: { type: String, required: true }, code: { type: String, required: true } }, { _id: false });

// ---------------------------------------------------------------- topics
export interface TopicDoc extends Omit<TopicT, 'category'> {
  _id: Types.ObjectId;
  category: CategoryT;
}

const TopicSchema = new Schema<TopicDoc>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    order: { type: Number, required: true, index: true },
    summary: { type: String, required: true },
    overview: { type: String, required: true },
    cheatsheet: {
      type: [new Schema({ title: String, points: [String] }, { _id: false })],
      default: undefined,
    },
    patterns: {
      type: [new Schema({ name: String, whenToUse: String, template: { type: CodeSnippetSchema, default: undefined } }, { _id: false })],
      default: undefined,
    },
    estimatedHours: { type: Number, required: true },
  },
  opts,
);
export const TopicModel = model<TopicDoc>('Topic', TopicSchema);

// ---------------------------------------------------------------- questions
export interface QuestionDoc extends Omit<QuestionT, 'difficulty' | 'kind' | 'frequency'> {
  _id: Types.ObjectId;
  difficulty: DifficultyT;
  kind: QuestionKindT;
  frequency: FrequencyT;
  /** index within its topic file */
  order: number;
  /** the topic's global order, denormalised for the default sort */
  topicOrder: number;
}

const QuestionSchema = new Schema<QuestionDoc>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, required: true },
    kind: { type: String, required: true },
    frequency: { type: String, required: true },
    tags: { type: [String], default: undefined },
    pattern: { type: String },
    prompt: { type: String, required: true },
    examples: {
      type: [new Schema({ input: String, output: String, explanation: String }, { _id: false })],
      default: undefined,
    },
    constraints: { type: [String], default: undefined },
    hints: { type: [String], default: undefined },
    approaches: {
      type: [new Schema({ name: String, idea: String, time: String, space: String }, { _id: false })],
      default: undefined,
    },
    solution: {
      type: new Schema(
        {
          summary: String,
          explanation: String,
          code: { type: [CodeSnippetSchema], default: undefined },
          complexity: { type: new Schema({ time: String, space: String }, { _id: false }), default: undefined },
          keyPoints: { type: [String], default: undefined },
        },
        { _id: false, minimize: false },
      ),
      required: true,
    },
    // array of visuals, stored as-is (validated by the zod content schema)
    visuals: { type: Schema.Types.Mixed, default: undefined },
    pitfalls: { type: [String], default: undefined },
    followUps: { type: [new Schema({ question: String, answer: String }, { _id: false })], default: undefined },
    related: { type: [String], default: undefined },
    order: { type: Number, required: true },
    topicOrder: { type: Number, required: true },
  },
  opts,
);
QuestionSchema.index({ topic: 1, order: 1 });
QuestionSchema.index({ topicOrder: 1, order: 1 });
export const QuestionModel = model<QuestionDoc>('Question', QuestionSchema);

// ---------------------------------------------------------------- quiz questions
export interface QuizQuestionDoc extends Omit<QuizQuestionT, 'difficulty'> {
  _id: Types.ObjectId;
  difficulty: DifficultyT;
  topic: string;
  order: number;
}

const QuizQuestionSchema = new Schema<QuizQuestionDoc>(
  {
    // content id like "arrays-hashing-q3" (not the Mongo _id)
    id: { type: String, required: true, unique: true },
    topic: { type: String, required: true },
    order: { type: Number, required: true },
    question: { type: String, required: true },
    code: { type: CodeSnippetSchema, default: undefined },
    options: { type: [String], default: undefined },
    answer: { type: Number, required: true },
    explanation: { type: String, required: true },
    difficulty: { type: String, required: true },
  },
  // `id: false` disables Mongoose's `id` virtual, which would shadow the content id
  { ...opts, id: false },
);
QuizQuestionSchema.index({ topic: 1, order: 1 });
export const QuizQuestionModel = model<QuizQuestionDoc>('QuizQuestion', QuizQuestionSchema);

// ---------------------------------------------------------------- roadmap
export interface RoadmapDoc extends ApiRoadmap {
  _id: Types.ObjectId;
  key: string;
}

const RoadmapSchema = new Schema<RoadmapDoc>(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    days: {
      type: [
        new Schema(
          {
            day: Number,
            week: Number,
            title: String,
            topics: [String],
            goals: [String],
            questionSlugs: [String],
            estimatedHours: Number,
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },
  },
  opts,
);
export const RoadmapModel = model<RoadmapDoc>('Roadmap', RoadmapSchema);

export const ROADMAP_KEY = 'default';
