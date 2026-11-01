import mongoose from 'mongoose';
import 'dotenv/config';
import { Case } from './src/models/Case.ts';
import { runMockPipeline } from './src/services/pipeline.ts';
import { GenerationJob } from './src/models/GenerationJob.ts';

try {
  await mongoose.connect(process.env.MONGODB_URI!);
  const userId = new mongoose.Types.ObjectId();
  const caseDoc = await Case.create({ ownerId: userId, seedText: 'Test case', difficulty: 'medium', genre: 'classic whodunit', status: 'generating' });
  const job = await GenerationJob.create({ caseId: caseDoc._id, status: 'running', stage: 'Queued', progressPercent: 0 });
  console.log('before pipeline', caseDoc._id.toString(), job._id.toString());
  await runMockPipeline(caseDoc._id.toString(), job._id.toString());
  console.log('after pipeline');
  const updatedCase = await Case.findById(caseDoc._id).lean();
  console.log('updated status', updatedCase?.status, updatedCase?.title, updatedCase?.publicSuspects?.length, updatedCase?.evidenceIds?.length);
  const updatedJob = await GenerationJob.findById(job._id).lean();
  console.log('job', updatedJob?.status, updatedJob?.stage, updatedJob?.progressPercent);
  await mongoose.disconnect();
} catch (error) {
  console.error('PIPELINE_ERR', error instanceof Error ? error.message : error);
  if (error && typeof error === 'object' && 'stack' in error) console.error((error as any).stack);
  process.exitCode = 1;
}
