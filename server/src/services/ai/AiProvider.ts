import { z } from 'zod';
export interface AiProvider { generateJson<T>(opts:{stage:string;system:string;prompt:string;schema:z.ZodType<T>;temperature?:number;model?:'text'|'reasoning'}):Promise<{data:T;usage:{inputTokens:number;outputTokens:number}}> ; generateImage(opts:{prompt:string;aspectRatio?:string}):Promise<{bytes:Buffer;mime:string}> }
