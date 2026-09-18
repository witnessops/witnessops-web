'use client';
import { useEffect, useRef, useState } from 'react';
import { RecipientReader } from './recipient-reader';
import { reportTitle, type RecipientReport } from '../lib/share-projection';
type Preview = {
    id: string;
    token: string;
    digest: string;
    snapshot: RecipientReport;
    expiresAt: string;
    canPublish: boolean;
};
type LinkRow = {
    id: string;
    state: string;
    expiresAt: string;
};
export function ReportShare({ workspaceId, runId, role }: {
    workspaceId: string;
    runId: string;
    role: string;
}) {
    const [open, setOpen] = useState(false), [preview, setPreview] = useState<Preview | null>(null), [links, setLinks] = useState<LinkRow[]>([]), [confirmed, setConfirmed] = useState(false), [url, setUrl] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [copied, setCopied] = useState(false);
    const [name, setName] = useState('');
    const lock = useRef(false), heading = useRef<HTMLHeadingElement>(null), trigger = useRef<HTMLButtonElement>(null);
    useEffect(() => { if (open)
        heading.current?.focus(); }, [open]);
    async function request(input: unknown) { const response = await fetch('/api/shares', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-WitnessOps-Workspace': workspaceId }, body: JSON.stringify(input) }); const value = await response.json(); if (!response.ok)
        throw new Error(value.error || 'Sharing failed.'); return value; }
    async function act(action: () => Promise<void>) { if (lock.current)
        return; lock.current = true; setBusy(true); setError(''); try {
        await action();
    }
    catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Sharing failed.');
    }
    finally {
        lock.current = false;
        setBusy(false);
    } }
    const refresh = async () => setLinks(await request({ action: 'list', runId }));
    if (role === 'viewer')
        return null;
    return <section className="report-sharing"><button ref={trigger} className="button secondary" disabled={busy} aria-expanded={open} onClick={() => void act(async () => { setOpen(true); setPreview(null); setConfirmed(false); setUrl(''); setCopied(false); await refresh(); const next = await request({ action: 'preview', runId }); setPreview(next); setName(reportTitle(next.snapshot)); })}>Share report</button>
 {error && <p role="alert" className="error">{error}</p>}{open && <section className="share-preview" aria-label="Recipient preview"><div className="page-heading"><h2 ref={heading} tabIndex={-1}>Recipient preview</h2><button className="button secondary" disabled={busy} onClick={() => { setOpen(false); setPreview(null); setUrl(''); trigger.current?.focus(); }}>Close preview</button></div>
 <p>Anyone with the link can read. No account required. This does not grant workspace membership.</p><p>Includes the subject, observation time, findings, material unknowns, method and limitations. Raw attachments, detailed observations, member emails and internal identifiers are excluded. Check the exact preview before publishing.</p>
 {preview && <><label htmlFor="report-name">Report name</label><input id="report-name" value={name} maxLength={120} disabled={busy} onChange={event => { setName(event.target.value); setConfirmed(false); }}/><p className="quiet">A publisher-supplied name, not a verified assertion. Do not include confidential information. Changing it requires a new preview; published links stay unchanged.</p><button className="button secondary" disabled={busy || !name.trim()} onClick={() => void act(async () => { const next = await request({ action: 'preview', runId, name }); setPreview(next); setName(reportTitle(next.snapshot)); setConfirmed(false); setUrl(''); setCopied(false); })}>Update recipient preview</button><p>Expires {new Date(preview.expiresAt).toLocaleString()}. Later checks will not update this revision. Downloaded copies cannot be recalled.</p>
 {preview.canPublish && !url ? <><label className="authorization"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)}/>I reviewed the included information and approve access for anyone with the link.</label><button className="button" disabled={busy || !confirmed || name !== reportTitle(preview.snapshot)} onClick={() => void act(async () => { await request({ action: 'publish', id: preview.id, token: preview.token, digest: preview.digest, audience: 'anyone_with_link' }); setUrl(`${location.origin}/s#${preview.token}`); await refresh(); })}>Publish link</button></> : !url ? <p>Only an Owner can publish or revoke links.</p> : null}
 {url && <div className="asset-form"><label htmlFor="published-share">Published link</label><input id="published-share" value={url} readOnly/><button className="button secondary" onClick={() => void act(async () => { await navigator.clipboard.writeText(url); setCopied(true); })}>Copy link</button>{copied && <p role="status">Link copied.</p>}</div>}
 <details open><summary>Inspect recipient report</summary><RecipientReader model={preview.snapshot} digest={preview.digest} expiresAt={preview.expiresAt} preview/></details></>}
 <h3>Published revisions</h3>{links.length ? links.map(link => <div className="member-row" key={link.id}><span>{link.state} · expires {new Date(link.expiresAt).toLocaleString()}</span>{role === 'owner' && link.state === 'published' && <button className="button secondary" disabled={busy} onClick={() => void act(async () => { await request({ action: 'revoke', id: link.id }); if (link.id === preview?.id) {
            setUrl('');
            setPreview(null);
        } await refresh(); })}>Revoke link</button>}</div>) : <p>No published revisions.</p>}
 </section>}</section>;
}
