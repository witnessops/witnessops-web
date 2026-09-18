import { test, expect } from '@playwright/test';
const id='11111111-2222-3333-4444-555555555555';
const preview={id,workspaceId:'workspace',workspaceName:'Team workspace',inviter:'Owner',role:'viewer',revision:1,state:'pending',expiresAt:'2027-01-01T12:00:00Z'};
for(const width of [390,1440]) test(`invitation is preview-only until explicit keyboard acceptance at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:900});
  let accepted=0;
  await page.route('**/api/invitations*',route=>{
    if(route.request().method()==='POST') {expect(route.request().postDataJSON()).toEqual({id,revision:1,role:'viewer'});accepted++;return route.fulfill({json:{...preview,state:'accepted'}});}
    return route.fulfill({json:preview});
  });
  await page.goto(`/invitations/${id}`);
  await expect(page.getByRole('heading',{name:'Team workspace'})).toBeVisible();
  expect(accepted).toBe(0);
  const accept=page.getByRole('button',{name:'Accept invitation'});await accept.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Invitation accepted.');expect(accepted).toBe(1);
  await expect(page.getByRole('link',{name:'Open your workspaces'})).toHaveAttribute('href','/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('signed-out invitation preserves only the locator and offers no accept action',async({page})=>{
  await page.route('**/api/invitations*',route=>route.fulfill({status:401,json:{error:'Sign in'}}));
  await page.goto(`/invitations/${id}`);
  await expect(page.getByRole('link',{name:'Sign in',exact:true})).toHaveAttribute('href',`/login?returnTo=${encodeURIComponent('/invitations/'+id)}`);
  await expect(page.getByRole('button',{name:'Accept invitation'})).toHaveCount(0);
});
for(const width of [390,1440]) for(const role of ['owner','contributor','viewer']) test(`members surface grants ${role} the appropriate controls at ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:900});
  const workspace={id:'workspace',name:'Team workspace',slug:'team',role,assets:[],runs:[],members:[]};
  const roster={role,members:[{id:'owner',displayName:'Team Owner',role:'owner',generation:1}],invitations:[] as unknown[]};
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/workspace')return route.fulfill({json:{user:{id:'current',displayName:'Current'},workspaces:[workspace],workspace}});
    if(path==='/api/feedback')return route.fulfill({json:[]});
    if(path==='/api/events')return route.fulfill({json:{recorded:true}});
    if(path==='/api/members') {
      if(route.request().method()==='POST') {const body=route.request().postDataJSON();expect(body.role).toBe('viewer');expect(body.email).toBe('teammate@example.test');roster.invitations=[{...preview,recipient:body.email,deliveryState:'accepted',provider:'file'}];}
      return route.fulfill({json:roster});
    }
    throw new Error(`Unexpected request ${path}`);
  });
  await page.goto('/members');await expect(page.getByText('Team Owner',{exact:true})).toBeVisible();
  if(role==='owner'){
    await page.getByRole('button',{name:'Invite teammate',exact:true}).click();
    await expect(page.getByLabel('Email',{exact:true})).toBeFocused();
    await expect(page.getByLabel('Role',{exact:true})).toHaveValue('viewer');
    await page.getByLabel('Email',{exact:true}).fill('teammate@example.test');await page.getByRole('button',{name:'Send invitation'}).click();
    await expect(page.getByText(/Saved locally; email not sent/)).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    if(info.project.name==='chromium')await page.screenshot({path:`/tmp/wops-members-polish-${width}.png`,fullPage:true});
  }else{await expect(page.getByRole('button',{name:'Send invitation'})).toHaveCount(0);await expect(page.getByRole('button',{name:/Remove/})).toHaveCount(0);}
});
test('successful self-removal clears the previously rendered workspace',async({page})=>{
  let removed=false;
  const workspace={id:'workspace',name:'Team workspace',slug:'team',role:'owner',assets:[],runs:[],members:[]};
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/workspace'){
      if(removed&&route.request().headers()['x-witnessops-workspace'])return route.fulfill({status:404,json:{error:'Workspace not found.'}});
      return route.fulfill({json:{user:{id:'current',displayName:'Current'},workspaces:removed?[]:[workspace],workspace:removed?null:workspace}});
    }
    if(path==='/api/feedback')return route.fulfill({json:[]});
    if(path==='/api/events')return route.fulfill({json:{recorded:true}});
    if(path==='/api/members'){
      if(route.request().method()==='POST'){expect(route.request().postDataJSON()).toEqual({action:'change',userId:'current',role:null,generation:1});removed=true;return route.fulfill({json:{removed:true}});}
      return route.fulfill({json:{role:'owner',invitations:[],members:[{id:'current',displayName:'Current',role:'owner',generation:1},{id:'other',displayName:'Remaining Owner',role:'owner',generation:1}]}});
    }
    throw new Error(`Unexpected request ${path}`);
  });
  await page.goto('/members');await page.getByRole('button',{name:'Remove Current',exact:true}).click();
  expect(removed).toBe(false);await page.getByRole('button',{name:'Confirm change'}).click();
  await expect(page.getByRole('heading',{name:'Members',exact:true})).toHaveCount(0);
  expect(removed).toBe(true);await expect(page.getByText('Remaining Owner',{exact:true})).toHaveCount(0);
});
