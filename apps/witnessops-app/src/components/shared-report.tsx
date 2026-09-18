'use client';
import { useEffect, useState } from 'react';
import { RecipientReader } from './recipient-reader';
import type { RecipientReport } from '../lib/share-projection';
export function SharedReport() {
 const [data,setData]=useState<{snapshot:RecipientReport;digest:string;expiresAt:string;publishedAt?:string|null}|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  let active=true,controller:AbortController|undefined,lastToken='';
  const clear=()=>{controller?.abort();setData(null);};
  const load=async()=>{
   controller?.abort();if(document.hidden){setData(null);return;}
   const token=location.hash.slice(1);if(token!==lastToken){setData(null);setError('');lastToken=token;}
   const current=new AbortController();controller=current;
   try{
    const response=await fetch('/api/shared-report',{method:'POST',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),signal:current.signal});
    if(!response.ok)throw new Error('Unavailable');
    const result=await response.json();if(active&&!current.signal.aborted&&controller===current){setData(result);setError('');}
   }catch{if(active&&!current.signal.aborted&&controller===current){setData(null);setError('This shared report is unavailable, expired or revoked.');}}
  };
  void load();const interval=setInterval(()=>void load(),30000);
  const visibility=()=>{if(document.hidden)clear();else void load();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',clear);window.addEventListener('pageshow',visibility);window.addEventListener('hashchange',visibility);
  return()=>{active=false;controller?.abort();clearInterval(interval);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',clear);window.removeEventListener('pageshow',visibility);window.removeEventListener('hashchange',visibility);};
 },[]);
 return <main className="shared-report">{error?<p role="alert">{error}</p>:data?<RecipientReader model={data.snapshot} digest={data.digest} publishedAt={data.publishedAt} expiresAt={data.expiresAt}/>:<><h1>Shared report</h1><p role="status">Checking link access…</p></>}</main>;
}
