import {test,expect} from '@playwright/test';
for(const width of [390,1440])for(const role of ['owner','viewer'])test(`workspace billing ${role} ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});
 const first={id:'first',name:'First workspace',slug:'first',role,members:[],assets:[],runs:[]},second={...first,id:'second',name:'Second workspace'};
 let workspace=first,paid=false,checkouts=0;const actions:unknown[]=[];
 await page.route('**/api/**',route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path==='/api/workspace'){workspace=req.headers()['x-witnessops-workspace']==='second'?second:req.headers()['x-witnessops-workspace']==='first'?first:workspace;return route.fulfill({json:{user:{id:'fixture'},workspaces:[first,second],workspace}});}
  if(path==='/api/feedback')return route.fulfill({json:[]});if(path==='/api/events')return route.fulfill({json:{}});
  if(path!=='/api/billing')throw new Error('Unexpected '+path);
  const id=req.headers()['x-witnessops-workspace'];expect(['first','second']).toContain(id);
  if(req.method()==='POST'){
   const body=req.postDataJSON();actions.push({...body,workspace:id});expect(role).toBe('owner');
   if(body.action==='checkout'){expect(body).toEqual({action:'checkout',plan:'team_month'});checkouts++;return route.fulfill({status:503,json:{error:'Sandbox checkout unavailable; retry safely.'}});}
   expect(body).toEqual({action:'refresh'});paid=true;return route.fulfill({json:{reconciled:true}});
  }
  const active=paid&&id==='first';
  return route.fulfill({json:{enabled:true,sandbox:true,canManage:role==='owner',status:active?'active':'free',hasCustomer:active,entitlement:{source:active?'subscription':'free',seats:active?3:1},plans:[{key:'team_month',name:'Team test',amount:100,currency:'eur',interval:'month',seats:3}]}});
 });
 await page.goto('/settings');const billing=page.getByRole('region',{name:'Workspace billing'});
 await expect(billing).toContainText('1 included seat');await expect(billing).toContainText('test payments only');await expect(billing).toContainText('Payment does not authorize a check');
 if(role==='owner'){
  await billing.getByRole('button',{name:'Choose Team test'}).focus();await page.keyboard.press('Enter');await expect(billing.getByRole('alert')).toContainText('retry safely');expect(checkouts).toBe(1);await expect(billing).toContainText('1 included seat');
  await billing.getByRole('button',{name:'Refresh billing status'}).click();await expect(billing).toContainText('3 included seats');await expect(billing.getByRole('button',{name:'Manage billing'})).toBeVisible();
 }else{await expect(billing).toContainText('An Owner manages billing');await expect(billing.getByRole('button')).toHaveCount(0);expect(actions).toEqual([]);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await billing.screenshot({path:info.outputPath(`billing-${role}-${width}.png`)});
 // A fresh workspace mount must fetch its own entitlement, never reuse the prior paid display.
 await page.getByLabel('Active workspace', {exact:true}).selectOption('second');
 await expect(page).toHaveURL(/\/$/);if(width===390)await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('link',{name:'Settings',exact:true}).click();
 await expect(billing).toContainText('1 included seat');await expect(billing).not.toContainText('3 included seats');
});
