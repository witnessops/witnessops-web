'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
type Context = { user: { id: string; displayName: string | null }; workspaces: { id: string; name: string; role: 'owner' | 'viewer' }[] };
export function CliAuthorization() {
  const [context, setContext] = useState<Context | null>(null), [workspace, setWorkspace] = useState('');
  const [code, setCode] = useState(''), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [signIn, setSignIn] = useState(false), [done, setDone] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/cli/authorize', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (response.status === 401) { setSignIn(true); return; }
      if (!response.ok) throw new Error();
      const data: Context = await response.json(); setContext(data);
      if (data.workspaces.length === 1) setWorkspace(data.workspaces[0].id);
    }).catch(() => { if (!controller.signal.aborted) setError('CLI sign-in is unavailable. Open your workspace, then reload this page.'); });
    return () => controller.abort();
  }, []);
  async function submit(action: 'authorize' | 'deny') {
    if (!context || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/cli/authorize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, workspaceId: workspace, displayedUserId: context.user.id, action }) });
      const result = await response.json();
      if (!response.ok) {
        setError(result.code === 'identity_changed' ? 'Your signed-in account changed. Reload this page before authorizing.' : 'This request could not be authorized. Check the code and workspace, or start wops auth login again.'); return;
      }
      setDone(action === 'deny' ? 'CLI sign-in declined. Return to your terminal.' : 'CLI authorized. Return to your terminal to finish sign-in.');
    } catch { setError('Connection failed. Check your terminal before trying again; the request may already be authorized.'); }
    finally { setBusy(false); }
  }
  const selected = context?.workspaces.find(item => item.id === workspace);
  return <section className="narrow"><p className="eyebrow">WitnessOps CLI</p><h1>Authorize WitnessOps CLI</h1>
    <p>Authorize only a sign-in you started with <code>wops auth login</code> in your own terminal. Never enter a code sent by someone else.</p>
    <p>This grants only your CLI session identity/status and sign-out. It does not grant server checks, uploads or signing authority.</p>
    {done ? <p role="status">{done}</p> : signIn ? <Link className="button" href="/cli/login">Sign in to continue</Link> : context ? <form className="asset-form" onSubmit={event => { event.preventDefault(); if (confirmed && workspace) void submit('authorize'); }}>
      <p>Signed in as: {context.user.displayName || 'WitnessOps account'}</p>
      {context.workspaces.length ? <><label htmlFor="cli-workspace">Workspace</label><select id="cli-workspace" value={workspace} disabled={busy} onChange={event => { setWorkspace(event.target.value); setConfirmed(false); }}><option value="" disabled>Choose workspace</option>{context.workspaces.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select>{selected && <p>Role: {selected.role === 'owner' ? 'Owner' : 'Viewer'}</p>}</> : <p>No active workspace is available. <Link href="/">Open WitnessOps</Link> to create or select one, then return here.</p>}
      <label htmlFor="cli-code">Code from your terminal</label><input id="cli-code" value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setConfirmed(false); }} autoComplete="off" spellCheck={false} placeholder="ABCD-EF12-3456" maxLength={14} pattern="[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}" required disabled={busy} />
      <label className="authorization"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />I started this CLI sign-in and confirm the workspace and role shown above.</label>
      <div className="actions"><button className="button" disabled={busy || !confirmed || !workspace}>{busy ? 'Authorizing…' : 'Authorize CLI'}</button><button type="button" className="button secondary" disabled={busy || !/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)} onClick={() => void submit('deny')}>Decline</button></div>
    </form> : !error && <p role="status">Loading sign-in context…</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
