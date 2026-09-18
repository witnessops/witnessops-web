'use client';
import { useRef, useState } from 'react';
type Access = {id:string;state:string;version:number;expiresAt:string};
type Draft = {id:string;digest:string;state:string;message:{from:string;replyTo:string;to:string;subject:string;text:string}};
type Delivery = {id:string;recipient:string;state:string;provider:string|null};
const status = (state:string) => ({draft:'Preview only — not sent',accepted:'Provider accepted — delivery not confirmed',file_saved:'Saved locally — no email delivered',unknown:'Outcome unknown — may have been sent',sending:'Outcome unknown — may have been sent'}[state]??state);
export function ShareDelivery({link,token:initialToken,request,onChange}:{link:Access;token?:string;request:(input:unknown)=>Promise<unknown>;onChange:(value:{token?:string;expiresAt:string})=>Promise<void>}) {
 const [token,setToken]=useState(initialToken),[expiry,setExpiry]=useState(link.expiresAt.slice(0,16)),[email,setEmail]=useState(''),[draft,setDraft]=useState<Draft|null>(null),[history,setHistory]=useState<Delivery[]>([]),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false);
 async function act(fn:()=>Promise<void>) {if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await fn();}catch(cause){setError(cause instanceof Error ? cause.message : 'Request did not complete. Close and reopen sharing before retrying; an email may already have been sent.');}finally{lock.current=false;setBusy(false);}}
 async function change(rotate:boolean) {
  const next=await request({action:'access',id:link.id,version:link.version,expiresAt:new Date(expiry+'Z').toISOString(),rotate}) as {token?:string;expiresAt:string};
  if(next.token)setToken(next.token);setDraft(null);setConfirmed(false);setNotice(rotate?'Old link invalidated. Copy or email the new link.':'Expiry updated; the report revision is unchanged.');await onChange(next);
 }
 return <details className="share-delivery"><summary>Manage link and email</summary>
  <p>Anyone with the link can read. Rotating stops the old link immediately. Expiry changes do not recall downloads or change the report.</p>
  <label>Expiry (UTC)<input type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)} disabled={busy}/></label>
  <button className="button secondary" disabled={busy} onClick={()=>void act(()=>change(false))}>Save expiry</button>
  <button className="button secondary" disabled={busy} onClick={()=>void act(()=>change(true))}>Rotate link — invalidate old link</button>
  {token ? <><label>Current access link<input readOnly value={`${location.origin}/s#${token}`}/></label><button className="button secondary" disabled={busy} onClick={()=>void act(async()=>{await navigator.clipboard.writeText(`${location.origin}/s#${token}`);setNotice('Link copied.');})}>Copy current link</button>
   <label>Recipient email<input type="email" value={email} disabled={busy} onChange={e=>{setEmail(e.target.value);setDraft(null);setConfirmed(false);}}/></label>
   <button className="button secondary" disabled={busy||!email.trim()} onClick={()=>void act(async()=>{setDraft(await request({action:'email-preview',id:link.id,token,email,requestId:crypto.randomUUID()}) as Draft);setConfirmed(false);})}>{draft&&draft.state!=='draft'?'Prepare another email (may duplicate)':'Preview email'}</button>
   {draft&&<section aria-label="Email preview"><p>From: {draft.message.from}</p><p>Reply to: {draft.message.replyTo}</p><p>To: {draft.message.to}</p><h4>{draft.message.subject}</h4><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{draft.message.text}</pre><p>{status(draft.state)}</p>
    {draft.state==='draft'&&<><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/>I reviewed this recipient and email and want to send this access link.</label><button className="button" disabled={busy||!confirmed} onClick={()=>void act(async()=>{
     // Mark unknown before awaiting: a lost response must never appear unsent.
     setDraft({...draft,state:'unknown'});setConfirmed(false);
     await request({action:'email-send',id:draft.id,token,digest:draft.digest,confirmed:true});
     const rows=await request({action:'email-history',id:link.id}) as Delivery[];setHistory(rows);setDraft({...draft,state:rows.find((r:Delivery)=>r.id===draft.id)?.state??'unknown'});
    })}>Send reviewed email</button></>}
   </section>}
  </>:<p>The original secret is not stored. Rotate the link to obtain a new copy before emailing; existing recipients will lose the old link.</p>}
  <button className="button secondary" disabled={busy} onClick={()=>void act(async()=>{setHistory(await request({action:'email-history',id:link.id}) as Delivery[]);})}>Refresh email history</button>
  <ul>{history.map(row=><li key={row.id}>{row.recipient} — {status(row.state)}</li>)}</ul>
  <p>No reader identity or read receipt is inferred. An unknown outcome requires an explicit new preview to resend and may result in a duplicate.</p>
  {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 </details>;
}
