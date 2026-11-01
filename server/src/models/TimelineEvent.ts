import { Schema, model, Types } from 'mongoose';

const timelineEventSchema = new Schema(
  {
    caseId: { type: Types.ObjectId, ref: 'Case', required: true, index: true },
    timeLabel: { type: String, required: true },
    title: { type: String, required: true },
    detail: { type: String, default: '' },
    type: { type: String, default: 'Incident' },
    suspectId: { type: Types.ObjectId, ref: 'Suspect' },
    evidenceId: { type: Types.ObjectId, ref: 'Evidence' },
  },
  { timestamps: true },
);

export const TimelineEvent = model('TimelineEvent', timelineEventSchema);
