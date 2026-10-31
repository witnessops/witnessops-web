/** Test-only HTTP composition: actual component + handlers + disposable PostgreSQL.
 * WorkOS provider authentication is replaced at the trusted DI seam, NOT verified here.
 * This file is outside application sources and never imported by a deployable route. */
import { createServer } from 'node:http';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAasrFixtureService } from '../../apps/witnessops-app/src/lib/aasr-fixture/server';
import { createAasrTestDatabase, aasrTestSession, type AasrTestActor, AASR_TEST_USERS } from '../app-foundation/aasr-db';

async function main() {
  if (process.env.NODE_ENV !== 'test') throw new Error('Test harness refuses non-test mode');
  const require = createRequire(import.meta.url);
  const { build } = createRequire(require.resolve('tsx'))('esbuild');
  const result = await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import {AasrFixtureApp} from './apps/witnessops-app/src/components/aasr-fixture'; createRoot(document.getElementById('root')).render(React.createElement(AasrFixtureApp));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outfile:'fixture.js',format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"','process.env':'{}'},nodePaths:[resolve('apps/witnessops-app/node_modules')]});
  const script = result.outputFiles.find((file: {path:string})=>file.path.endsWith('.js')).text;
  const css = readFileSync('packages/ui/tokens/witnessops.css','utf8') + readFileSync('apps/witnessops-app/src/app/globals.css','utf8').replace('@import "@witnessops/ui/tokens/witnessops.css";', '') + `@font-face{font-family:FixtureInter;src:url('/fonts/inter-400.woff2')} :root{--app-font-sans:FixtureInter,sans-serif;--app-font-mono:monospace}` + result.outputFiles.filter((file: {path:string})=>file.path.endsWith('.css')).map((file: {text:string})=>file.text).join('');
  let db = await createAasrTestDatabase();
  const requestContext = new AsyncLocalStorage<AasrTestActor | null>();
  const service = () => createAasrFixtureService({pool:db.pool,origin:'http://127.0.0.1:3036',enabled:()=>true,identity:async()=>{const actor=requestContext.getStore();return actor?aasrTestSession(actor):null;}});
  let handle = service();
  const server=createServer(async(req,res)=>{
    try {
      const url='http://127.0.0.1:3036'+req.url;
      const parsed=new URL(url);
      if (parsed.pathname==='/__test/reset' && req.method==='POST') {
        await db.close(); db=await createAasrTestDatabase(); handle=service(); res.writeHead(204);res.end();return;
      }
      if(parsed.pathname==='/fonts/inter-400.woff2'){res.writeHead(200,{'content-type':'font/woff2'});res.end(readFileSync('apps/witnessops-web/public/fonts/inter-400.woff2'));return;}
      if(parsed.pathname==='/fixture.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(script);return;}
      if(parsed.pathname==='/fixture.css'){res.writeHead(200,{'content-type':'text/css'});res.end(css);return;}
      if(parsed.pathname==='/') {res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"><title>AASR HTTP fixture acceptance</title></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');return;}
      const chunks:Buffer[]=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>2048){res.writeHead(413);res.end();return;}chunks.push(Buffer.from(chunk));}
      const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);
      const rawActor=(req.headers.cookie??'').split(';').map(x=>x.trim()).find(x=>x.startsWith('aasr_test_session='))?.split('=')[1];
      const actor=rawActor&&Object.hasOwn(AASR_TEST_USERS,rawActor)?rawActor as AasrTestActor:null;
      const request=new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method??'GET')?{body:Buffer.concat(chunks)}:{})});
      const response=await requestContext.run(actor,()=>handle(request));
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    }catch {res.writeHead(500);res.end('Test harness failure');}
  });
  await new Promise<void>(resolve=>server.listen(3036,'127.0.0.1',resolve));
  let closing=false;
  async function close(){if(closing)return;closing=true;server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await db.close();process.exit(0);}
  process.on('SIGTERM',()=>void close());process.on('SIGINT',()=>void close());
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
