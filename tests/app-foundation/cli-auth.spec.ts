import { test, expect } from '@playwright/test';
for (const width of [1440,390]) for (const role of ['owner','viewer']) test(`CLI explicit authorization ${role} ${width}`,async({page},info)=>{
 let posts=0;await page.setViewportSize({width,height:900});
 await page.route('**/api/cli/authorize',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{user:{id:'internal-test-user',displayName:'Test Account'},workspaces:[{id:'workspace-a',name:'Workspace A',role},{id:'workspace-b',name:'Workspace B',role}]}});
  const body=route.request().postDataJSON();expect(body).toEqual({code:'ABCD-EF12-3456',workspaceId:'workspace-b',displayedUserId:'internal-test-user',action:'authorize'});posts++;return route.fulfill({json:{state:'authenticated'}});
 });
 await page.goto('/cli/authorize');await expect(page.getByRole('heading',{name:'Authorize WitnessOps CLI'})).toBeVisible();
 await expect(page.locator('main')).toContainText('Never enter a code sent by someone else');await expect(page.locator('main')).toContainText('does not grant server checks, uploads or signing authority');
 const authorize=page.getByRole('button',{name:'Authorize CLI',exact:true});await expect(authorize).toBeDisabled();
 await page.getByLabel('Workspace',{exact:true}).selectOption('workspace-b');await expect(page.locator('main')).toContainText(`Role: ${role==='owner'?'Owner':'Viewer'}`);
 await page.getByLabel('Code from your terminal').fill('ABCD-EF12-3456');await expect(authorize).toBeDisabled();
 await page.getByRole('checkbox', { name: /I started this CLI/ }).check();await expect(authorize).toBeEnabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('cli-authorize.png'),fullPage:true});
 await authorize.click();await expect(page.getByRole('status')).toContainText('Return to your terminal');expect(posts).toBe(1);
 await expect(authorize).toHaveCount(0);
});
test('CLI authorization requires browser sign-in and never accepts code from URL',async({page})=>{
 await page.route('**/api/cli/authorize',route=>route.fulfill({status:401,json:{code:'sign_in'}}));await page.goto('/cli/authorize?code=ABCD-EF12-3456');await expect(page.getByRole('link',{name:'Sign in to continue'})).toHaveAttribute('href','/cli/login');await expect(page.getByRole('button',{name:'Authorize CLI'})).toHaveCount(0);
});
test('CLI single workspace selects automatically; changed browser identity fails visibly',async({page})=>{
 await page.route('**/api/cli/authorize',route=>route.request().method()==='GET'?route.fulfill({json:{user:{id:'u',displayName:'Test'},workspaces:[{id:'w',name:'Workspace',role:'viewer'}]}}):route.fulfill({status:409,json:{code:'identity_changed'}}));
 await page.goto('/cli/authorize');await expect(page.getByLabel('Workspace',{exact:true})).toHaveValue('w');await page.getByLabel('Code from your terminal').fill('ABCD-EF12-3456');await page.getByRole('checkbox', { name: /I started this CLI/ }).check();await page.getByRole('button',{name:'Authorize CLI',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toContainText('account changed');
});
test('Owner explicitly adds server-check scope; switching workspace resets consent',async({page})=>{
 let posts=0;await page.route('**/api/cli/authorize',route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{user:{id:'u',displayName:'Test'},workspaces:[{id:'a',name:'Owner workspace',role:'owner'},{id:'b',name:'Viewer workspace',role:'viewer'}]}});
  expect(route.request().postDataJSON().scope).toBe('cli:session server_check:create');posts++;return route.fulfill({json:{state:'authenticated'}});
 });
 await page.goto('/cli/authorize');await page.getByLabel('Workspace',{exact:true}).selectOption('a');const scope=page.getByRole('checkbox',{name:/Also allow local/});await expect(scope).not.toBeChecked();await scope.check();await page.getByLabel('Workspace',{exact:true}).selectOption('b');await expect(scope).toHaveCount(0);await page.getByLabel('Workspace',{exact:true}).selectOption('a');await expect(scope).not.toBeChecked();await scope.check();await page.getByLabel('Code from your terminal').fill('ABCD-EF12-3456');await page.getByRole('checkbox',{name:/I started this CLI/}).check();await page.getByRole('button',{name:'Authorize CLI',exact:true}).click();await expect(page.getByRole('status')).toContainText('Return to your terminal');expect(posts).toBe(1);
});
