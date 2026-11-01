import { Schema, model, Types } from 'mongoose';
export const GenerationJob = model('GenerationJob',new Schema({caseId:Types.ObjectId,status:String,stage:String,progressPercent:Number,error:String,tokenUsage:[Schema.Types.Mixed],startedAt:Date,finishedAt:Date},{timestamps:true}));
