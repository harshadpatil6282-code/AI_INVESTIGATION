import { Schema, model, Types } from 'mongoose';

const attemptSchema = new Schema(
  {
    caseId: { type: Types.ObjectId, required: true, index: true },
    userId: { type: Types.ObjectId, required: true, index: true },
    accusedSuspectId: String,
    reasoning: String,
    isCorrect: Boolean,
    hintsUsed: Number,
    timeSpentSeconds: Number,
    score: Number,
  },
  { timestamps: true },
);

attemptSchema.index({ caseId: 1, userId: 1 }, { unique: true });

export const Attempt = model('Attempt', attemptSchema);
