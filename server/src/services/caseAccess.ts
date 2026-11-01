import { Case } from '../models/Case.js';
import { Evidence } from '../models/Evidence.js';

export async function ensureOwnedCase(userId: string, caseId: string) {
  return Case.findOne({ _id: caseId, ownerId: userId });
}

export async function buildCaseOverview(caseDoc: any) {
  const evidence = await Evidence.find({ caseId: caseDoc._id }).select('-clueNotes -clueIds').lean();
  const safeEvidence = evidence as Array<any>;

  return {
    id: caseDoc.id,
    status: caseDoc.status,
    title: caseDoc.title,
    briefing: caseDoc.briefing,
    difficulty: caseDoc.difficulty,
    genre: caseDoc.genre,
    publicSuspects: caseDoc.publicSuspects ?? [],
    evidence: safeEvidence.map((entry) => ({
      id: String(entry._id),
      type: entry.type,
      title: entry.title,
      description: entry.description,
      inWorldTimestamp: entry.inWorldTimestamp,
      unlockOrder: entry.unlockOrder,
      source: entry.source ?? 'Unknown source',
      location: entry.location ?? 'Unknown location',
    })),
  };
}
