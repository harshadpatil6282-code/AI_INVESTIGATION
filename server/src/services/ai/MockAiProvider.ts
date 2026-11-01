import type { AiProvider } from './AiProvider.js';
import fixture from '../../../fixtures/sampleCase.json' with { type: 'json' };

type PublicSuspect = {
  id: string;
  name: string;
  age: number;
  role: string;
  relationToVictim: string;
  publicStatement: string;
  portraitAssetId: string;
};

const suspectSeed = Array.isArray((fixture as any).suspects) ? (fixture as any).suspects : [];
const culprit = suspectSeed.find((suspect: any) => suspect.id === (fixture as any).culpritId) ?? suspectSeed[0] ?? {
  id: 's1',
  name: 'Mira Sen',
  age: 31,
  role: 'Events manager',
  relationToVictim: 'Wedding planner',
  publicStatement: 'I was on a vendor call in the office.',
};

const defaultTimeline = [
  { time: '20:15', event: 'The display case is secured after the reception begins.', significance: 'Early access to the vault is limited to staff and authorised vendors.' },
  { time: '20:44', event: 'The lights flicker and the service corridor is briefly isolated.', significance: 'This creates the narrow window used for the theft.' },
  { time: '21:02', event: 'The missing brooch is discovered after the lock is opened.', significance: 'The theft is confirmed by the final inventory mismatch.' },
];

function toPublicSuspects(): PublicSuspect[] {
  return suspectSeed.length
    ? suspectSeed.map((suspect: any): PublicSuspect => ({
        id: suspect.id,
        name: suspect.name,
        age: Number(suspect.age ?? 30),
        role: suspect.role,
        relationToVictim: suspect.relationToVictim,
        publicStatement: suspect.publicStatement,
        portraitAssetId: `${suspect.id}-portrait`,
      }))
    : [
        {
          id: 's1',
          name: 'Mira Sen',
          age: 31,
          role: 'Events manager',
          relationToVictim: 'Wedding planner',
          publicStatement: 'I was on a vendor call in the office.',
          portraitAssetId: 's1-portrait',
        },
        {
          id: 's2',
          name: 'Ravi Khanna',
          age: 38,
          role: 'Jeweller',
          relationToVictim: 'Insurer',
          publicStatement: 'I never left the ballroom.',
          portraitAssetId: 's2-portrait',
        },
      ];
}

function buildCaseGenerationData() {
  return {
    title: (fixture as any).title ?? 'The Orchid Vault',
    setting: `${(fixture as any).setting?.place ?? 'The Aster Hotel'} — a rain-soaked, high-security venue during a private celebration.`,
    briefing: (fixture as any).incident?.summary ?? 'A diamond brooch vanished from a locked display during a private event.',
    publicSuspects: toPublicSuspects(),
    hiddenTruth: {
      culpritId: (fixture as any).culpritId ?? culprit.id,
      culpritName: culprit.name,
      motive: (fixture as any).motive ?? 'Debt concealed from his insurer.',
      method: (fixture as any).method ?? 'Used a copied display key during a staged power flicker.',
      solutionSummary: (fixture as any).solutionSummary ?? 'The culprit exploited the blackout to access the lock and return to the dance floor before the room was sealed.',
      timeline: Array.isArray((fixture as any).groundTruthTimeline) && (fixture as any).groundTruthTimeline.length > 0
        ? (fixture as any).groundTruthTimeline.map((entry: any) => ({
            time: entry.time,
            event: entry.action,
            significance: entry.location,
          }))
        : defaultTimeline,
      redHerrings: Array.isArray((fixture as any).redHerrings) && (fixture as any).redHerrings.length > 0
        ? (fixture as any).redHerrings.map((entry: any) => entry.description ?? entry)
        : ['A witness claims a staff member switched off the corridor lamp.', 'A maintenance log mentions a loose hinge on the display cabinet.', 'The private photographer mentions a suspicious tug near the ballroom doors.'],
    },
  };
}

function buildEvidenceData() {
  const suspects = toPublicSuspects();
  return {
    evidence: [
      {
        id: 'E-01',
        type: 'chat',
        title: 'Private message thread',
        description: 'A chat thread between two staff members discussing the event schedule and corridor access.',
        inWorldTimestamp: '20:36',
        payload: {
          isGroup: false,
          participants: [
            { name: suspects[0]?.name ?? 'Mira Sen', avatarAssetId: 'avatar-s1' },
            { name: suspects[1]?.name ?? 'Ravi Khanna', avatarAssetId: 'avatar-s2' },
          ],
          messages: [
            { sender: suspects[0]?.name ?? 'Mira Sen', text: 'The staff door is still live after the first blackout.', timestamp: '20:36', status: 'read', attachmentEvidenceId: null, deleted: false },
            { sender: suspects[1]?.name ?? 'Ravi Khanna', text: 'I will be near the display after the lights drop.', timestamp: '20:38', status: 'read', attachmentEvidenceId: null, deleted: false },
          ],
        },
        unlockOrder: 1,
        evidenceType: 'circumstantial',
        reliability: 'medium',
        clueIds: ['clue-chat-01'],
        clueNotes: ['A corridor access message contradicts the claim that the suspect stayed in the ballroom.'],
        assets: [],
      },
      {
        id: 'E-02',
        type: 'image',
        title: 'Security still from display corridor',
        description: 'A still frame from a hallway camera shows the service door swing open during the brief blackout.',
        inWorldTimestamp: '20:44',
        payload: {
          altText: 'A security still of the display corridor at a hotel during a brief blackout.',
          capturedAt: '2026-10-30T20:44:00Z',
          ocrText: 'Door activity · corridor camera · 20:44',
          kind: 'security-still',
        },
        unlockOrder: 2,
        evidenceType: 'direct',
        reliability: 'high',
        clueIds: ['clue-image-01'],
        clueNotes: ['The flash indicates movement in the corridor during the blackout window.'],
        assets: [{ assetId: 'img-01', mime: 'image/jpeg', altText: 'Security still of corridor door during blackout.' }],
      },
      {
        id: 'E-03',
        type: 'cctv',
        title: 'Lobby camera sequence',
        description: 'A short CCTV sequence captures the suspect moving through the gallery and re-entering the ballroom.',
        inWorldTimestamp: '20:46',
        payload: {
          cameraName: 'Lobby-West Cam 2',
          frames: [
            { timestamp: '20:46:00', imageAssetId: 'cctv-frame-1', caption: 'Movement near the display case.' },
            { timestamp: '20:46:18', imageAssetId: 'cctv-frame-2', caption: 'Suspect exits toward the service corridor.' },
            { timestamp: '20:46:42', imageAssetId: 'cctv-frame-3', caption: 'Suspect re-enters the ballroom from the service corridor.' },
          ],
        },
        unlockOrder: 3,
        evidenceType: 'direct',
        reliability: 'high',
        clueIds: ['clue-cctv-01'],
        clueNotes: ['Timing aligns with the blackout and contradicts the suspect alibi.'],
        assets: [{ assetId: 'cctv-01', mime: 'image/jpeg', altText: 'CCTV footage sequence of lobby movement.' }],
      },
      {
        id: 'E-04',
        type: 'document',
        title: 'Inventory ledger',
        description: 'The inventory ledger notes the missing brooch and reveals a gap in the inventory count.',
        inWorldTimestamp: '21:02',
        payload: {
          title: 'Inventory ledger entry',
          author: 'Housekeeping archive',
          summary: 'The Orchid Brooch entry is marked as missing exactly after the blackout.',
        },
        unlockOrder: 4,
        evidenceType: 'circumstantial',
        reliability: 'medium',
        clueIds: ['clue-doc-01'],
        clueNotes: ['The ledger corroborates the theft window to the blackout sequence.'],
        assets: [],
      },
      {
        id: 'E-05',
        type: 'log',
        title: 'Service access log',
        description: 'A service corridor log shows a key card used in the restricted corridor during the blackout.',
        inWorldTimestamp: '20:45',
        payload: {
          entries: [
            { timestamp: '20:44:52', badge: 'SV-87', action: 'Door unlock' },
            { timestamp: '20:45:10', badge: 'SV-87', action: 'Display touchpoint logged' },
          ],
        },
        unlockOrder: 5,
        evidenceType: 'direct',
        reliability: 'high',
        clueIds: ['clue-log-01'],
        clueNotes: ['Access remains consistent with the culprit’s role and timing.'],
        assets: [],
      },
      {
        id: 'E-06',
        type: 'document',
        title: 'Red herring note',
        description: 'A note from a vendor listing a false meeting time that appears to implicate the wrong person.',
        inWorldTimestamp: '20:30',
        payload: { note: 'Vendor call scheduled for 20:30; incorrect arrival noted.' },
        unlockOrder: 6,
        evidenceType: 'red-herring',
        reliability: 'low',
        clueIds: ['clue-red-01'],
        clueNotes: ['This contradiction is useful only as a false lead.'],
        assets: [],
      },
    ],
  };
}

function buildSuspectBehaviourData() {
  return {
    suspects: toPublicSuspects().map((suspect: PublicSuspect) => ({
      id: suspect.id,
      name: suspect.name,
      role: suspect.role,
      motiveRisk: suspect.id === culprit.id ? 'high' : 'medium',
      behaviouralPattern: suspect.id === culprit.id ? 'Controlled, evasive, and careful to keep the timeline aligned with the blackout.' : 'Consistent but under pressure to explain a weak alibi.',
      publicStatement: suspect.publicStatement,
      contradictionFlags: suspect.id === culprit.id ? ['Service corridor access contradicts the ballroom alibi.', 'The key-card trail aligns with the theft window.'] : ['The timeline does not fully match the witness account.'],
    })),
  };
}

function buildInterrogationData() {
  return {
    keyQuestions: toPublicSuspects().map((suspect: PublicSuspect) => ({
      suspectId: suspect.id,
      question: `Can you account for your movements in the corridor during the blackout and confirm the timeline you gave to the police?`,
      objective: suspect.id === culprit.id ? 'Pressure the suspect to reconcile the access log with their public statement.' : 'Clarify the alibi and test whether the suspect had a valid excuse for the timeline gap.',
    })),
    behaviouralReadouts: toPublicSuspects().map((suspect: PublicSuspect) => ({
      suspectId: suspect.id,
      readout: suspect.id === culprit.id ? 'Measured, rehearsed, and unusually calm when the timeline is questioned.' : 'Tense but consistent when asked to explain the missing minutes.',
      confidence: suspect.id === culprit.id ? 'high' : 'medium',
    })),
  };
}

function buildDigitalForensicsData() {
  return {
    findings: [
      {
        evidenceId: 'E-05',
        finding: 'The service access log shows a key-card swipe in the restricted corridor exactly during the blackout.',
        reliability: 'high',
        connection: 'Directly supports the culprit’s access to the display case.',
      },
      {
        evidenceId: 'E-01',
        finding: 'The chat thread includes references to the corridor remaining active after the main lights failed.',
        reliability: 'medium',
        connection: 'Shows the suspect was aware of the access window and planned around it.',
      },
    ],
  };
}

function buildTimelineAnalysisData() {
  return {
    timeline: [
      { timestamp: '20:15', event: 'Display case secured for wedding event.', explains: 'The lock and case remained intact before the theft window opened.' },
      { timestamp: '20:44', event: 'Service corridor blackout and door access spike.', explains: 'This is the narrow moment the culprit used to reach the display.' },
      { timestamp: '21:02', event: 'Inventory mismatch reported to the security desk.', explains: 'The theft is confirmed only after the security breach is noticed.' },
    ],
    gaps: ['The exact motion of the culprit inside the display corridor is not fully visible.', 'One vendor story remains intentionally inconsistent with the final timeline.'],
  };
}

function buildContradictionData() {
  return {
    contradictions: [
      {
        source: 'Suspect statement',
        statement: 'I never left the ballroom.',
        contrast: 'The key-card log records a corridor access during the blackout window.',
        significance: 'This directly contradicts the defendant’s public alibi and places the suspect near the display.',
      },
    ],
    unresolvedQuestions: ['Was the suspect acting alone or using a known inside contact?'],
  };
}

function buildHypothesisData() {
  return {
    hypotheses: toPublicSuspects().map((suspect: PublicSuspect) => ({
      suspectId: suspect.id,
      label: suspect.id === culprit.id ? 'Primary theory' : 'Secondary theory',
      strength: suspect.id === culprit.id ? 'strong' : 'weak',
      reasoning: suspect.id === culprit.id
        ? 'The suspect’s role, access, and timeline fit the service-corridor breach and the theft window.'
        : 'This suspect had a plausible explanation but lacked the access pattern that matches the corridor breach.',
      missingInformation: suspect.id === culprit.id ? ['Confirm the suspect’s role in the corridor access during the blackout.'] : ['Validate whether the alibi needs independent confirmation.'],
    })),
  };
}

function buildFinalAssessmentData() {
  return {
    evaluation: {
      overallAssessment: 'The evidence most strongly supports the suspect with direct corridor access during the blackout and a recurring contradiction in the public timeline.',
      strongestDirection: 'Focus on the corridor access log and the service route used during the theft window.',
      whatStillNeedsChecking: ['Confirm whether the suspect acted alone.', 'Cross-check the corridor key-card gate with the event schedule.'],
      confidence: 'high',
    },
  };
}

export class MockAiProvider implements AiProvider {
  async generateJson<T>({ stage, schema }: any): Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }> {
    const data = (() => {
      switch (stage) {
        case 'case-generation':
          return buildCaseGenerationData();
        case 'crime-scene-generation':
          return {
            scene: {
              location: 'Service corridor by the display case',
              atmosphere: 'Floodlit and cold, with weak residual motion around the display alcove.',
              immediateFindings: ['A disturbed display case lock', 'A fresh corridor scuff mark', 'A brief power flicker log'],
              maintainedEvidence: ['Display key remains missing', 'Access log is still active'],
            },
            sceneSummary: 'The crime scene shows a professionally timed access window with the suspect using the quiet corridor and a brief blackout to reach the display case.',
          };
        case 'evidence-generation':
          return buildEvidenceData();
        case 'suspect-behaviour':
          return buildSuspectBehaviourData();
        case 'interrogation-planning':
          return buildInterrogationData();
        case 'digital-forensics':
          return buildDigitalForensicsData();
        case 'timeline-analysis':
          return buildTimelineAnalysisData();
        case 'contradiction-detection':
          return buildContradictionData();
        case 'hypothesis-evaluation':
          return buildHypothesisData();
        case 'final-investigation-evaluation':
          return buildFinalAssessmentData();
        default:
          return { data: {} };
      }
    })();

    return {
      data: schema.parse(data),
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  async generateImage(_opts?: { prompt: string; aspectRatio?: string }): Promise<{ bytes: Buffer; mime: string }> {
    return { bytes: Buffer.from('mock image'), mime: 'image/svg+xml' };
  }
}
