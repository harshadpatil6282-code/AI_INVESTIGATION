import { Schema, model, Types } from 'mongoose';

const hypothesisSchema = new Schema(
  {
    caseId: { type: Types.ObjectId, ref: 'Case', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    summary: { type: String, default: '' },
    confidence: { type: Number, default: 0 },
    supportedEvidenceIds: [{ type: String }],
  },
  { timestamps: true },
);

export const Hypothesis = model('Hypothesis', hypothesisSchema);
