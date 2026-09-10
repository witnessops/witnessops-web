"use client";
import { useId, useState, useRef, useEffect } from 'react';
import { normalizeAskHostname, rememberAskCheck } from '@/lib/external-exposure/ask-handoff';

type Step = 'offered' | 'hostname' | 'email-choice' | 'email' | 'authorization' | 'dismissed' | 'starting';
/** Structured intake stays outside Ask messages, history and telemetry. */
export function AskFreeCheckCard({ onStepChange, onIntakeChange }: { onStepChange?: (element: HTMLElement) => void; onIntakeChange?: (active: boolean) => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const initiating = useRef(false);
  const id = useId();
  const [step, setStep] = useState<Step>('offered');
  const [hostname, setHostname] = useState(''), [email, setEmail] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    onIntakeChange?.(step !== 'offered' && step !== 'dismissed');
    return () => onIntakeChange?.(false);
  }, [step, onIntakeChange]);
  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    onStepChange?.(element);
    if (step === 'hostname' || step === 'email') element.querySelector('input')?.focus({ preventScroll: true });
  }, [step, onStepChange]);
  const control = 'min-h-11 rounded border border-surface-border px-3 text-sm';
  const input = 'min-h-11 w-full min-w-0 rounded border border-surface-border bg-surface-bg px-3';
  if (step === 'dismissed') return null;
  return <section data-ask-active-step ref={sectionRef} aria-label="Free External Exposure Snapshot" className="my-4 min-w-0 border-t border-surface-border pt-4 text-sm" aria-live="polite">
    <h2 className="font-semibold">Free External Exposure Snapshot</h2>
    {step === 'offered' && <>
      <p className="my-2 text-text-muted">Ten bounded public checks against one hostname. No exploitation or credentials. A snapshot, not a complete security assessment.</p>
      <div className="flex flex-wrap gap-2"><button className={control} onClick={() => setStep('hostname')}>Run free check</button><button className={control} onClick={() => setStep('dismissed')}>Not now</button></div>
    </>}
    {step === 'hostname' && <form className="mt-3 grid gap-3" onSubmit={event => {
      event.preventDefault(); setError('');
      try { setHostname(normalizeAskHostname(hostname)); setStep('email-choice'); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Enter a valid public hostname.'); }
    }}>
      <label htmlFor={id + '-host'}>What public hostname should I check?</label>
      <input id={id + '-host'} aria-label="Public hostname" required maxLength={253} autoCapitalize="none" autoComplete="off" spellCheck={false} placeholder="example.com" className={input} value={hostname} onChange={e => setHostname(e.target.value)} />
      <button className={control} type="submit">Continue</button>
    </form>}
    {step === 'email-choice' && <>
      <p className="my-3 break-words">I’ll use {hostname}. Want to add a work email for an optional follow-up later?</p>
      <div className="flex flex-wrap gap-2"><button className={control} onClick={() => setStep('email')}>Add email</button><button className={control} onClick={() => { setEmail(''); setStep('authorization'); }}>Skip</button></div>
    </>}
    {step === 'email' && <form className="mt-3 grid gap-3" onSubmit={event => { event.preventDefault(); setStep('authorization'); }}>
      <label htmlFor={id + '-email'}>Work email (optional)</label>
      <input id={id + '-email'} type="email" placeholder="name@company.com" maxLength={254} autoComplete="email" className={input} value={email} onChange={e => setEmail(e.target.value)} />
      <p className="text-xs text-text-muted">This is not a chat message. Your email stays local and is not submitted unless you explicitly request follow-up.</p>
      <button className={control} type="submit">Continue</button>
    </form>}
    {step === 'authorization' && <>
      {email && <p className="my-3 break-words">{email.trim()} remains local to this browser session. It will not be submitted by running a check.</p>}
      <p className="my-3 break-words">Confirm that you own {hostname} or are authorized to check it.</p>
      <p className="my-2 text-xs text-text-muted">The handoff expires after 10 minutes. Your authorization starts one bounded check on the next page.</p>
      <button className={control} onClick={() => {
        setError('');
        try {
          if (initiating.current) return;
          const href = rememberAskCheck(window.sessionStorage, hostname, email, true);
          initiating.current = true; setStep('starting');
          window.requestAnimationFrame(() => window.location.assign(href));
        }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'The local handoff could not be saved.'); }
      }}>I’m authorized — run check</button>
    </>}
    {step === 'starting' && <p role="status" className="my-3">Starting the bounded public snapshot for {hostname}…</p>}
    {step !== 'offered' && step !== 'starting' && <button type="button" className="mt-3 min-h-11 text-xs text-text-muted underline underline-offset-4" onClick={() => { setEmail(''); setError(''); setStep('dismissed'); }}>Cancel free check</button>}
    {error && <p role="alert" className="mt-2">{error}</p>}
  </section>;
}
