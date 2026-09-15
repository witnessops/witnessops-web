import { LINUX_FIELDS, SECTIONS, type LinuxServerSnapshotV1 } from './linux-snapshot';
export type LinuxComparison = { baselineId: string | null; qualification: 'NO_BASELINE' | 'IDENTITY_UNCERTAIN' | 'METHOD_CHANGED' | 'PROFILE_CHANGED' | 'COLLECTION_GAP' | 'COMPARABLE'; environment: string[]; coverage: string[]; uncertainty: string[] };
export type LinuxComparisonRun = { id:string; workspaceId:string; assetId:string; createdAt:string; snapshot:LinuxServerSnapshotV1 };
const order=(a:LinuxComparisonRun,b:LinuxComparisonRun)=>a.createdAt<b.createdAt?-1:a.createdAt>b.createdAt?1:a.id<b.id?-1:a.id>b.id?1:0;
export function linuxBaseline(current:LinuxComparisonRun, candidates:LinuxComparisonRun[]) {
  return candidates.filter(r=>r.workspaceId===current.workspaceId&&r.assetId===current.assetId&&order(r,current)<0).sort(order).at(-1);
}
export function compareLinuxRuns(current:LinuxComparisonRun, previous?:LinuxComparisonRun):LinuxComparison {
  const out:LinuxComparison={baselineId:null,qualification:'NO_BASELINE',environment:[],coverage:[],uncertainty:[]};
  if(!previous||previous.workspaceId!==current.workspaceId||previous.assetId!==current.assetId||order(previous,current)>=0)return out;
  out.baselineId=previous.id;out.qualification='COMPARABLE';
  const a=previous.snapshot,b=current.snapshot;
  if(a.source.profileId!==b.source.profileId){out.qualification='PROFILE_CHANGED';out.coverage.push('Profile changed; host-value comparison is not established.');}
  if(a.schema!==b.schema||a.source.verifierVersion!==b.source.verifierVersion||a.source.productVersion!==b.source.productVersion||a.source.collectorVersion!==b.source.collectorVersion||a.source.collectorSourceSha256!==b.source.collectorSourceSha256){out.qualification='METHOD_CHANGED';out.coverage.push('Projection or Local Audit method/version changed; host-value comparison is not established.');}
  const uncertainIdentity=a.identity.hostname!==b.identity.hostname||!a.identity.machineIdHash||!b.identity.machineIdHash||a.identity.machineIdHash!==b.identity.machineIdHash||!a.values.osId||!b.values.osId||a.values.osId!==b.values.osId;
  if(uncertainIdentity){out.qualification='IDENTITY_UNCERTAIN';out.uncertainty.push('Observed hostname, machine-id or OS identity is missing or differs. Same physical host is not established; host-value comparison withheld.');}
  if(!a.source.collectorSourceSha256||!b.source.collectorSourceSha256)out.uncertainty.push('Collector source hash unavailable; method continuity is not fully established.');
  const eligible=!uncertainIdentity&&!out.coverage.length;
  for(const section of SECTIONS){
    const old=a.collection[section],next=b.collection[section];
    if(old.method!==next.method)out.coverage.push(`${section}: collection method changed.`);
    if(old.complete!==next.complete)out.uncertainty.push(`${section}: collection ${next.complete?'recovered to complete':'became partial or unavailable'}.`);
    if(old.status!==next.status&&( !old.complete||!next.complete))out.uncertainty.push(`${section}: collection state ${old.status??'unknown'} → ${next.status??'unknown'}.`);
    if(!next.complete)out.uncertainty.push(`${section}: ${next.reason??'collection incomplete or unavailable'}`);
  }
  const comparable=(section:typeof SECTIONS[number])=>eligible&&a.collection[section].complete&&b.collection[section].complete&&a.collection[section].method===b.collection[section].method;
  for(const [id,[section]] of Object.entries(LINUX_FIELDS)){
    const key=id as keyof typeof LINUX_FIELDS,old=a.values[key],next=b.values[key];
    if(old===next)continue;
    if(!comparable(section))continue;
    if(old===null||next===null){out.coverage.push(`${id}: recorded field ${next===null?'no longer available':'became available'}.`);out.uncertainty.push(`${id}: one side is unknown; no host change established.`);}
    else out.environment.push(`${id}: ${old} → ${next}`);
  }
  const sets=(label:string,old:string[]|null,next:string[]|null,section:typeof SECTIONS[number])=>{
    if(!comparable(section))return;
    if(old===null||next===null){if(old!==next)out.uncertainty.push(`${label}: collection unavailable on one side.`);return;}
    for(const v of next)if(!old.includes(v))out.environment.push(`${label} added: ${v}`);
    for(const v of old)if(!next.includes(v))out.environment.push(`${label} removed: ${v}`);
  };
  sets('Listener',a.listeners,b.listeners,'listeners');sets('Failed service',a.failedServices,b.failedServices,'services');
  if(comparable('firewall')&&a.collection.firewall.status!==b.collection.firewall.status)out.environment.push(`Firewall state: ${a.collection.firewall.status} → ${b.collection.firewall.status} (not reachability).`);
  if(comparable('critical_files')&&a.criticalFiles&&b.criticalFiles){
    for(const path of [...new Set([...a.criticalFiles,...b.criticalFiles].map(f=>f.path))].sort()){
      const old=a.criticalFiles.find(f=>f.path===path),next=b.criticalFiles.find(f=>f.path===path);
      if(!old||!next){out.coverage.push(`Critical file ${path}: recorded metadata surface changed.`);continue;}
      for(const key of ['status','owner','group','mode'] as const)if(old[key]!==next[key]){
        if(old[key]===null||next[key]===null)out.uncertainty.push(`${path} ${key}: one side unknown.`);
        else out.environment.push(`${path} ${key}: ${old[key]} → ${next[key]}`);
      }
    }
  }
  if(b.updates.securityClassification==='unavailable'||b.values.securityUpdates===null)out.uncertainty.push('Updates security classification unavailable; security update count is unknown, not zero.');
  if(a.updates.securityClassification!==b.updates.securityClassification)out.uncertainty.push(`Updates classification: ${a.updates.securityClassification??'not recorded'} → ${b.updates.securityClassification??'not recorded'}.`);
  if(b.updates.cacheFreshness===null||b.updates.cacheFreshness==='unknown')out.uncertainty.push('Update cache freshness is not established.');
  if(out.qualification==='COMPARABLE'&&out.uncertainty.length)out.qualification='COLLECTION_GAP';
  return out;
}
