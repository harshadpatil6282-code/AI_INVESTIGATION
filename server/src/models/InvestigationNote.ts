import { Schema, model, Types } from 'mongoose';

const investigationNoteSchema = new Schema(
  {
    caseId: { type: Types.ObjectId, ref: 'Case', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    pinnedEvidenceIds: [{ type: String }],
    suspectMarks: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const InvestigationNote = model('InvestigationNote', investigationNoteSchema);
