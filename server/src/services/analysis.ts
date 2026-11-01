type PublicEvidence = { id:string; type?:string | null; title?:string | null; description?:string | null; inWorldTimestamp?:string | null; payload:any };

/** Builds investigation metadata only from evidence already safe for the player. */
export function buildInvestigationAnalysis(evidence: PublicEvidence[], suspects: Array<{id:string;name:string;role:string}>) {
  const timeline=[...evidence].sort((a,b)=>new Date(a.inWorldTimestamp ?? 0).getTime()-new Date(b.inWorldTimestamp ?? 0).getTime()).map(e=>({evidenceId:e.id,timestamp:e.inWorldTimestamp ?? '',type:e.type ?? 'document',title:e.title ?? 'Untitled evidence',description:e.description ?? ''}));
  const nodes=[...suspects.map(s=>({id:`suspect:${s.id}`,kind:'person',label:s.name,detail:s.role})),...evidence.map(e=>({id:`evidence:${e.id}`,kind:'evidence',label:e.title ?? 'Untitled evidence',detail:e.type ?? 'document'}))];
  const links=evidence.flatMap(e=>suspects.filter(s=>JSON.stringify(e.payload).toLowerCase().includes(s.name.toLowerCase().split(' ')[0])).map(s=>({from:`suspect:${s.id}`,to:`evidence:${e.id}`,relation:'mentioned in record'})));
  const custody=evidence.map(e=>({evidenceId:e.id,reference:`EV-${e.id.slice(-6).toUpperCase()}`,receivedAt:e.inWorldTimestamp ?? '',status:'recorded',integrity:'verified'}));
  return {timeline,nodes,links,custody};
}
