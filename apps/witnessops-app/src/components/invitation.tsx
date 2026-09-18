'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { logout } from '../app/actions/logout';
type Preview={id:string;workspaceId:string;workspaceName:string;inviter?:string;role:string;revision:number;state:string;expiresAt:string};
export function Invitation({id}:{id:string}) {
 const [preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(''),[login,setLogin]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch(`/api/invitations?id=${encodeURIComponent(id)}`).then(async response=>{if(response.status===401){setLogin(true);return;}const data=await response.json();if(!response.ok)throw new Error(data.error);setPreview(data);}).catch(cause=>setError(cause.message));},[id]);
 async function accept(){if(!preview||busy)return;setBusy(true);setError('');try{const response=await fetch('/api/invitations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,revision:preview.revision,role:preview.role})});const data=await response.json();if(!response.ok)throw new Error(data.error);setPreview(data);}catch(cause){setError(cause instanceof Error?cause.message:'Acceptance failed.');}finally{setBusy(false);}}
 const target=encodeURIComponent(`/invitations/${id}`);
 return <main className="welcome"><h1>Workspace invitation</h1>{error&&<p role="alert" className="error">{error}</p>}{login?<><p>Sign in with the invited email to preview the workspace and role. Signing in does not accept the invitation.</p><div className="actions"><a className="button" href={`/login?returnTo=${target}`}>Sign in</a><a className="button secondary" href={`/signup?returnTo=${target}`}>Create account</a></div></>:preview?<><h2>{preview.workspaceName}</h2><p>Role: {preview.role}</p><p>Invited by {preview.inviter||'Workspace Owner'}. Expires {new Date(preview.expiresAt).toLocaleString()}.</p><p>Joining does not authorize collection, grant CLI credentials or start billing.</p>{preview.state==='accepted'?<><p role="status">Invitation accepted.</p><Link className="button" href="/">Open your workspaces</Link></>:<button className="button" disabled={busy} onClick={()=>void accept()}>Accept invitation</button>}</>:!error?<p role="status">Loading invitation…</p>:null}{!login&&<form action={logout}><button className="button secondary">Sign out / switch account</button></form>}</main>;
}
