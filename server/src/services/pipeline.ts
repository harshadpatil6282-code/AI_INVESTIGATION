import { Case } from '../models/Case.js';
import { Evidence } from '../models/Evidence.js';
import { GenerationJob } from '../models/GenerationJob.js';
import {
  CaseGenerationAgent,
  CrimeSceneGenerationAgent,
  EvidenceGenerationAgent,
  SuspectBehaviourAgent,
  InterrogationAgent,
  DigitalForensicsAnalysisAgent,
  TimelineAnalysisAgent,
  ContradictionDetectionAgent,
  HypothesisEvaluationAgent,
  FinalInvestigationEvaluationAgent,
} from './ai/InvestigationAgents.js';

export async function runMockPipeline(caseId: string, jobId: string) {
  const stages = [
    'Building the hidden truth',
    'Designing the crime scene',
    'Generating evidence',
    'Mapping suspect behaviour',
    'Planning interrogations',
    'Checking digital traces',
    'Aligning the timeline',
    'Testing contradictions',
    'Evaluating hypotheses',
    'Final review',
  ];

  for (let i = 0; i < stages.length; i += 1) {
    await GenerationJob.findByIdAndUpdate(jobId, {
      stage: stages[i],
      progressPercent: Math.round(((i + 1) / stages.length) * 100),
    });
    await new Promise((resolve) => setTimeout(resolve, 180));
  }

  const caseRecord = await Case.findById(caseId);
  if (!caseRecord) {
    throw new Error(`Case ${caseId} not found when building investigation pipeline.`);
  }

  const seedText = caseRecord.seedText ?? 'A respected collector vanishes during a masked gala at a historic manor.';
  const difficulty = caseRecord.difficulty ?? 'medium';
  const genre = caseRecord.genre ?? 'historical mystery';

  const caseAgent = new CaseGenerationAgent();
  const caseResult = await caseAgent.generate({ seedText, difficulty, genre });

  const sceneResult = await new CrimeSceneGenerationAgent().generate({
    caseTitle: caseResult.data.title,
    setting: caseResult.data.setting,
    hiddenTruth: caseResult.data.hiddenTruth,
  });

  const evidenceResult = await new EvidenceGenerationAgent().generate({
    title: caseResult.data.title,
    setting: caseResult.data.setting,
    hiddenTruth: caseResult.data.hiddenTruth,
    scene: sceneResult.data,
  });

  const suspectResult = await new SuspectBehaviourAgent().generate({
    publicSuspects: caseResult.data.publicSuspects,
    hiddenTruth: caseResult.data.hiddenTruth,
  });

  const interrogationResult = await new InterrogationAgent().generate({
    suspects: suspectResult.data.suspects,
    hiddenTruth: caseResult.data.hiddenTruth,
  });

  const digitalResult = await new DigitalForensicsAnalysisAgent().generate({
    evidence: evidenceResult.data.evidence,
    hiddenTruth: caseResult.data.hiddenTruth,
  });

  const timelineResult = await new TimelineAnalysisAgent().generate({
    hiddenTruth: caseResult.data.hiddenTruth,
    evidence: evidenceResult.data.evidence,
  });

  const contradictionResult = await new ContradictionDetectionAgent().generate({
    suspectStatements: suspectResult.data.suspects.map((entry: any) => entry.publicStatement),
    evidence: evidenceResult.data.evidence,
    hiddenTruth: caseResult.data.hiddenTruth,
  });

  const hypothesisResult = await new HypothesisEvaluationAgent().generate({
    evidence: evidenceResult.data.evidence,
    suspects: caseResult.data.publicSuspects,
    hiddenTruth: caseResult.data.hiddenTruth,
  });

  const finalResult = await new FinalInvestigationEvaluationAgent().generate({
    title: caseResult.data.title,
    briefing: caseResult.data.briefing,
    hiddenTruth: caseResult.data.hiddenTruth,
    contradictions: contradictionResult.data.contradictions,
    hypotheses: hypothesisResult.data.hypotheses,
    evidence: evidenceResult.data.evidence,
  });

  const fixedBible = {
    title: caseResult.data.title,
    setting: caseResult.data.setting,
    briefing: caseResult.data.briefing,
    culpritId: caseResult.data.hiddenTruth.culpritId,
    culpritName: caseResult.data.hiddenTruth.culpritName,
    motive: caseResult.data.hiddenTruth.motive,
    method: caseResult.data.hiddenTruth.method,
    solutionSummary: caseResult.data.hiddenTruth.solutionSummary,
    groundTruthTimeline: caseResult.data.hiddenTruth.timeline,
    redHerrings: caseResult.data.hiddenTruth.redHerrings,
    crimeScene: sceneResult.data.scene,
    timelineAnalysis: timelineResult.data,
    contradictions: contradictionResult.data,
    hypotheses: hypothesisResult.data,
    interrogationPlan: interrogationResult.data,
    digitalForensics: digitalResult.data,
    finalEvaluation: finalResult.data,
    culpritStable: true,
  };

  const docs = await Evidence.insertMany(
    evidenceResult.data.evidence.map((item: any, index: number) => ({
      caseId,
      type: item.type,
      title: item.title,
      description: item.description,
      inWorldTimestamp: item.inWorldTimestamp,
      payload: item.payload,
      assets: item.assets ?? [],
      unlockOrder: item.unlockOrder ?? index + 1,
      clueNotes: item.clueNotes ?? ['Internal clue metadata'],
      clueIds: item.clueIds ?? [`clue-${index + 1}`],
    })),
  );

  await Case.findByIdAndUpdate(caseId, {
    status: 'ready',
    title: fixedBible.title,
    briefing: fixedBible.briefing,
    publicSuspects: caseResult.data.publicSuspects,
    evidenceIds: docs.map((doc) => doc._id),
    hints: [
      `Revisit the ${sceneResult.data.scene.location} and trace the timeline recorded in the case summary.`,
      `Cross-check the suspect statements against the forensic findings and identify where the story diverges.`,
      `The strongest theory should align with the physical evidence rather than the most emotional testimony.`,
    ],
    bible: fixedBible,
    promptVersion: 'gemini-solution-first-v1',
  });

  await GenerationJob.findByIdAndUpdate(jobId, {
    status: 'ready',
    stage: 'Ready',
    progressPercent: 100,
    finishedAt: new Date(),
  });
}
