import { Schema, model, Types } from 'mongoose';

const interrogationSchema = new Schema(
  {
    caseId: { type: Types.ObjectId, ref: 'Case', required: true },
    suspectId: { type: Types.ObjectId, ref: 'Suspect', required: true },
    interviewerId: { type: Types.ObjectId, ref: 'User' },
    transcript: { type: String, default: '' },
    contradictions: [{ type: String }],
    confidence: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Interrogation = model('Interrogation', interrogationSchema);
