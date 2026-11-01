import { Schema, model, Types } from 'mongoose';

const suspectSchema = new Schema(
  {
    caseId: { type: Types.ObjectId, ref: 'Case', required: true, index: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    relationToVictim: { type: String, default: '' },
    publicStatement: { type: String, default: '' },
    motive: { type: String, default: '' },
    opportunity: { type: String, default: '' },
    alibi: { type: String, default: '' },
    isPrimarySuspect: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Suspect = model('Suspect', suspectSchema);
