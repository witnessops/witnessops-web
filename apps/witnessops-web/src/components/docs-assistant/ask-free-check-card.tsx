"use client";
import { useId, useState } from 'react';
import { rememberAskCheck } from '@/lib/external-exposure/ask-handoff';

export function AskFreeCheckCard() {
  const id = useId();
  const [hostname, setHostname] = useState(''), [email, setEmail] = useState('');
  const [authorized, setAuthorized] = useState(false), [error, setError] = useState('');
  return <section aria-label="Free External Exposure Snapshot" className="my-4 min-w-0 rounded-lg border border-surface-border p-4 text-sm">
    <h2 className="font-semibold">Free External Exposure Snapshot</h2>
    <p className="my-2 text-text-muted">Run 10 bounded public checks against one hostname. No exploitation, credentials or account required. A snapshot, not a complete security assessment.</p>
    <form className="flex min-w-0 flex-col gap-3" onSubmit={event => {
      event.preventDefault(); setError('');
      try { window.location.assign(rememberAskCheck(window.sessionStorage, hostname, email, authorized)); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'The local handoff could not be saved. Open the free check directly instead.'); }
    }}>
      <label htmlFor={id + '-host'}>Public hostname</label>
      <input id={id + '-host'} required maxLength={253} autoCapitalize="none" autoComplete="off" spellCheck={false} placeholder="example.com" className="min-h-11 w-full min-w-0 rounded border border-surface-border bg-surface-bg px-3" value={hostname} onChange={e => setHostname(e.target.value)} />
      <label htmlFor={id + '-email'}>Work email (optional)</label>
      <input id={id + '-email'} type="email" maxLength={254} autoComplete="email" className="min-h-11 w-full min-w-0 rounded border border-surface-border bg-surface-bg px-3" value={email} onChange={e => setEmail(e.target.value)} />
      <p className="text-xs text-text-muted">Email stays in this browser session for up to 10 minutes, only to prefill a follow-up you explicitly request. It is not sent to chat or submitted by running a check.</p>
      <label className="flex items-start gap-2"><input type="checkbox" required checked={authorized} onChange={e => setAuthorized(e.target.checked)} className="mt-1 shrink-0" />I own this hostname or am authorized to check it.</label>
      <button type="submit" className="min-h-11 rounded border border-surface-border px-3 font-semibold">Run free check</button>
      {error && <p role="alert">{error}</p>}
    </form>
    <a href="/check" className="mt-3 inline-block underline">Open free check</a>
  </section>;
}
