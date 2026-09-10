import { test, expect } from '@playwright/test';
const essay = '/articles/when-civilization-can-no-longer-understand-itself';
const note = '/research/reading-a-public-exposure-snapshot';
for (const width of [1440,390]) {
  test(`editorial discovery and reading at ${width}`, async ({page}, info) => {
    await page.setViewportSize({width,height:900});
    const errors:string[]=[]; page.on('pageerror', e=>errors.push(e.message));
    await page.route('**/api/ask-witnessops', r=>r.fulfill({status:204}));
    expect((await page.goto('/research'))?.status()).toBe(200);
    await expect(page.getByRole('region',{name:'Featured',exact:true}).getByRole('link')).toHaveAttribute('href',essay);
    await expect(page.getByRole('region',{name:'Latest',exact:true}).getByRole('link')).toHaveAttribute('href',note);
    await expect(page.locator('main a')).toHaveCount(2);
    await expect(page.locator('[data-editorial-hero] img')).toBeVisible();
    await expect(page.getByRole('region',{name:'Latest',exact:true}).locator('img')).toHaveCount(0);
    await expect(page.locator('main')).toContainText('Essay · 3 September 2026');
    await expect(page.locator('main')).toContainText('Research note · 10 September 2026');
    await page.screenshot({path:info.outputPath(`research-${width}.png`)});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('region',{name:'Featured',exact:true}).getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(essay+'$'));
    for (const [path,type,title] of [[essay,'Essay','When Civilization Can No Longer Understand Itself'],[note,'Research note','How to read a public exposure snapshot']]) {
      expect((await page.goto(path))?.status()).toBe(200);
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://witnessops.com'+path);
      const article=page.locator('[data-editorial-article]');
      const hero=page.locator('[data-editorial-hero]');
      if(path===essay){
        await expect(hero.locator('img')).toBeVisible();
        await expect(hero.locator('img')).toHaveAttribute('alt',/^Illustration of /);
        await expect.poll(()=>hero.locator('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
        const heroBox=(await hero.boundingBox())!;
        expect(heroBox.width).toBeLessThanOrEqual(1200);
        expect(heroBox.width/heroBox.height).toBeCloseTo(width===390?16/9:16/5,1);
      }else await expect(hero).toHaveCount(0);
      await expect(article.getByRole('heading',{level:1})).toHaveText(title);
      await expect(article.locator('header')).toContainText(type);
      const box=await article.boundingBox();expect(box!.width).toBeLessThanOrEqual(760);expect(box!.width).toBeGreaterThan(width===390?300:700);
      await expect(article.locator('h2').first()).toHaveCSS('font-family',/Inter/);
      const data=await page.locator('script[type="application/ld+json"]').textContent();const json=JSON.parse(data!);
      expect(json.mainEntityOfPage).toBe('https://witnessops.com'+path);expect(json.headline).toBe(title);expect(json.dateModified).toBe(json.datePublished);
      const launcher=page.getByRole('button',{name:'Ask WitnessOps',exact:true});await expect(launcher).toBeVisible();
      await page.screenshot({path:info.outputPath(`${type.replace(' ','-')}-${width}.png`)});
      await article.locator('h2').first().scrollIntoViewIfNeeded();await expect(launcher).toBeVisible();
      await page.screenshot({path:info.outputPath(`${type.replace(' ','-')}-body-${width}.png`)});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    await page.locator('#site-footer').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`footer-${width}.png`)});
    await expect(page.locator('#site-footer').getByRole('link',{name:'Research & articles',exact:true})).toHaveAttribute('href','/research');
    expect(errors).toEqual([]);
  });
}
test('sitemap lists each editorial URL exactly once', async ({request})=>{
  const response=await request.get('/sitemap.xml');expect(response.status()).toBe(200);const xml=await response.text();
  for(const path of [essay,note])expect(xml.split(`<loc>https://witnessops.com${path}</loc>`).length-1).toBe(1);
});
