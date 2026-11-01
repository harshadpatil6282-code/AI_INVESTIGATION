import { z } from 'zod';

export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);
export const CreateCaseSchema = z.object({ seedText: z.string().trim().min(20).max(1000), difficulty: DifficultySchema, genre: z.string().trim().max(80).optional() });
export const AccuseSchema = z.object({ suspectId: z.string().min(1), reasoning: z.string().max(2000).optional() });
export const NotesSchema = z.object({ text: z.string().max(10000), pinnedEvidenceIds: z.array(z.string()).max(50).default([]), suspectMarks: z.record(z.enum(['suspect','cleared','unknown'])).default({}) });
export const EvidenceTypeSchema = z.enum(['chat','image','cctv','document','log']);
export const PublicSuspectSchema = z.object({ id:z.string(), name:z.string(), age:z.number(), role:z.string(), relationToVictim:z.string(), publicStatement:z.string(), portraitAssetId:z.string().optional() });
export const EvidenceSchema = z.object({ id:z.string(), type:EvidenceTypeSchema, title:z.string(), description:z.string(), inWorldTimestamp:z.string(), payload:z.unknown(), assets:z.array(z.object({assetId:z.string(),mime:z.string(),altText:z.string()})).default([]), unlockOrder:z.number() });
export type Difficulty = z.infer<typeof DifficultySchema>;
