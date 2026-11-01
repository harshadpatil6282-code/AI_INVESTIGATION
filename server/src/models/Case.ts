import { Schema, model, Types } from 'mongoose';

const caseSchema = new Schema(
  {
    ownerId: { type: Types.ObjectId, required: true, index: true },
    seedText: String,
    difficulty: String,
    genre: String,
    status: { type: String, default: 'generating' },
    title: String,
    briefing: String,
    publicSuspects: { type: Array, default: [] },
    evidenceIds: { type: [Types.ObjectId], default: [] },
    hints: { type: [String], select: false },
    bible: { type: Schema.Types.Mixed, select: false },
    promptVersion: String,
    shareToken: { type: String, unique: true, sparse: true },
    isPublicShare: { type: Boolean, default: false },
  },
  { timestamps: true },
);

caseSchema.index({ ownerId: 1, createdAt: -1 });
caseSchema.index({ isPublicShare: 1, shareToken: 1 });

export const Case = model('Case', caseSchema);
