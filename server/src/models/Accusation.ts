import { Schema, model, Types } from 'mongoose';

const accusationSchema = new Schema(
  {
    caseId: { type: Types.ObjectId, ref: 'Case', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    suspectId: { type: String, required: true },
    reasoning: { type: String, default: '' },
    isCorrect: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Accusation = model('Accusation', accusationSchema);
