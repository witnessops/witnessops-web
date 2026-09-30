import { createHash } from 'node:crypto';
import { types } from 'node:util';
import { findDuplicateJsonObjectKey } from '../../apps/witnessops-web/src/lib/json-ambiguity.ts';

// Receiving profile, not schema ownership. Pinned upstream details: docs/MORPHEUS-HANDOFF-INTAKE.md.
export const UPSTREAM_COMMIT = '45fa888886a05b45a5d8f833bacefc66dbab30a8';
export const MAX_PACKET_BYTES = 262144;
export const MAX_RECEIPT_BYTES = 131072;
export const FIXED_NON_AUTHORIZATIONS = Object.freeze([
  'Target repository changes', 'Target branch or pull request creation',
  'Agent dispatch or command execution', 'Source evidence collection or upload',
  'Merge, auto-merge or deployment', 'Credentials or account access',
]);
const SCOPE = Object.freeze({ implementation: 'unknown', deployment: 'unknown', target_mutation: 'none', execution_authorization: 'not_granted' });
const OPTION_KEYS = ['id', 'label', 'archive_state', 'source_wording', 'basis'];
const RECEIPT_KEYS = ['schema', 'id', 'decision_id', 'title', 'question', 'selected_option', 'rejected_options', 'unselected_options', 'evidence', 'related_objects', 'owner', 'date', 'reason', 'limitations', 'next_gate', 'source_snapshot_sha256', 'authority', 'scope'];
const PACKET_KEYS = ['schema', 'id', 'created_at', 'state', 'authority', 'decision_id', 'decision_receipt_id', 'decision_receipt_sha256', 'decision_receipt_encoding', 'decision_receipt_json', 'source_snapshot_sha256', 'target', 'selected_option', 'requested_outcome', 'acceptance', 'not_authorized', 'next_gate', 'scope'];
const SHA256 = /^[a-f0-9]{64}$/;
const BUFFER_STORAGE = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'buffer')!.get!;
type Obj = Record<string, any>;
export class IntakeError extends Error {
  constructor(public code: string, public location: string) {
    // Only developer-authored codes and locations; no submitted values, keys or file paths.
    super(`${code} at ${location}`); this.name = 'IntakeError';
  }
}
function need(ok: unknown, code: string, location: string): asserts ok {
  if (!ok) throw new IntakeError(code, location);
}
function object(value: unknown, location: string): asserts value is Obj {
  need(value !== null && typeof value === 'object' && !Array.isArray(value), 'OBJECT_REQUIRED', location);
}
function keys(value: unknown, expected: readonly string[], location: string): asserts value is Obj {
  object(value, location);
  need(Object.keys(value).length === expected.length && expected.every(k => Object.hasOwn(value, k)), 'FIELDS', location);
}
function text(value: unknown, min: number, max: number, location: string): asserts value is string {
  need(typeof value === 'string' && value.trim().length >= min && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), 'TEXT_PROFILE', location);
}
function digest(value: unknown, location: string): asserts value is string {
  need(typeof value === 'string' && SHA256.test(value), 'SHA256_PROFILE', location);
}
function list(value: unknown, min: number, max: number, location: string): asserts value is any[] {
  need(Array.isArray(value) && value.length >= min && value.length <= max, 'ARRAY_PROFILE', location);
}
function strings(value: unknown, min: number, max: number, itemMin: number, itemMax: number, location: string): asserts value is string[] {
  list(value, min, max, location);
  value.forEach((v,i) => text(v, itemMin, itemMax, `${location}/${i}`));
  need(new Set(value).size === value.length, 'DUPLICATE_ENTRY', location);
}
function timestamp(value: unknown, location: string) {
  need(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value, 'DATE_PROFILE', location);
}
function scalarString(value: string, location: string) {
  for(let i=0;i<value.length;i++) {
    const n=value.charCodeAt(i);
    if(n>=0xd800 && n<=0xdbff) { const next=value.charCodeAt(++i);need(next>=0xdc00 && next<=0xdfff, 'UNICODE_PROFILE', location); }
    else need(!(n>=0xdc00 && n<=0xdfff), 'UNICODE_PROFILE', location);
  }
}
function parse(source: string, location: string): any {
  need(source.charCodeAt(0)!==0xfeff, 'BOM_UNSUPPORTED', location);
  let value;
  try {
    need(findDuplicateJsonObjectKey(source) === null, 'DUPLICATE_MEMBER', location);
    value=JSON.parse(source);
  } catch(error) {
    if(error instanceof IntakeError) throw error;
    throw new IntakeError('JSON_PROFILE', location);
  }
  // Limits apply independently to the packet and receipt; unknown evidence metadata stays inert.
  let nodes=0;
  const walk=(v:any,depth:number) => {
    need(++nodes<=10000 && depth<=32, 'RESOURCE_LIMIT', location);
    if(typeof v==='string') scalarString(v,location);
    if(typeof v==='number') need(Number.isSafeInteger(v), 'NUMBER_PROFILE', location);
    if(v && typeof v==='object') for(const [k,item] of Object.entries(v)) {scalarString(k,location);walk(item,depth+1);}
  };
  walk(value,0);return value;
}
function option(value: unknown, location: string): asserts value is Obj {
  keys(value, OPTION_KEYS, location);
  text(value.id,1,200,location+'/id');text(value.label,1,2000,location+'/label');
  text(value.archive_state,1,100,location+'/archive_state');text(value.basis,1,4000,location+'/basis');
  if(value.source_wording!==null)text(value.source_wording,1,4000,location+'/source_wording');
}
function receiptProfile(r: unknown): asserts r is Obj {
  const at='/receipt';keys(r,RECEIPT_KEYS,at);
  need(r.schema==='witnessops.decision-receipt.v1','RECEIPT_SCHEMA',at+'/schema');
  text(r.id,1,200,at+'/id');text(r.decision_id,1,200,at+'/decision_id');
  text(r.title,1,4000,at+'/title');text(r.question,1,4000,at+'/question');
  option(r.selected_option,at+'/selected_option');
  for(const name of ['rejected_options','unselected_options']) {
    list(r[name],0,256,at+'/'+name);r[name].forEach((o:unknown,i:number)=>option(o,`${at}/${name}/${i}`));
  }
  const ids=[r.selected_option,...r.rejected_options,...r.unselected_options].map(o=>o.id);
  need(new Set(ids).size===ids.length,'DUPLICATE_OPTION',at);
  list(r.evidence,1,256,at+'/evidence');
  r.evidence.forEach((e:any,i:number)=>{
    const loc=`${at}/evidence/${i}`;object(e,loc);
    text(e.id,1,200,loc+'/id');text(e.label,1,2000,loc+'/label');
    need(['cited','context','missing'].includes(e.use),'EVIDENCE_PROFILE',loc+'/use');
    need((e.use==='missing')===(e.availability==='missing'),'EVIDENCE_PROFILE',loc+'/use');
    if(e.sha256!==null)digest(e.sha256,loc+'/sha256');
    need(e.verification===(e.use==='cited'?'SHA-256 matched at recording':'Not checked for this record'),'EVIDENCE_PROFILE',loc+'/verification');
    if(e.use==='cited') {text(e.path,1,4096,loc+'/path');digest(e.sha256,loc+'/sha256');need(e.availability!=='missing','EVIDENCE_PROFILE',loc+'/availability');}
    // Metadata paths and URLs are never dereferenced or used to configure the receiver.
  });
  need(r.evidence.some((e:any)=>e.use==='cited'),'CITED_EVIDENCE_REQUIRED',at+'/evidence');
  need(new Set(r.evidence.map((e:any)=>e.id)).size===r.evidence.length,'DUPLICATE_EVIDENCE',at+'/evidence');
  strings(r.related_objects,0,256,1,200,at+'/related_objects');
  need(r.owner==='founder','RECEIPT_OWNER_LABEL',at+'/owner');timestamp(r.date,at+'/date');
  text(r.reason,10,4000,at+'/reason');text(r.limitations,10,4000,at+'/limitations');text(r.next_gate,10,2000,at+'/next_gate');
  digest(r.source_snapshot_sha256,at+'/source_snapshot_sha256');text(r.authority,1,4000,at+'/authority');
  keys(r.scope,['implementation','deployment','storage'],at+'/scope');
  need(r.scope.implementation==='unknown' && r.scope.deployment==='unknown' && r.scope.storage==='Browser-local; no authenticated identity or publication authorization.','RECEIPT_SCOPE',at+'/scope');
}

/** Validate one byte snapshot only. No I/O, source fetching, storage or execution. */
export function inspectHandoff(input: Buffer) {
  need(!types.isProxy(input) && Buffer.isBuffer(input) && types.isUint8Array(input),'INPUT_TYPE','/');
  need(!types.isSharedArrayBuffer(BUFFER_STORAGE.call(input)),'INPUT_TYPE','/');
  need(input.byteLength>0 && input.byteLength<=MAX_PACKET_BYTES,'PACKET_SIZE','/');
  const bytes=Buffer.from(input);
  let source:string;
  try {source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);} catch {throw new IntakeError('UTF8','/');}
  const p=parse(source,'/packet');keys(p,PACKET_KEYS,'/packet');
  need(p.schema==='witnessops.morpheus.build-handoff.v1','SCHEMA','/packet/schema');
  need(p.state==='prepared','STATE','/packet/state');need(p.authority==='none','AUTHORITY','/packet/authority');
  need(typeof p.id==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(p.id),'ID_PROFILE','/packet/id');
  timestamp(p.created_at,'/packet/created_at');
  text(p.decision_id,1,200,'/packet/decision_id');text(p.decision_receipt_id,1,200,'/packet/decision_receipt_id');
  digest(p.decision_receipt_sha256,'/packet/decision_receipt_sha256');digest(p.source_snapshot_sha256,'/packet/source_snapshot_sha256');
  need(p.decision_receipt_encoding==='utf-8','ENCODING','/packet/decision_receipt_encoding');
  keys(p.target,['repository','area'],'/packet/target');need(p.target.repository==='witnessops/witnessops-web','TARGET_REPOSITORY','/packet/target/repository');
  text(p.target.area,1,512,'/packet/target/area');
  need(/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(p.target.area) && !p.target.area.split('/').some((s:string)=>s==='.'||s==='..'),'TARGET_AREA','/packet/target/area');
  keys(p.scope,Object.keys(SCOPE),'/packet/scope');for(const [k,v] of Object.entries(SCOPE))need(p.scope[k]===v,'SCOPE','/packet/scope/'+k);
  option(p.selected_option,'/packet/selected_option');
  text(p.requested_outcome,10,4000,'/packet/requested_outcome');text(p.next_gate,10,2000,'/packet/next_gate');
  strings(p.acceptance,1,16,5,1000,'/packet/acceptance');strings(p.not_authorized,6,22,5,1000,'/packet/not_authorized');
  need(FIXED_NON_AUTHORIZATIONS.every(s=>p.not_authorized.includes(s)),'FIXED_EXCLUSIONS','/packet/not_authorized');
  need(typeof p.decision_receipt_json==='string','RECEIPT_TEXT','/packet/decision_receipt_json');
  const receiptBytes=Buffer.from(p.decision_receipt_json,'utf8');
  need(receiptBytes.length>0 && receiptBytes.length<=MAX_RECEIPT_BYTES,'RECEIPT_SIZE','/packet/decision_receipt_json');
  // Verify the exact submitted UTF-8 bytes BEFORE attempting to parse the embedded receipt.
  need(createHash('sha256').update(receiptBytes).digest('hex')===p.decision_receipt_sha256,'RECEIPT_DIGEST','/packet/decision_receipt_sha256');
  need(p.decision_receipt_json.endsWith('\n'),'RECEIPT_SERIALIZATION','/packet/decision_receipt_json');
  const r=parse(p.decision_receipt_json,'/receipt');receiptProfile(r);
  need(JSON.stringify(r,null,2)+'\n'===p.decision_receipt_json,'RECEIPT_SERIALIZATION','/packet/decision_receipt_json');
  for(const [packetKey,receiptKey] of [['decision_id','decision_id'],['decision_receipt_id','id'],['source_snapshot_sha256','source_snapshot_sha256']])need(p[packetKey]===r[receiptKey],'RECEIPT_BINDING','/packet/'+packetKey);
  need(OPTION_KEYS.every(k=>p.selected_option[k]===r.selected_option[k]),'RECEIPT_BINDING','/packet/selected_option');
  return {
    status:'ADMISSIBLE FOR HUMAN REVIEW',
    decision:{id:p.decision_id,title:r.title,question:r.question,reason:r.reason,limitations:r.limitations},
    selected_option:p.selected_option,requested_outcome:p.requested_outcome,target:p.target,
    acceptance:p.acceptance,additional_exclusions:p.not_authorized.filter((s:string)=>!FIXED_NON_AUTHORIZATIONS.includes(s)),
    fixed_non_authorizations:[...FIXED_NON_AUTHORIZATIONS],next_gate:p.next_gate,
    receipt:{id:r.id,sha256:p.decision_receipt_sha256,sha256_match:true,source_snapshot_sha256:p.source_snapshot_sha256},
    scope:{...SCOPE},
    limitations:[
      'A valid handoff is a reconstructable implementation request. It is not authority to modify this repository.',
      'Only supplied profile, byte binding and internal relationships were checked. No authentic origin, owner identity, latest browser resolution, live source snapshot, evidence truth or current implementation authority is established.',
      'Source paths, URLs, requested outcomes and other supplied strings remain inert data; no target path existence or contents were inspected.',
      'Selected ≠ handed off ≠ authorized ≠ implemented ≠ deployed.',
    ],
  };
}
export type Intake = ReturnType<typeof inspectHandoff>;
// One-line JSON quoting keeps supplied instructions and terminal/bidi controls visibly bounded.
export function safeJSON(value: unknown, space?: number): string {
  return JSON.stringify(value,null,space).replace(/[\u007f-\u009f\u200e\u200f\u2028-\u202e\u2066-\u2069]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
}
export function formatHuman(i: Intake): string {
  const line=(label:string,value:unknown)=>`${label}: ${safeJSON(value)}`;
  const items=(label:string,values:string[])=>[label+':',...values.map(v=>'  - '+safeJSON(v))].join('\n');
  return [i.status,i.limitations[0],'Supplied record text follows as quoted data.',
    line('Decision',i.decision),line('Selected option',i.selected_option),line('Requested outcome',i.requested_outcome),
    line('Target repository',i.target.repository),line('Target area',i.target.area),items('Acceptance criteria',i.acceptance),
    items('Additional exclusions',i.additional_exclusions),items('Fixed non-authorizations',i.fixed_non_authorizations),line('Next gate',i.next_gate),
    line('Receipt ID',i.receipt.id),'Receipt SHA-256: MATCH ('+i.receipt.sha256+')',line('Source snapshot SHA-256',i.receipt.source_snapshot_sha256),
    'Implementation: UNKNOWN','Deployment: UNKNOWN','Execution authorization: NOT GRANTED',...i.limitations.slice(1),''
  ].join('\n');
}
