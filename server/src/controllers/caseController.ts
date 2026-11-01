import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import { CreateCaseSchema, AccuseSchema, NotesSchema } from '@mystery/shared';
import { Case } from '../models/Case.js';
import { Evidence } from '../models/Evidence.js';
import { GenerationJob } from '../models/GenerationJob.js';
import { Attempt } from '../models/Attempt.js';
import { PlayerNotes } from '../models/PlayerNotes.js';
import { runMockPipeline } from '../services/pipeline.js';
import { buildInvestigationAnalysis } from '../services/analysis.js';
import { buildCaseOverview, ensureOwnedCase } from '../services/caseAccess.js';
import type { AuthRequest } from '../middleware/auth.js';
import { ensureCaseConsistency, sanitizePrivateSolution } from '../lib/security.js';

const safeCaseLookup = async (req: AuthRequest, res: Response) => {
  const caseDoc = await ensureOwnedCase(String(req.userId), String(req.params.caseId));

  if (!caseDoc) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Case not found or you do not have access',
      },
    });
    return null;
  }

  return caseDoc;
};

const autosaveSchema = z.object({
  text: z.string().max(20000).optional(),
  pinnedEvidenceIds: z.array(z.string()).max(50).optional(),
  suspectMarks: z.record(z.string(), z.boolean()).optional(),
});

export const caseController = {
  async createCase(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = CreateCaseSchema.parse(req.body);
      const sanitized = sanitizePrivateSolution(payload as Record<string, unknown>);
      const caseDoc = await Case.create({
        ownerId: req.userId,
        ...sanitized,
        status: 'generating',
      });

      const job = await GenerationJob.create({
        caseId: caseDoc._id,
        status: 'running',
        stage: 'Queued',
        progressPercent: 0,
        startedAt: new Date(),
      });

      void runMockPipeline(String(caseDoc.id), String(job.id));

      res.status(202).json({
        caseId: caseDoc.id,
        jobId: job.id,
      });
    } catch (error) {
      next(error);
    }
  },

  async listCases(req: AuthRequest, res: Response) {
    const cases = await Case.find({ ownerId: req.userId }).select('-bible -hints');
    res.json(cases);
  },

  async getCaseStatus(req: AuthRequest, res: Response) {
    const caseDoc = await safeCaseLookup(req, res);
    if (!caseDoc) return;

    const job = await GenerationJob.findOne({ caseId: caseDoc._id }).sort({ createdAt: -1 });
    res.json(job);
  },

  async getCaseOverview(req: AuthRequest, res: Response) {
    const caseDoc = await safeCaseLookup(req, res);
    if (!caseDoc) return;

    res.json(await buildCaseOverview(caseDoc));
  },

  async getCaseEvidence(req: AuthRequest, res: Response) {
    const caseDoc = await safeCaseLookup(req, res);
    if (!caseDoc) return;

    const evidence = await Evidence.find({ caseId: caseDoc._id }).select('-clueNotes -clueIds');
    res.json(evidence);
  },

  async getCaseEvidenceById(req: AuthRequest, res: Response) {
    const caseDoc = await safeCaseLookup(req, res);
    if (!caseDoc) return;

    const evidence = await Evidence.findOne({
      _id: req.params.evidenceId,
      caseId: caseDoc._id,
    }).select('-clueNotes -clueIds');

    if (!evidence) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Evidence not found' },
      });
    }

    return res.json(evidence);
  },

  async getCaseSuspects(req: AuthRequest, res: Response) {
    const caseDoc = await safeCaseLookup(req, res);
    if (!caseDoc) return;

    res.json(caseDoc.publicSuspects ?? []);
  },

  async getCaseInterrogations(req: AuthRequest, res: Response) {
    const caseDoc = await safeCaseLookup(req, res);
    if (!caseDoc) return;

    res.json({
      caseId: caseDoc.id,
      interrogations: [],
      suspects: caseDoc.publicSuspects ?? [],
    });
  },

  async getCaseTimeline(req: AuthRequest, res: Response) {
    const caseDoc = await safeCaseLookup(req, res);
    if (!caseDoc) return;

    const events = await Evidence.find({ caseId: caseDoc._id }).lean();
    res.json({
      caseId: caseDoc.id,
      timeline: events.map((event) => ({
        time: event.inWorldTimestamp,
        title: event.title,
        detail: event.description,
      })),
    });
  },

  async getCaseAnalysis(req: AuthRequest, res: Response) {
    const caseDoc = await safeCaseLookup(req, res);
    if (!caseDoc) return;

    const evidence = await Evidence.find({ caseId: caseDoc._id }).select('-clueNotes -clueIds');
    res.json(
      buildInvestigationAnalysis(
        evidence.map((entry) => ({
          id: String(entry._id),
          type: entry.type,
          title: entry.title,
          description: entry.description,
          inWorldTimestamp: entry.inWorldTimestamp,
          payload: entry.payload,
        })),
        caseDoc.publicSuspects ?? [],
      ),
    );
  },

  async getCaseHypotheses(req: AuthRequest, res: Response) {
    const caseDoc = await safeCaseLookup(req, res);
    if (!caseDoc) return;

    res.json({
      caseId: caseDoc.id,
      hypotheses: [
        {
          id: 'default-hypothesis',
          label: 'Primary theory',
          summary: 'The public evidence points toward the suspect with the strongest access and motive link.',
          strength: 0.68,
        },
      ],
    });
  },

  async getCaseNotes(req: AuthRequest, res: Response) {
    const caseDoc = await safeCaseLookup(req, res);
    if (!caseDoc) return;

    const notes = await PlayerNotes.findOne({ caseId: caseDoc._id, userId: req.userId });

    return res.json({
      caseId: caseDoc.id,
      notes: notes ?? { text: '', pinnedEvidenceIds: [], suspectMarks: {} },
    });
  },

  async saveCaseNotes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const caseDoc = await safeCaseLookup(req, res);
      if (!caseDoc) return;

      const payload = NotesSchema.parse(req.body);
      const note = await PlayerNotes.findOneAndUpdate(
        { caseId: caseDoc._id, userId: req.userId },
        { ...payload, autosaveAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      return res.json(note);
    } catch (error) {
      return next(error);
    }
  },

  async autosaveCaseState(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const caseDoc = await safeCaseLookup(req, res);
      if (!caseDoc) return;

      const payload = autosaveSchema.parse(req.body);
      const note = await PlayerNotes.findOneAndUpdate(
        { caseId: caseDoc._id, userId: req.userId },
        { ...payload, autosaveAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      return res.json({
        caseId: caseDoc.id,
        savedAt: note.autosaveAt ?? new Date().toISOString(),
      });
    } catch (error) {
      return next(error);
    }
  },

  async getCaseTasks(req: AuthRequest, res: Response) {
    const caseDoc = await safeCaseLookup(req, res);
    if (!caseDoc) return;

    res.json({
      caseId: caseDoc.id,
      tasks: [
        { id: 'verify-access', title: 'Verify access credentials', done: true },
        { id: 'review-cctv', title: 'Review CCTV corridor motion', done: false },
        { id: 'compare-statements', title: 'Compare suspect statements', done: false },
      ],
    });
  },

  async submitAccusation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const caseDoc = await safeCaseLookup(req, res);
      if (!caseDoc) return;

      if (await Attempt.exists({ caseId: caseDoc._id, userId: req.userId })) {
        return res.status(409).json({
          error: { code: 'ALREADY_ACCUSED', message: 'This accusation is final' },
        });
      }

      const payload = AccuseSchema.parse(req.body);
      const hidden = await Case.findById(caseDoc._id).select('+bible +hints');
      const bible: any = hidden?.bible;
      const consistency = ensureCaseConsistency({
        publicSuspects: caseDoc.publicSuspects ?? [],
        culpritId: payload.suspectId,
        hiddenTruth: bible ? { culpritId: bible.culpritId } : undefined,
      });

      if (!consistency.ok) {
        return res.status(422).json({
          error: {
            code: 'CASE_INCONSISTENT',
            message: consistency.reason ?? 'The case record is internally inconsistent.',
          },
        });
      }

      const isCorrect = payload.suspectId === bible?.culpritId;
      const hintsUsed = Number(req.header('x-hints-used') ?? 0);
      const score = isCorrect ? Math.max(0, 600 - hintsUsed * 75 + (payload.reasoning ? 100 : 0)) : 0;

      await Attempt.create({
        caseId: caseDoc._id,
        userId: req.userId,
        accusedSuspectId: payload.suspectId,
        reasoning: payload.reasoning,
        isCorrect,
        hintsUsed,
        timeSpentSeconds: 0,
        score,
      });

      await Case.findByIdAndUpdate(caseDoc._id, {
        status: isCorrect ? 'solved' : 'failed_accusation',
      });

      return res.json({
        isCorrect,
        score,
        solution: sanitizePrivateSolution({
          culpritId: bible?.culpritId,
          motive: bible?.motive,
          method: bible?.method,
          summary: bible?.solutionSummary,
          timeline: bible?.groundTruthTimeline ?? [],
          redHerrings: bible?.redHerrings ?? [],
        }),
      });
    } catch (error) {
      return next(error);
    }
  },

  async getCaseReport(req: AuthRequest, res: Response) {
    const caseDoc = await safeCaseLookup(req, res);
    if (!caseDoc) return;

    const evidence = await Evidence.find({ caseId: caseDoc._id }).lean();
    res.json({
      caseId: caseDoc.id,
      title: caseDoc.title,
      overview: caseDoc.briefing,
      evidenceCount: evidence.length,
      suspectCount: (caseDoc.publicSuspects ?? []).length,
      summary: 'Investigation remains open pending final verdict and case review.',
    });
  },
  async getHint(req: AuthRequest, res: Response) {
    const caseDoc = await safeCaseLookup(req, res);
    if (!caseDoc) return;

    const hintsUsed = Number(req.header('x-hints-used') ?? 0);
    const maxHints = caseDoc.difficulty === 'easy' ? 3 : caseDoc.difficulty === 'hard' ? 1 : 2;

    if (hintsUsed >= maxHints) {
      return res.status(403).json({ error: { code: 'HINT_LIMIT', message: 'No hints remaining for this difficulty.' } });
    }

    const hidden = await Case.findById(caseDoc._id).select('+bible +hints');
    const hints: string[] = hidden?.hints ?? (hidden?.bible as any)?.hints ?? [
      'Look carefully at the timestamps across all evidence types.',
      'One suspect\'s alibi does not match the recorded timeline.',
      'The method of access is revealed in the document evidence.',
    ];

    const hint = hints[hintsUsed] ?? hints[hints.length - 1] ?? 'No more hints available.';
    return res.json({ hint, hintsUsed: hintsUsed + 1, remaining: Math.max(0, maxHints - hintsUsed - 1) });
  },
};
