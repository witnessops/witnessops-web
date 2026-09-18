'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { HELP_PAGES, type HelpAnswer, type HelpPage } from '../lib/help-context';
import { publicContactMailto } from '../../../witnessops-web/src/lib/public-contact';
import { acquireBodyScrollLock } from '../../../witnessops-web/src/lib/body-scroll-lock';
import { useConversationFollow } from '../../../witnessops-web/src/components/docs-assistant/use-conversation-follow';
export function AppHelp({page}:{page:HelpPage}) {
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),input=useRef<HTMLTextAreaElement>(null),request=useRef<AbortController|null>(null),history=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[turns,setTurns]=useState<{question:string;answer:HelpAnswer}[]>([]);
 const follow=useConversationFollow(history,turns);
 useEffect(()=>()=>{request.current?.abort();},[]);
 useEffect(()=>{if(open)return acquireBodyScrollLock();},[open]);
 function close(){request.current?.abort();setBusy(false);setOpen(false);dialog.current?.close();trigger.current?.focus();}
 async function submit(event:FormEvent){event.preventDefault();if(busy||!question.trim())return;const controller=new AbortController();request.current=controller;setBusy(true);setError('');const asked=question.trim();
  try { const response=await fetch('/api/help',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:asked,page}),signal:controller.signal,cache:'no-store'});const answer=await response.json();if(controller.signal.aborted)return;if(!response.ok)throw new Error(answer.error||'Guidance unavailable.');setTurns(old=>[...old,{question:asked,answer}].slice(-6));setQuestion(''); }
  catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'Guidance unavailable.');}finally{if(!controller.signal.aborted)setBusy(false);}
 }
 return <><button type="button" className="button secondary app-help-trigger" ref={trigger} onClick={()=>{setOpen(true);dialog.current?.showModal();input.current?.focus();}}>Help</button>
 <dialog ref={dialog} className="app-help-panel" aria-labelledby="app-help-title" onCancel={event=>{event.preventDefault();close();}}>
 <header><div><h2 id="app-help-title">Ask WitnessOps</h2><p>Help with {HELP_PAGES[page].label}</p></div><button type="button" className="button secondary" onClick={close}>Close Help</button></header>
 <p className="quiet">Documentation guidance only. Only your typed question and this page category are sent to the AI provider. No report, workspace, member or target details are attached. Do not enter secrets.</p>
 <nav aria-label="Help resources"><a href="https://witnessops.com/docs" target="_blank" rel="noopener noreferrer">Documentation ↗</a><a href={publicContactMailto('WitnessOps — App help')}>Ask a person</a></nav>
 <div className="app-help-history" ref={history} aria-live="polite" aria-busy={busy}>
 {turns.map((turn,i)=><section key={i} data-ask-latest={i===turns.length-1?true:undefined}><h3>{turn.question}</h3>{turn.answer.facts.map((text,j)=><p key={j}>{text}</p>)}{turn.answer.inference.length>0&&<><h4>Inference, not a documented fact</h4>{turn.answer.inference.map((text,j)=><p key={j}>{text}</p>)}</>}{!turn.answer.facts.length&&<p>{turn.answer.reason||'The documentation does not establish an answer. Ask a person rather than assuming this is supported.'}</p>}{turn.answer.limits.length>0&&<><h4>Not established</h4><ul>{turn.answer.limits.map((text,j)=><li key={j}>{text}</li>)}</ul></>}{turn.answer.sources.length>0&&<><h4>Sources</h4><ul>{turn.answer.sources.map((source,j)=><li key={j}>{source.url?<a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>:source.title}</li>)}</ul></>}</section>)}
 {busy&&<p role="status">Looking in the documentation…</p>}{error&&<p role="alert">{error}</p>}
 </div>
 {follow.newReply&&<button type="button" onClick={follow.resume}>New reply ↓</button>}
 <div className="app-help-suggestions">{HELP_PAGES[page].questions.map(text=><button type="button" key={text} disabled={busy} onClick={()=>{setQuestion(text);input.current?.focus();}}>{text}</button>)}</div>
 <form onSubmit={submit}><label>Ask a documentation question<textarea ref={input} value={question} maxLength={1800} disabled={busy} onChange={event=>setQuestion(event.target.value)}/></label><div className="actions"><button className="button" disabled={!open||busy||!question.trim()}>Ask</button><button type="button" className="button secondary" disabled={busy} onClick={()=>{setTurns([]);setQuestion('');setError('');input.current?.focus();}}>Clear conversation</button></div></form>
 <p className="quiet">Each question is answered independently. This panel cannot send invitations, publish reports, change billing or run checks. Conversation stays in this page’s memory and clears when you switch workspaces or reload.</p>
 </dialog></>;
}
