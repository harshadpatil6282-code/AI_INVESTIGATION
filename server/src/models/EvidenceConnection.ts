import { Schema, model, Types } from 'mongoose';

const evidenceConnectionSchema = new Schema(
  {
    caseId: { type: Types.ObjectId, ref: 'Case', required: true, index: true },
    fromEvidenceId: { type: Types.ObjectId, ref: 'Evidence', required: true },
    toEvidenceId: { type: Types.ObjectId, ref: 'Evidence', required: true },
    relationship: { type: String, default: 'related' },
    strength: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const EvidenceConnection = model('EvidenceConnection', evidenceConnectionSchema);
