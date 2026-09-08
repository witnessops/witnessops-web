import { object, integer, same, demand } from './primitives.mjs';
import text from './finding-text.json' with { type: 'json' };
export const SECTIONS = ['accounts', 'clock', 'critical_files', 'firewall', 'hardening', 'host_identity', 'listeners', 'privileged_access', 'services', 'ssh', 'updates'];
export const SYSCTL = { 'kernel.unprivileged_bpf_disabled': ['0', '1', '2'], 'kernel.kptr_restrict': ['0', '1', '2'], 'kernel.dmesg_restrict': ['0', '1'], 'fs.protected_hardlinks': ['0', '1'], 'fs.protected_symlinks': ['0', '1'] };
const criticalPaths = ['/etc/passwd', '/etc/group', '/etc/shadow', '/etc/gshadow', '/etc/sudoers'];
const bool = v => typeof v === 'boolean';
const sorted = x => [...x].sort();
const endpointKeys = values => {
    if (!Array.isArray(values))
        return null;
    const keys = [];
    for (const v of values) {
        if (!object(v) || !same(sorted(Object.keys(v)), ['address', 'port', 'transport']) || !['tcp', 'udp'].includes(v.transport) || typeof v.address !== 'string' || !v.address || !integer(v.port) || v.port < 1 || v.port > 65535)
            return null;
        keys.push(JSON.stringify([v.transport, v.address, v.port]));
    }
    return new Set(keys).size === keys.length ? sorted(keys) : null;
};
export function sectionComplete(name, r) {
    if (!object(r) || r.truncated)
        return false;
    if (name === 'firewall')
        return ['active', 'inactive'].includes(r.status) && (!Object.hasOwn(r, 'inbound_policy') || (['allow', 'deny', 'drop', 'reject', 'managed'].includes(r.inbound_policy) && integer(r.inbound_rule_count) && integer(r.inbound_allow_rule_count) && r.inbound_allow_rule_count <= r.inbound_rule_count));
    if (r.status !== 'observed')
        return false;
    if (name === 'ssh')
        return ['yes', 'no', 'prohibit-password', 'without-password', 'forced-commands-only'].includes(r.permit_root_login) && ['yes', 'no'].includes(r.password_authentication) && ['yes', 'no'].includes(r.pubkey_authentication);
    if (name === 'hardening')
        return object(r.sysctl) && Object.entries(SYSCTL).every(([k, values]) => values.includes(r.sysctl[k])) && ([r.apparmor_enabled, r.selinux_enforcing].some(v => v === true) || [r.apparmor_enabled, r.selinux_enforcing].every(bool));
    if (name === 'critical_files')
        return Array.isArray(r.files) && r.files.length === 5 && r.files.every(f => object(f) && typeof f.path === 'string') && same(sorted(r.files.map(f => f.path)), sorted(criticalPaths)) && r.files.every(f => f.status === 'missing' || (f.status === 'observed' && ['mode', 'owner', 'group'].every(k => typeof f[k] === 'string') && bool(f.admitted)));
    if (name === 'updates')
        return integer(r.available_update_count) && integer(r.security_update_count) && r.security_update_count <= r.available_update_count && bool(r.reboot_required) && r.cache_only === true;
    if (name === 'privileged_access')
        return ['non_root_admin_group_member_count', 'authorized_key_file_count', 'unsafe_authorized_key_file_count', 'sudoers_dropin_file_count', 'unsafe_sudoers_metadata_count'].every(k => integer(r[k])) && r.unsafe_authorized_key_file_count <= r.authorized_key_file_count && r.unsafe_sudoers_metadata_count <= r.sudoers_dropin_file_count && object(r.root_authorized_keys) && ['observed', 'missing'].includes(r.root_authorized_keys.status) && bool(r.root_authorized_keys.admitted) && r.direct_sudo_grants_assessed === false && r.key_contents_collected === false && r.sudoers_contents_collected === false;
    if (name === 'listeners' && Object.hasOwn(r, 'expected_endpoints')) {
        const [a, e, u, m] = ['actual_endpoints', 'expected_endpoints', 'unexpected_endpoints', 'missing_endpoints'].map(k => endpointKeys(r[k]));
        return a !== null && e !== null && u !== null && m !== null && integer(r.listener_count) && r.listener_count === a.length && r.unparsed_line_count === 0 && same(u, a.filter(k => !e.includes(k))) && same(m, e.filter(k => !a.includes(k))) && r.process_identifiers_collected === false;
    }
    const fields = { accounts: ['total_account_count', 'uid0_account_count', 'interactive_shell_account_count'], listeners: ['listener_count'], services: ['failed_unit_count'] };
    if (fields[name])
        return fields[name].every(k => integer(r[k])) && (name !== 'services' || (Array.isArray(r.failed_units) && r.failed_units.every(v => typeof v === 'string') && r.failed_units.length === r.failed_unit_count));
    if (name === 'clock')
        return bool(r.ntp_synchronized);
    if (name === 'host_identity')
        return ['hostname', 'kernel', 'architecture'].every(k => typeof r[k] === 'string' && r[k]);
    return false;
}
const commandComplete = c => object(c) && c.status === 'captured' && c.returncode === 0 && !c.stdout_truncated && !c.stderr_truncated;
export function buildPosture(observations) {
    const sections = structuredClone(observations.sections);
    demand(object(sections), 'Observation sections missing');
    for (const [name, r] of Object.entries(sections)) {
        if (!object(r))
            continue;
        const commands = observations.command_evidence?.[name];
        if (object(commands)) {
            if (Object.hasOwn(commands, 'status') && !commandComplete(commands))
                r.status = 'partial';
            for (const c of commands.commands ?? [])
                if (!commandComplete(c))
                    r.status = 'partial';
        }
        if (!sectionComplete(name, r) && ['observed', 'active', 'inactive'].includes(r.status))
            r.status = 'partial';
    }
    return { schema: 'witnessops.local_server_audit.posture.v1', observed_at_utc: observations.observed_at_utc, target: observations.target, profile_id: observations.profile_id, synthetic: observations.synthetic, data_classification: observations.data_classification, sections, declared_exclusions: observations.declared_exclusions, declared_side_effects: observations.declared_side_effects, claim_boundary: 'bounded local posture observations; not a security, compromise, or compliance conclusion' };
}
export function deriveFindings(posture) {
    const s = posture.sections, findings = [];
    const ssh = s.ssh ?? {}, context = ssh.evaluated_context;
    const confirmed = object(context) && context.user === 'root' && context.addr === '127.0.0.1' && Boolean(context.host);
    const vars = { context_label: confirmed ? 'the evaluated root/loopback context' : 'an unconfirmed evaluation context', context_limit: confirmed ? 'Other users, source addresses and SSH Match contexts were not evaluated.' : 'The supplied posture does not record a confirmed root/loopback evaluation context.' };
    const format = v => v.replace(/\{(context_label|context_limit)\}/g, (_, key) => vars[key]);
    function add(key, observed, overrides = {}) {
        const t = { ...text[key], ...overrides };
        findings.push({ finding_id: t.finding_id, severity: t.severity, title: format(t.title), state: t.state, evidence_refs: [t.evidence_ref], observed_value: observed ?? null, recommendation: t.recommendation, claim_limit: format(t.limit) });
    }
    const accounts = s.accounts ?? {};
    if (integer(accounts.uid0_account_count) && accounts.uid0_account_count > 1)
        add('lsa_uid0_multiple', accounts.uid0_account_count);
    const root = String(ssh.permit_root_login ?? 'unknown').toLowerCase(), password = String(ssh.password_authentication ?? 'unknown').toLowerCase();
    if (['yes', 'prohibit-password', 'without-password'].includes(root))
        add('lsa_ssh_root_login', root);
    else if (root === 'unknown')
        add('lsa_ssh_root_login_unknown', ssh.status);
    if (password === 'yes')
        add('lsa_ssh_password_auth', password);
    const firewall = s.firewall ?? {};
    if (firewall.status === 'inactive')
        add('lsa_host_firewall_inactive', firewall.status);
    else if (!['active', 'inactive'].includes(firewall.status))
        add('lsa_host_firewall_unknown', firewall.status);
    if (firewall.status === 'active' && firewall.inbound_policy === 'allow')
        add('lsa_firewall_default_allow', 'allow');
    const listeners = s.listeners ?? {};
    if (listeners.unexpected_endpoints?.length)
        add('lsa_unexpected_listener', listeners.unexpected_endpoints);
    if (listeners.missing_endpoints?.length && Object.hasOwn(listeners, 'expected_endpoints') && sectionComplete('listeners', listeners))
        add('lsa_expected_listener_missing', listeners.missing_endpoints);
    const p = s.privileged_access ?? {}, rootKeys = p.root_authorized_keys ?? {};
    if (p.unsafe_authorized_key_file_count > 0 || (rootKeys.status === 'observed' && rootKeys.admitted === false))
        add('lsa_authorized_keys_metadata', { unsafe_file_count: p.unsafe_authorized_key_file_count ?? null, root_authorized_keys: rootKeys });
    if (rootKeys.status === 'unknown')
        add('lsa_authorized_keys_metadata_unknown', rootKeys);
    if (p.unsafe_sudoers_metadata_count > 0)
        add('lsa_sudoers_dropin_metadata', p.unsafe_sudoers_metadata_count);
    const updates = s.updates ?? {};
    if (integer(updates.security_update_count) && updates.security_update_count > 0)
        add('lsa_security_updates_available', updates.security_update_count);
    else if (integer(updates.available_update_count) && updates.available_update_count > 0)
        add('lsa_updates_available', updates.available_update_count);
    if (updates.reboot_required === true)
        add('lsa_reboot_required', true);
    if (updates.status !== 'observed') {
        if (updates.security_classification === 'unavailable' && updates.command_status === 'captured' && updates.returncode === 0 && integer(updates.available_update_count))
            add('lsa_updates_unknown', Object.fromEntries(['provider', 'command_status', 'returncode', 'security_classification', 'cache_freshness', 'diagnostic_reason'].map(k => [k, updates[k] ?? null])));
        else
            add('lsa_updates_unknown__fallback', updates.status);
    }
    const services = s.services ?? {};
    if (integer(services.failed_unit_count) && services.failed_unit_count > 0)
        add('lsa_failed_services', services.failed_units ?? []);
    if (s.clock?.ntp_synchronized === false)
        add('lsa_clock_unsynchronized', false);
    const critical = s.critical_files?.files ?? [], unsafe = critical.filter(f => object(f) && f.admitted === false && f.status === 'observed');
    if (unsafe.length)
        add('lsa_critical_file_metadata', unsafe);
    for (const state of ['missing', 'unknown']) {
        const records = critical.filter(f => object(f) && f.status === state);
        if (records.length)
            add('critical_file', records, { finding_id: 'lsa_critical_file_' + state, severity: state === 'missing' ? 'medium' : 'informational', title: state === 'missing' ? 'A required critical file was reported missing' : 'Critical-file metadata could not be read', state: state === 'missing' ? 'observed' : 'unresolved' });
    }
    const hard = s.hardening ?? {};
    if (hard.apparmor_enabled !== true && hard.selinux_enforcing !== true)
        add('lsa_mandatory_access_control', { apparmor_enabled: hard.apparmor_enabled ?? null, selinux_enforcing: hard.selinux_enforcing ?? null }, { state: hard.apparmor_enabled === false && hard.selinux_enforcing === false ? 'observed' : 'unresolved' });
    for (const key of Object.keys(SYSCTL))
        if (hard.sysctl?.[key] === '0')
            add('sysctl', '0', { finding_id: 'lsa_sysctl_' + key.replaceAll('.', '_'), title: 'Kernel protection is disabled: ' + key, evidence_ref: 'posture.sections.hardening.sysctl.' + key });
    if (!['yes', 'no'].includes(password))
        add('lsa_ssh_password_auth_unknown', password);
    const severities = ['critical', 'high', 'medium', 'low', 'informational'];
    findings.sort((a, b) => severities.indexOf(a.severity) - severities.indexOf(b.severity) || (a.finding_id < b.finding_id ? -1 : a.finding_id > b.finding_id ? 1 : 0));
    return { schema: 'witnessops.local_server_audit.findings.v1', profile_id: posture.profile_id, target: posture.target, observed_at_utc: posture.observed_at_utc, findings, counts: Object.fromEntries(severities.map(sev => [sev, findings.filter(f => f.severity === sev).length])), claim_boundary: 'deterministic posture findings only; no secure, compromised, or compliant conclusion' };
}
