import { Schema, model, Types } from 'mongoose';

const investigationReportSchema = new Schema(
  {
    caseId: { type: Types.ObjectId, ref: 'Case', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    summary: { type: String, default: '' },
    findings: [{ type: String }],
    confidenceScore: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const InvestigationReport = model('InvestigationReport', investigationReportSchema);
