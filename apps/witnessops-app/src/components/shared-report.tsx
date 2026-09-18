'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './share-password.module.css';
import { RecipientReader } from './recipient-reader';
import type { RecipientReport } from '../lib/share-projection';
export function SharedReport() {
 const [data,setData]=useState<{snapshot:RecipientReport;digest:string;expiresAt:string;publishedAt?:string|null;passwordProtected?:boolean}|null>(null),[error,setError]=useState('');
 const [challenge,setChallenge]=useState(false),[password,setPassword]=useState(''),[unlock,setUnlock]=useState<{token:string;credential:string}|null>(null),[busy,setBusy]=useState(false);const submitting=useRef(false),main=useRef<HTMLElement>(null);
 const hasData=Boolean(data);
 useEffect(()=>{if(hasData){const title=main.current?.querySelector('h1');if(title){title.tabIndex=-1;title.focus();}}},[hasData]);
 useEffect(()=>{
  let active=true,controller:AbortController|undefined,lastToken='';
  const clear=()=>{controller?.abort();setData(null);};
  const load=async()=>{
   controller?.abort();if(document.hidden){setData(null);return;}
   const token=location.hash.slice(1);if(token!==lastToken){setData(null);setError('');setChallenge(false);lastToken=token;}
   const current=new AbortController();controller=current;
   try{
    const response=await fetch('/api/shared-report',{method:'POST',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,...(unlock?.token===token?{unlock:unlock.credential}:{})}),signal:current.signal});
    if(!response.ok){const failure=await response.json();if(active&&!current.signal.aborted&&controller===current&&failure.passwordRequired){setData(null);setChallenge(true);setError(failure.error);return;}throw new Error('Unavailable');}
    const result=await response.json();if(active&&!current.signal.aborted&&controller===current){setData(result);setError('');setChallenge(false);}
   }catch{if(active&&!current.signal.aborted&&controller===current){setData(null);setChallenge(false);setError('This shared report is unavailable, expired or revoked.');}}
  };
  void load();const interval=setInterval(()=>void load(),30000);
  const visibility=()=>{if(document.hidden)clear();else void load();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',clear);window.addEventListener('pageshow',visibility);const changed=()=>{setUnlock(null);setPassword('');visibility();};window.addEventListener('hashchange',changed);
  return()=>{active=false;controller?.abort();clearInterval(interval);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',clear);window.removeEventListener('pageshow',visibility);window.removeEventListener('hashchange',changed);};
 },[unlock]);
 async function submit() {
  if(submitting.current)return;submitting.current=true;setBusy(true);setError('');const token=location.hash.slice(1),secret=password;setPassword('');
  try{const response=await fetch('/api/shared-report',{method:'POST',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'unlock',token,password:secret})});const result=await response.json();
   if(location.hash.slice(1)!==token)return;
   if(response.ok)setUnlock({token,credential:result.unlock});else {setChallenge(Boolean(result.passwordRequired));setError(result.error||'Report unavailable.');}
  }catch{if(location.hash.slice(1)===token)setError('Password request did not complete. Try again.');}finally{submitting.current=false;setBusy(false);}
 }
 return <main ref={main} className="shared-report">{challenge?<section className={styles.unlock} aria-label="Unlock shared report"><h1>Password required</h1><p>Ask the sender for the separate password. The link is also required. This does not sign you into a workspace.</p><form onSubmit={event=>{event.preventDefault();void submit();}}><label>Report password<input autoFocus type="password" autoComplete="current-password" maxLength={256} value={password} disabled={busy} onChange={event=>setPassword(event.target.value)}/></label><button className="button" disabled={busy||!password}>Unlock report</button></form><p>Unlock lasts up to 30 minutes in this tab. Reloading requires the password again.</p>{error&&<p role="alert">{error}</p>}</section>:error?<p role="alert">{error}</p>:data?<RecipientReader model={data.snapshot} digest={data.digest} publishedAt={data.publishedAt} expiresAt={data.expiresAt} passwordProtected={data.passwordProtected}/>:<><h1>Shared report</h1><p role="status">Checking link access…</p></>}</main>;
}
