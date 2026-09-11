import type { ProofpackResult } from '../../../witnessops-web/src/lib/proofpack/verify.mjs';
import { localAuditAdapter } from '../../../witnessops-web/src/lib/proofpack/local-audit-adapter';

// An explicit source map, not a recursive JSON diff. Missing or wrongly typed
// values are null. Strings are preserved; counts must be nonnegative integers.
export const LINUX_FIELDS = {
  osId: ['host_identity','os_release.id','string'], osVersion: ['host_identity','os_release.version_id','string'],
  kernel: ['host_identity','kernel','string'], architecture: ['host_identity','architecture','string'],
  rebootRequired: ['updates','reboot_required','boolean'], failedUnitCount: ['services','failed_unit_count','number'],
  pendingUpdates: ['updates','available_update_count','number'], securityUpdates: ['updates','security_update_count','number'],
  firewallPolicy: ['firewall','inbound_policy','string'], firewallProvider: ['firewall','provider','string'],
  firewallAllowRules: ['firewall','inbound_allow_rule_count','number'], firewallRules: ['firewall','inbound_rule_count','number'],
  passwordAuthentication: ['ssh','password_authentication','string'], permitRootLogin: ['ssh','permit_root_login','string'], pubkeyAuthentication: ['ssh','pubkey_authentication','string'],
  uid0Accounts: ['accounts','uid0_account_count','number'], totalAccounts: ['accounts','total_account_count','number'], interactiveAccounts: ['accounts','interactive_shell_account_count','number'],
  authorizedKeyFiles: ['privileged_access','authorized_key_file_count','number'], sudoersDropins: ['privileged_access','sudoers_dropin_file_count','number'],
  unsafeKeyFiles: ['privileged_access','unsafe_authorized_key_file_count','number'], unsafeSudoersMetadata: ['privileged_access','unsafe_sudoers_metadata_count','number'], adminGroupMembers: ['privileged_access','non_root_admin_group_member_count','number'],
  rootKeysStatus: ['privileged_access','root_authorized_keys.status','string'], rootKeysMode: ['privileged_access','root_authorized_keys.mode','string'], rootKeysOwner: ['privileged_access','root_authorized_keys.owner_uid','number'],
  apparmor: ['hardening','apparmor_enabled','boolean'], selinux: ['hardening','selinux_enforcing','boolean'],
  protectedHardlinks: ['hardening','sysctl.fs.protected_hardlinks','string'], protectedSymlinks: ['hardening','sysctl.fs.protected_symlinks','string'],
  dmesgRestrict: ['hardening','sysctl.kernel.dmesg_restrict','string'], kptrRestrict: ['hardening','sysctl.kernel.kptr_restrict','string'], unprivilegedBpfDisabled: ['hardening','sysctl.kernel.unprivileged_bpf_disabled','string'],
} as const;
export type LinuxField = keyof typeof LINUX_FIELDS;
type Value = string | number | boolean | null;
export const SECTIONS = ['host_identity','clock','accounts','ssh','firewall','listeners','privileged_access','services','hardening','critical_files','updates'] as const;
type Section = typeof SECTIONS[number];
export type LinuxServerSnapshotV1 = {
  schema: 'witnessops.linux_server_snapshot.v1';
  source: { proofRunId: string; sourceDigest: string; verifierVersion: string; productVersion: '1.2.2'; collectorVersion: string | null; collectorSourceSha256: string | null; profileId: string; observedAt: string; synthetic: boolean };
  identity: { hostname: string; machineIdHash: string | null };
  values: Record<LinuxField, Value>;
  listeners: string[] | null; failedServices: string[] | null;
  criticalFiles: Array<{ path: string; status: string | null; owner: string | null; group: string | null; mode: string | null }> | null;
  collection: Record<Section, { status: string | null; complete: boolean; reason: string | null; method: string | null }>;
  updates: { securityClassification: string | null; cacheFreshness: string | null; cacheOnly: boolean | null };
};
const object = (v: unknown): Record<string,unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string,unknown> : {};
const text = (v: unknown) => typeof v === 'string' ? v : null;
function field(section: Record<string,unknown>, path: string): unknown {
  if (path.startsWith('sysctl.')) return object(section.sysctl)[path.slice(7)];
  const [key,child] = path.split('.'); return child ? object(section[key])[child] : section[key];
}
const sorted = (values: string[]) => [...new Set(values)].sort();
export function linuxServerSnapshotFromVerifiedResult(result: ProofpackResult): LinuxServerSnapshotV1 {
  if (result.status !== 'valid' || !result.report || !localAuditAdapter(result, result.report.posture.observed_at_utc)) throw new Error('An admitted Local Audit 1.2.2 result is required');
  const p=result.report.posture, sections=p.sections;
  const collection=Object.fromEntries(SECTIONS.map(id=>[id,{status:text(sections[id]?.status),complete:result.report!.completeness.section_results.find(s=>s.section===id)?.complete===true,reason:text(sections[id]?.diagnostic_reason),method:text(sections[id]?.collector_method)}])) as LinuxServerSnapshotV1['collection'];
  const values=Object.fromEntries(Object.entries(LINUX_FIELDS).map(([id,[section,path,type]])=>{
    const v=field(sections[section]??{},path);
    const known=typeof v===type && (type!=='number'||(Number.isSafeInteger(v)&&Number(v)>=0));
    return [id,known?v:null];
  })) as LinuxServerSnapshotV1['values'];
  const updates=sections.updates??{};
  // APT classification unavailable is never converted to zero security updates.
  if (updates.security_classification==='unavailable') values.securityUpdates=null;
  const endpoints=sections.listeners?.actual_endpoints;
  const listeners=Array.isArray(endpoints) && endpoints.every(e=>{const x=object(e);return ['tcp','udp'].includes(String(x.transport))&&typeof x.address==='string'&&Number.isInteger(x.port)&&Number(x.port)>=0&&Number(x.port)<=65535;}) ? sorted(endpoints.map(e=>`${e.transport}/${e.address}:${e.port}`)) : null;
  const units=sections.services?.failed_units;
  const files=sections.critical_files?.files;
  const machine=object(sections.host_identity?.machine_identity);
  const collector=object(object(result.report.manifest).collector);
  const collectorHash=text(collector.hash);
  return {schema:'witnessops.linux_server_snapshot.v1',source:{proofRunId:result.proof_run_id,sourceDigest:result.verification_inputs.proofpack.sha256,verifierVersion:result.verifier_version,productVersion:'1.2.2',collectorVersion:text(collector.version),collectorSourceSha256:collectorHash&&/^sha256:[a-f0-9]{64}$/.test(collectorHash)?collectorHash.slice(7):null,profileId:String(result.report.scope.profile_id),observedAt:p.observed_at_utc,synthetic:p.synthetic},
    identity:{hostname:p.target.hostname,machineIdHash:machine.status==='observed'&&typeof machine.sha256==='string'&&/^[a-f0-9]{64}$/.test(machine.sha256)?machine.sha256:null},values,listeners,
    failedServices:Array.isArray(units)&&units.every(u=>typeof u==='string')?sorted(units):null,
    criticalFiles:Array.isArray(files)&&files.every(f=>typeof object(f).path==='string')?files.map(f=>({path:String(f.path),status:text(f.status),owner:text(f.owner),group:text(f.group),mode:text(f.mode)})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0):null,
    collection,updates:{securityClassification:text(updates.security_classification),cacheFreshness:text(updates.cache_freshness),cacheOnly:typeof updates.cache_only==='boolean'?updates.cache_only:null}};
}
/** Strict cache shape. A cache is never sufficient for run admission or reopen. */
export function isLinuxServerSnapshot(value: unknown): value is LinuxServerSnapshotV1 {
  const s=object(value), source=object(s.source), identity=object(s.identity), values=object(s.values), collection=object(s.collection), updates=object(s.updates);
  const keys=(o:Record<string,unknown>, expected:string[])=>Object.keys(o).sort().join()===expected.sort().join();
  return s.schema==='witnessops.linux_server_snapshot.v1' && keys(s,['schema','source','identity','values','listeners','failedServices','criticalFiles','collection','updates'])
    && keys(source,['proofRunId','sourceDigest','verifierVersion','productVersion','collectorVersion','collectorSourceSha256','profileId','observedAt','synthetic']) && ['collectorVersion','collectorSourceSha256'].every(k=>source[k]===null||typeof source[k]==='string') && (source.collectorSourceSha256===null||/^[a-f0-9]{64}$/.test(String(source.collectorSourceSha256))) && source.productVersion==='1.2.2' && typeof source.synthetic==='boolean' && ['proofRunId','sourceDigest','verifierVersion','profileId','observedAt'].every(k=>typeof source[k]==='string') && /^[a-f0-9]{64}$/.test(String(source.sourceDigest))
    && keys(identity,['hostname','machineIdHash']) && typeof identity.hostname==='string' && (identity.machineIdHash===null||typeof identity.machineIdHash==='string'&&/^[a-f0-9]{64}$/.test(identity.machineIdHash))
    && keys(values,Object.keys(LINUX_FIELDS)) && Object.entries(LINUX_FIELDS).every(([id,[,,type]])=>values[id]===null||typeof values[id]===type&&(type!=='number'||Number.isSafeInteger(values[id])&&Number(values[id])>=0))
    && keys(collection,[...SECTIONS]) && SECTIONS.every(id=>{const c=object(collection[id]);return keys(c,['status','complete','reason','method'])&&typeof c.complete==='boolean'&&['status','reason','method'].every(k=>c[k]===null||typeof c[k]==='string');})
    && ['listeners','failedServices'].every(k=>s[k]===null||Array.isArray(s[k])&&(s[k] as unknown[]).every(x=>typeof x==='string'))
    && (s.criticalFiles===null||Array.isArray(s.criticalFiles)&&s.criticalFiles.every(f=>{const x=object(f);return keys(x,['path','status','owner','group','mode'])&&typeof x.path==='string'&&['status','owner','group','mode'].every(k=>x[k]===null||typeof x[k]==='string');}))
    && keys(updates,['securityClassification','cacheFreshness','cacheOnly']) && ['securityClassification','cacheFreshness'].every(k=>updates[k]===null||typeof updates[k]==='string') && (updates.cacheOnly===null||typeof updates.cacheOnly==='boolean');
}
