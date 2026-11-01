import { Schema, model, Types } from 'mongoose';

const caseSolutionSchema = new Schema(
  {
    caseId: { type: Types.ObjectId, ref: 'Case', required: true, index: true },
    culpritId: { type: String, required: true },
    motive: { type: String, required: true },
    method: { type: String, required: true },
    solutionSummary: { type: String, required: true },
    timeline: [{ type: String }],
    redHerrings: [{ type: String }],
    privateEvidenceIds: [{ type: String }],
    createdBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const CaseSolution = model('CaseSolution', caseSolutionSchema);
