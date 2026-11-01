import { Schema, model, Types } from 'mongoose';

const investigationSessionSchema = new Schema(
  {
    caseId: { type: Types.ObjectId, ref: 'Case', required: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    status: { type: String, default: 'active' },
    currentStage: { type: String, default: 'overview' },
    progress: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const InvestigationSession = model('InvestigationSession', investigationSessionSchema);
