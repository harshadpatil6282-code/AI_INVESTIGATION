import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, unique: true, sparse: true, index: true },
    passwordHash: String,
    displayName: { type: String, index: true },
    isGuest: { type: Boolean, default: false },
    stats: { type: Schema.Types.Mixed, default: { casesPlayed: 0, casesSolved: 0, totalScore: 0 } },
    dailyGenerationCount: { type: Number, default: 0 },
    dailyResetAt: Date,
  },
  { timestamps: true },
);

export const User = model('User', userSchema);
