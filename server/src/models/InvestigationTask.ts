import { Schema, model, Types } from 'mongoose';

const investigationTaskSchema = new Schema(
  {
    caseId: { type: Types.ObjectId, ref: 'Case', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, default: 'open' },
    priority: { type: String, default: 'medium' },
  },
  { timestamps: true },
);

export const InvestigationTask = model('InvestigationTask', investigationTaskSchema);
