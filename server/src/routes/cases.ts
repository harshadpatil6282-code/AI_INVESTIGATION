import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { caseController } from '../controllers/caseController.js';

const router = Router();
router.use(auth);

router.post('/', caseController.createCase);
router.get('/', caseController.listCases);
router.get('/:caseId/status', caseController.getCaseStatus);
router.get('/:caseId/overview', caseController.getCaseOverview);
router.get('/:caseId/evidence', caseController.getCaseEvidence);
router.get('/:caseId/evidence/:evidenceId', caseController.getCaseEvidenceById);
router.get('/:caseId/suspects', caseController.getCaseSuspects);
router.get('/:caseId/interrogations', caseController.getCaseInterrogations);
router.get('/:caseId/timeline', caseController.getCaseTimeline);
router.get('/:caseId/analysis', caseController.getCaseAnalysis);
router.get('/:caseId/hypotheses', caseController.getCaseHypotheses);
router.get('/:caseId/notes', caseController.getCaseNotes);
router.put('/:caseId/notes', caseController.saveCaseNotes);
router.post('/:caseId/autosave', caseController.autosaveCaseState);
router.get('/:caseId/tasks', caseController.getCaseTasks);
router.post('/:caseId/hint', caseController.getHint);
router.post('/:caseId/accusation', caseController.submitAccusation);
router.get('/:caseId/report', caseController.getCaseReport);

router.get('/:caseId', caseController.getCaseOverview);

export default router;

