import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {RECOMMENDED_PROFILE,type Run} from '../../apps/witnessops-app/src/lib/model';
import {savedRunReport} from '../../apps/witnessops-app/src/lib/report-model';
import {recipientReport} from '../../apps/witnessops-app/src/lib/share-projection';
import {canonicalSource} from '../../apps/witnessops-app/src/lib/source-digest';
const snapshot=JSON.parse(readFileSync(resolve('tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json'),'utf8'));
const run:Run={id:'run-fixture',assetId:'asset-fixture',createdAt:snapshot.finished_at,profile:structuredClone(RECOMMENDED_PROFILE),snapshot,sourceDigest:createHash('sha256').update(canonicalSource(snapshot)).digest('hex')};
const safe=recipientReport(savedRunReport(run),'Named specimen');

test('reporting-host middleware excludes customer routes, callbacks and cookies',async({request})=>{
 const headers={host:'specimen.proof.example.test',cookie:'customer-cookie=ignored'};
 for(const path of ['/login','/signup','/callback','/reports','/api/workspace','/api/shares','/api/billing','/api/billing/webhook']){
  const response=await request.get(path,{headers,maxRedirects:0});expect(response.status(),path).toBe(404);expect(response.headers()['set-cookie']).toBeUndefined();expect(response.headers()['location']).toBeUndefined();
 }
 const response=await request.get('/',{headers});expect(response.status()).toBe(200);expect(response.headers()['set-cookie']).toBeUndefined();expect(response.headers()['cache-control']).toContain('no-store');expect(await response.text()).toContain('Checking link access');
 for(const host of ['proof.example.test','app.proof.example.test','nested.specimen.proof.example.test'])expect((await request.get('/',{headers:{host}})).status()).toBe(404);
});
for(const width of [1440,390])test(`named host reader retains secret and avoids customer authentication ${width}`,async({page,baseURL},info)=>{
 await page.setViewportSize({width,height:900});const host='specimen.proof.example.test',origin='https://'+host,token='a'.repeat(43);let revoked=false;
 // Local routing simulation only; real wildcard DNS/TLS remains an activation check.
 await page.route(origin+'/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/shared-report'){
   const body=route.request().postDataJSON();expect(body.token).toBe(token);
   return route.fulfill(revoked?{status:404,json:{error:'Shared report unavailable.'}}:{json:{snapshot:safe,digest:'d'.repeat(64),expiresAt:new Date(Date.now()+86400000).toISOString()}});
  }
  expect(url.pathname==='/'||url.pathname.startsWith('/_next/')||url.pathname.startsWith('/__nextjs_font/')||url.pathname==='/favicon.ico'||/^\/apple-touch-icon(?:-precomposed)?\.png$/.test(url.pathname),url.pathname).toBe(true);
  const response=await route.fetch({url:baseURL+url.pathname+url.search,headers:{...route.request().headers(),host},maxRedirects:0});return route.fulfill({response});
 });
 await page.goto(origin+'/#'+token);await expect(page.getByRole('heading',{name:'Named specimen'})).toBeVisible();await page.getByRole('button',{name:'Findings',exact:true}).click();expect(new URL(page.url()).hash).toBe('#'+token);
 await expect(page.getByRole('link',{name:'Run your own check'})).toHaveAttribute('href',baseURL+'/signup');
 await page.screenshot({path:info.outputPath(`named-report-${width}.png`)});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.reload();await expect(page.getByRole('heading',{name:'Named specimen'})).toBeVisible();revoked=true;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(page.locator('main').getByRole('alert')).toContainText('unavailable');
});

test('creator previews the reporting name and publishes the server-selected link',async({page})=>{
 const workspace={id:'workspace',name:'Workspace',slug:'workspace',role:'owner',members:[],assets:[],runs:[run]};let name='r-generated',published=false;
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;if(path==='/api/workspace')return route.fulfill({json:{user:{id:'owner'},workspaces:[workspace],workspace}});if(path==='/api/feedback')return route.fulfill({json:[]});if(path==='/api/events')return route.fulfill({json:{recorded:true}});
  expect(path).toBe('/api/shares');const body=route.request().postDataJSON();
  if(body.action==='list')return route.fulfill({json:[]});
  if(body.action==='preview'){if(body.routingName)name=body.routingName;return route.fulfill({json:{id:'share',name,reportingEnabled:true,linkBase:`https://${name}.proof.example.test/`,token:'a'.repeat(43),digest:'digest',snapshot:safe,version:1,passwordProtected:false,canPublish:true,expiresAt:new Date(Date.now()+86400000).toISOString()}});}
  if(body.action==='publish'){published=true;return route.fulfill({json:{linkBase:`https://${name}.proof.example.test/`}});}throw new Error(body.action);
 });
 await page.goto('/reports/'+run.id);await page.getByRole('button',{name:'Share report',exact:true}).click();const panel=page.getByRole('region',{name:'Recipient preview'});
 await panel.getByLabel('Reporting name (optional)').fill('customer-review');await panel.getByRole('checkbox').check();await expect(panel.getByRole('button',{name:'Publish link',exact:true})).toBeDisabled();
 await panel.getByRole('button',{name:'Update recipient preview'}).click();expect(published).toBe(false);await expect(panel).toContainText('https://customer-review.proof.example.test/');await panel.getByLabel('Reporting name (optional)').fill('');await panel.getByRole('checkbox').check();await expect(panel.getByRole('button',{name:'Publish link',exact:true})).toBeDisabled();await panel.getByLabel('Reporting name (optional)').fill('customer-review');await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Publish link',exact:true}).click();await expect(panel.getByLabel('Published link')).toHaveValue('https://customer-review.proof.example.test/#'+'a'.repeat(43));
});
