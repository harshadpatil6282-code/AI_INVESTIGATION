import { z } from 'zod';
import { env } from '../../config/env.js';
import type { AiProvider } from './AiProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { MockAiProvider } from './MockAiProvider.js';

const buildProvider = (): AiProvider => {
  const primary = env.geminiKey ? new GeminiProvider() : null;
  const fallback = new MockAiProvider();

  return {
    async generateJson<T>({
      stage,
      system,
      prompt,
      schema,
      temperature,
      model,
    }: {
      stage: string;
      system: string;
      prompt: string;
      schema: z.ZodType<T>;
      temperature?: number;
      model?: 'text' | 'reasoning';
    }) {
      if (!primary) {
        return fallback.generateJson({ stage, system, prompt, schema, temperature, model });
      }

      try {
        return await primary.generateJson({ stage, system, prompt, schema, temperature, model });
      } catch (error) {
        console.warn('[ai-fallback] Gemini validation failed, using mock provider.', {
          stage,
          model,
          error: (error as Error).message,
        });
        return fallback.generateJson({ stage, system, prompt, schema, temperature, model });
      }
    },
    async generateImage(opts: { prompt: string; aspectRatio?: string }) {
      if (!primary) {
        return fallback.generateImage(opts);
      }

      try {
        return await primary.generateImage(opts);
      } catch (error) {
        console.warn('[ai-fallback] Gemini image generation failed, using mock provider.', {
          prompt: opts.prompt,
          error: (error as Error).message,
        });
        return fallback.generateImage(opts);
      }
    },
  };
};

const suspectShape = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  role: z.string(),
  relationToVictim: z.string(),
  publicStatement: z.string(),
  portraitAssetId: z.string().optional(),
});

const timelineEntry = z.object({
  time: z.string(),
  event: z.string(),
  significance: z.string(),
});

const evidenceShape = z.object({
  id: z.string(),
  type: z.enum(['chat', 'image', 'cctv', 'document', 'log']),
  title: z.string(),
  description: z.string(),
  inWorldTimestamp: z.string(),
  payload: z.any(),
  unlockOrder: z.number(),
  evidenceType: z.enum(['direct', 'circumstantial', 'red-herring']),
  reliability: z.enum(['high', 'medium', 'low']),
  clueIds: z.array(z.string()),
  clueNotes: z.array(z.string()),
  assets: z.array(z.object({ assetId: z.string(), mime: z.string(), altText: z.string() })).default([]),
});

export class CaseGenerationAgent {
  constructor(private readonly ai: AiProvider = buildProvider()) {}

  async generate(input: { seedText: string; difficulty: string; genre?: string }) {
    const schema = z.object({
      title: z.string(),
      setting: z.string(),
      briefing: z.string(),
      publicSuspects: z.array(suspectShape),
      hiddenTruth: z.object({
        culpritId: z.string(),
        culpritName: z.string(),
        motive: z.string(),
        method: z.string(),
        solutionSummary: z.string(),
        timeline: z.array(timelineEntry),
        redHerrings: z.array(z.string()),
      }),
    });

    return this.ai.generateJson({
      stage: 'case-generation',
      system:
        'You are a solution-first investigative case architect. Choose a culprit, motive, and method before designing any public evidence. Keep the truth private and treat the culprit as fixed once chosen.',
      prompt: `Create a case from the following seed. Keep all hidden truth private and ensure the public case is derived from it rather than created independently.\n\n${JSON.stringify(input, null, 2)}`,
      schema,
      temperature: 0.35,
      model: 'reasoning',
    });
  }
}

export class CrimeSceneGenerationAgent {
  constructor(private readonly ai: AiProvider = buildProvider()) {}

  async generate(input: { caseTitle: string; setting: string; hiddenTruth: { culpritId: string; motive: string; method: string; solutionSummary: string } }) {
    const schema = z.object({
      scene: z.object({
        location: z.string(),
        atmosphere: z.string(),
        immediateFindings: z.array(z.string()),
        maintainedEvidence: z.array(z.string()),
      }),
      sceneSummary: z.string(),
    });

    return this.ai.generateJson({
      stage: 'crime-scene-generation',
      system:
        'You create the crime scene and preserve the internal logic of the case. Ensure every scene element is compatible with the fixed culprit, motive, and method.',
      prompt: JSON.stringify(input, null, 2),
      schema,
      temperature: 0.2,
      model: 'text',
    });
  }
}

export class EvidenceGenerationAgent {
  constructor(private readonly ai: AiProvider = buildProvider()) {}

  async generate(input: { title: string; setting: string; hiddenTruth: { culpritId: string; motive: string; method: string; solutionSummary: string; timeline: Array<{ time: string; event: string; significance: string }> }; scene: { scene: { location: string; atmosphere: string; immediateFindings: string[]; maintainedEvidence: string[] } } }) {
    const schema = z.object({
      evidence: z.array(
        z.object({
          id: z.string(),
          type: z.enum(['chat', 'image', 'cctv', 'document', 'log']),
          title: z.string(),
          description: z.string(),
          inWorldTimestamp: z.string(),
          payload: z.any(),
          unlockOrder: z.number(),
          evidenceType: z.enum(['direct', 'circumstantial', 'red-herring']),
          reliability: z.enum(['high', 'medium', 'low']),
          clueIds: z.array(z.string()),
          clueNotes: z.array(z.string()),
          assets: z.array(z.object({ assetId: z.string(), mime: z.string(), altText: z.string() })).default([]),
        }),
      ),
    });

    return this.ai.generateJson({
      stage: 'evidence-generation',
      system:
        'Generate public evidence that can be validated against the private solution. Distinguish direct evidence from circumstantial evidence and mark red herrings clearly. Never expose the actual culprit or hidden truth.',
      prompt: JSON.stringify(input, null, 2),
      schema,
      temperature: 0.3,
      model: 'reasoning',
    });
  }
}

export class SuspectBehaviourAgent {
  constructor(private readonly ai: AiProvider = buildProvider()) {}

  async generate(input: { publicSuspects: Array<{ id: string; name: string; age: number; role: string; relationToVictim: string; publicStatement: string }>; hiddenTruth: { culpritId: string; motive: string; method: string; solutionSummary: string } }) {
    const schema = z.object({
      suspects: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          role: z.string(),
          motiveRisk: z.string(),
          behaviouralPattern: z.string(),
          publicStatement: z.string(),
          contradictionFlags: z.array(z.string()),
        }),
      ),
    });

    return this.ai.generateJson({
      stage: 'suspect-behaviour',
      system:
        'Build realistic suspect behaviour for a period-appropriate case. Strengthen contradictions and maintain the culprit as the one whose actions align with the secret truth.',
      prompt: JSON.stringify(input, null, 2),
      schema,
      temperature: 0.45,
      model: 'text',
    });
  }
}

export class InterrogationAgent {
  constructor(private readonly ai: AiProvider = buildProvider()) {}

  async generate(input: { suspects: Array<{ id: string; name: string; publicStatement: string; behaviouralPattern: string; contradictionFlags: string[] }>; hiddenTruth: { culpritId: string; motive: string; method: string } }) {
    const schema = z.object({
      keyQuestions: z.array(
        z.object({
          suspectId: z.string(),
          question: z.string(),
          objective: z.string(),
        }),
      ),
      behaviouralReadouts: z.array(
        z.object({
          suspectId: z.string(),
          readout: z.string(),
          confidence: z.enum(['low', 'medium', 'high']),
        }),
      ),
    });

    return this.ai.generateJson({
      stage: 'interrogation-planning',
      system:
        'Design a structured interrogation plan keyed to contradictions and behavioural anomalies without exposing the hidden truth.',
      prompt: JSON.stringify(input, null, 2),
      schema,
      temperature: 0.35,
      model: 'text',
    });
  }
}

export class DigitalForensicsAnalysisAgent {
  constructor(private readonly ai: AiProvider = buildProvider()) {}

  async generate(input: { evidence: Array<{ id: string; type: string; title: string; description: string; payload?: any }>; hiddenTruth: { culpritId: string; motive: string; method: string } }) {
    const schema = z.object({
      findings: z.array(
        z.object({
          evidenceId: z.string(),
          finding: z.string(),
          reliability: z.enum(['high', 'medium', 'low']),
          connection: z.string(),
        }),
      ),
    });

    return this.ai.generateJson({
      stage: 'digital-forensics',
      system:
        'Analyze digital logs, messages, and data artifacts for chronology, device access, and contradictory details while keeping the hidden culprit fixed.',
      prompt: JSON.stringify(input, null, 2),
      schema,
      temperature: 0.25,
      model: 'reasoning',
    });
  }
}

export class TimelineAnalysisAgent {
  constructor(private readonly ai: AiProvider = buildProvider()) {}

  async generate(input: { hiddenTruth: { timeline: Array<{ time: string; event: string; significance: string }>; solutionSummary: string }; evidence: Array<{ id: string; type: string; title: string; inWorldTimestamp?: string; description: string; payload?: any }> }) {
    const schema = z.object({
      timeline: z.array(
        z.object({
          timestamp: z.string(),
          event: z.string(),
          explains: z.string(),
        }),
      ),
      gaps: z.array(z.string()),
    });

    return this.ai.generateJson({
      stage: 'timeline-analysis',
      system:
        'Place all relevant evidence into a valid chronology and identify missing or weakly supported links without revealing the hidden truth.',
      prompt: JSON.stringify(input, null, 2),
      schema,
      temperature: 0.25,
      model: 'reasoning',
    });
  }
}

export class ContradictionDetectionAgent {
  constructor(private readonly ai: AiProvider = buildProvider()) {}

  async generate(input: { suspectStatements: string[]; evidence: Array<{ id: string; type: string; title: string; description: string }>; hiddenTruth: { culpritId: string; motive: string; method: string } }) {
    const schema = z.object({
      contradictions: z.array(
        z.object({
          source: z.string(),
          statement: z.string(),
          contrast: z.string(),
          significance: z.string(),
        }),
      ),
      unresolvedQuestions: z.array(z.string()),
    });

    return this.ai.generateJson({
      stage: 'contradiction-detection',
      system:
        'Identify contradictions and weak explanations while distinguishing direct evidence, circumstantial evidence, and unreliable testimony. The true culprit remains fixed.',
      prompt: JSON.stringify(input, null, 2),
      schema,
      temperature: 0.35,
      model: 'reasoning',
    });
  }
}

export class HypothesisEvaluationAgent {
  constructor(private readonly ai: AiProvider = buildProvider()) {}

  async generate(input: { evidence: Array<{ id: string; type: string; title: string; description: string; evidenceType?: string; reliability?: string }>; suspects: Array<{ id: string; name: string; role: string }>; hiddenTruth: { culpritId: string; motive: string; method: string; solutionSummary: string } }) {
    const schema = z.object({
      hypotheses: z.array(
        z.object({
          suspectId: z.string(),
          label: z.string(),
          strength: z.enum(['weak', 'moderate', 'strong']),
          reasoning: z.string(),
          missingInformation: z.array(z.string()),
        }),
      ),
    });

    return this.ai.generateJson({
      stage: 'hypothesis-evaluation',
      system:
        'Compare alternative explanations against the evidence and explain why each theory is weak, moderate, or strong without revealing the hidden truth.',
      prompt: JSON.stringify(input, null, 2),
      schema,
      temperature: 0.4,
      model: 'reasoning',
    });
  }
}

export class FinalInvestigationEvaluationAgent {
  constructor(private readonly ai: AiProvider = buildProvider()) {}

  async generate(input: {
    title: string;
    briefing: string;
    hiddenTruth: { culpritId: string; motive: string; method: string; solutionSummary: string };
    contradictions: Array<{ source: string; statement: string; contrast: string; significance: string }>;
    hypotheses: Array<{ suspectId: string; label: string; strength: 'weak' | 'moderate' | 'strong'; reasoning: string; missingInformation: string[] }>;
    evidence: Array<{ id: string; type: string; title: string; description: string; evidenceType?: string; reliability?: string }>;
  }) {
    const schema = z.object({
      evaluation: z.object({
        overallAssessment: z.string(),
        strongestDirection: z.string(),
        whatStillNeedsChecking: z.array(z.string()),
        confidence: z.enum(['low', 'medium', 'high']),
      }),
    });

    return this.ai.generateJson({
      stage: 'final-investigation-evaluation',
      system:
        'Produce a final investigative assessment that summarizes the likely conclusion, identifies unresolved questions, and confirms the hidden truth is consistent with the total body of evidence.',
      prompt: JSON.stringify(input, null, 2),
      schema,
      temperature: 0.25,
      model: 'reasoning',
    });
  }
}

export const investigationAgents = {
  caseGeneration: CaseGenerationAgent,
  crimeScene: CrimeSceneGenerationAgent,
  evidence: EvidenceGenerationAgent,
  suspectBehaviour: SuspectBehaviourAgent,
  interrogation: InterrogationAgent,
  digitalForensics: DigitalForensicsAnalysisAgent,
  timeline: TimelineAnalysisAgent,
  contradictions: ContradictionDetectionAgent,
  hypotheses: HypothesisEvaluationAgent,
  finalEvaluation: FinalInvestigationEvaluationAgent,
};

export type InvestigationEvidence = z.infer<typeof evidenceShape>;
