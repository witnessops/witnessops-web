'use client';
import styles from './share-password.module.css';
import {useRef,useState} from 'react';
type Result={version:number;passwordProtected:boolean;expiresAt:string};
export function SharePasswordControl({id,version,protected:protectedShare,request,onSaved,onBusyChange,disabled=false}:{id:string;version:number;protected:boolean;request:(input:unknown)=>Promise<unknown>;onSaved:(value:Result)=>Promise<void>;onBusyChange?:(busy:boolean)=>void;disabled?:boolean}) {
 const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);const lock=useRef(false);
 return <section className={styles.control} aria-label="Share password"><p>{protectedShare?'Link and password required.':'Currently accessible with the link alone.'} Changing the password ends earlier unlock sessions. Downloaded copies cannot be recalled.</p>
 <label>New report password<input type="password" autoComplete="new-password" minLength={12} maxLength={256} value={password} disabled={disabled||busy} onChange={e=>{setPassword(e.target.value);setSaved(false);}}/></label>
 <label>Repeat report password<input type="password" autoComplete="new-password" maxLength={256} value={confirmation} disabled={disabled||busy} onChange={e=>setConfirmation(e.target.value)}/></label>
 <p>Use a unique passphrase (at least 12 characters). Send it separately; WitnessOps does not include it in the report email.</p>
 <button type="button" className="button secondary" disabled={disabled||busy||password.length<12||password!==confirmation} onClick={()=>void(async()=>{
  if(lock.current)return;lock.current=true;setBusy(true);onBusyChange?.(true);setError('');try{const result=await request({action:'password',id,version,password}) as Result;await onSaved(result);setSaved(true);}catch(cause){setError(cause instanceof Error?cause.message:'Password update did not complete. Refresh sharing settings.');}finally{setPassword('');setConfirmation('');setBusy(false);onBusyChange?.(false);lock.current=false;}
 })()}>{protectedShare?'Replace password':'Require password'}</button>
 {error&&<p role="alert">{error}</p>}{saved&&<p role="status">Password protection saved. Share the password separately.</p>}
 </section>;
}
