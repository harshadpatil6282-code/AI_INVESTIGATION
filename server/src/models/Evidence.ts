import { Schema, model, Types } from 'mongoose';
const evidenceSchema = new Schema({caseId:{type:Types.ObjectId,required:true,index:true},type:String,title:String,description:String,inWorldTimestamp:String,payload:Schema.Types.Mixed,assets:{type:Array,default:[]},clueNotes:{type:Array,select:false},clueIds:{type:Array,select:false},unlockOrder:Number},{timestamps:true});
export const Evidence = model('Evidence',evidenceSchema);
