import { Schema, model, Types } from 'mongoose';

const playerNotesSchema = new Schema(
  {
    caseId: { type: Types.ObjectId, required: true, index: true },
    userId: { type: Types.ObjectId, required: true, index: true },
    text: String,
    pinnedEvidenceIds: [String],
    suspectMarks: Schema.Types.Mixed,
    autosaveAt: Date,
  },
  { timestamps: true },
);

playerNotesSchema.index({ caseId: 1, userId: 1 }, { unique: true });

export const PlayerNotes = model('PlayerNotes', playerNotesSchema);
