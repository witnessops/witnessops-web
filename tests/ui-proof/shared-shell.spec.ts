import { expect, test, type Page } from "@playwright/test";

const acceptedRoutes = [
  "/",
  "/pl",
  "/catalog",
  "/pl/catalog",
  "/customer-security-review",
  "/pl/customer-security-review",
  "/review/request",
  "/pl/review/request",
  "/library",
  "/pl/library",
] as const;

const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const languagePairs = [
  ["/", "/pl"],
  ["/catalog", "/pl/catalog"],
  ["/customer-security-review", "/pl/customer-security-review"],
  ["/review/request", "/pl/review/request"],
  ["/library", "/pl/library"],
] as const;

const activeNavigationHref = new Map<string, string>([
  ["/catalog", "/catalog"],
  ["/pl/catalog", "/pl/catalog"],
  ["/customer-security-review", "/customer-security-review"],
  ["/pl/customer-security-review", "/pl/customer-security-review"],
  ["/review/request", "/review/request"],
  ["/pl/review/request", "/pl/review/request"],
  ["/library", "/library"],
  ["/pl/library", "/pl/library"],
]);

async function openMobileMenu(page: Page) {
  const toggle = page.locator('button[aria-controls="witnessops-mobile-menu"]');
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  return toggle;
}

test("accepted buyer routes retain a consistent, accessible shared shell", async ({
  browser,
}) => {
  test.setTimeout(180_000);

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    let expectedNavHeight: number | null = null;

    for (const route of acceptedRoutes) {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const onConsole = (message: { type(): string; text(): string }) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      };
      const onPageError = (error: Error) => pageErrors.push(error.message);
      page.on("console", onConsole);
      page.on("pageerror", onPageError);

      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status(), `${route} ${viewport.name} status`).toBe(200);
      await expect(page.locator("main h1").first()).toBeVisible();
      await expect(page.locator("nav.public-shell")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();

      const shell = await page.evaluate(() => {
        const nav = document
          .querySelector("nav.public-shell")
          ?.getBoundingClientRect();
        const main = document.querySelector("main")?.getBoundingClientRect();
        const visibleNavTargets = Array.from(
          document.querySelectorAll<HTMLElement>(
            "nav.public-shell a, nav.public-shell button",
          ),
        ).filter((element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return (
            box.width > 0 &&
            box.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            !element.closest("[inert]") &&
            Boolean(nav && box.bottom > nav.top && box.top < nav.bottom)
          );
        });
        const footerLinks = Array.from(
          document.querySelectorAll<HTMLAnchorElement>("footer a"),
        );
        return {
          navHeight: nav?.height ?? 0,
          navBottom: nav?.bottom ?? 0,
          mainTop: main?.top ?? 0,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          minNavTarget: Math.min(
            ...visibleNavTargets.map((element) => element.getBoundingClientRect().height),
          ),
          minFooterTarget: Math.min(
            ...footerLinks.map((element) => element.getBoundingClientRect().height),
          ),
          clippedFooterLinks: footerLinks.filter((element) => {
            const box = element.getBoundingClientRect();
            return box.left < -1 || box.right > document.documentElement.clientWidth + 1;
          }).length,
          footerFontSizes: footerLinks.map((element) =>
            Number.parseFloat(getComputedStyle(element).fontSize),
          ),
        };
      });

      expectedNavHeight ??= shell.navHeight;
      expect(shell.navHeight, `${route} ${viewport.name} header height`).toBe(
        expectedNavHeight,
      );
      expect(Math.abs(shell.mainTop - shell.navBottom), `${route} main offset`).toBeLessThanOrEqual(1);
      expect(shell.scrollWidth, `${route} ${viewport.name} horizontal overflow`).toBeLessThanOrEqual(
        shell.clientWidth + 1,
      );
      expect(shell.minNavTarget, `${route} ${viewport.name} nav target`).toBeGreaterThanOrEqual(44);
      expect(shell.minFooterTarget, `${route} ${viewport.name} footer target`).toBeGreaterThanOrEqual(44);
      expect(Math.min(...shell.footerFontSizes), `${route} footer font size`).toBeGreaterThanOrEqual(12);
      expect(shell.clippedFooterLinks, `${route} clipped footer links`).toBe(0);

      const activeHref = activeNavigationHref.get(route);
      const visibleActive = page.locator(
        'nav.public-shell [aria-current="page"]:visible',
      );
      if (activeHref) {
        await expect(visibleActive, `${route} active route`).toHaveCount(1);
        await expect(visibleActive).toHaveAttribute("href", activeHref);
      } else {
        await expect(visibleActive, `${route} has no represented primary nav item`).toHaveCount(0);
      }

      expect(consoleErrors, `${route} ${viewport.name} console errors`).toEqual([]);
      expect(pageErrors, `${route} ${viewport.name} page errors`).toEqual([]);
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }

    await context.close();
  }
});

test("language switching preserves every accepted route pair and header geometry", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1100 });

  for (const [englishPath, polishPath] of languagePairs) {
    await page.goto(englishPath, { waitUntil: "networkidle" });
    const englishHeaderHeight = await page
      .locator("nav.public-shell")
      .evaluate((nav) => nav.getBoundingClientRect().height);
    const polishLink = page.getByRole("link", { name: "PL", exact: true });
    await expect(polishLink).toHaveCount(1);
    await expect(polishLink).toHaveAttribute("href", polishPath);
    await expect(polishLink).toHaveText("PL");
    await polishLink.click();
    await expect(page).toHaveURL(new RegExp(`${polishPath.replaceAll("/", "\\/")}$`));
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(
      await page
        .locator("nav.public-shell")
        .evaluate((nav) => nav.getBoundingClientRect().height),
    ).toBe(englishHeaderHeight);

    const englishLink = page.getByRole("link", { name: "EN", exact: true });
    await expect(englishLink).toHaveCount(1);
    await expect(englishLink).toHaveAttribute("href", englishPath);
    await expect(englishLink).toHaveText("EN");
    await englishLink.click();
    await expect(page).toHaveURL(new RegExp(`${englishPath === "/" ? "\\/" : englishPath.replaceAll("/", "\\/")}$`));
    await expect(page.locator("main h1").first()).toBeVisible();
  }
});

test("mobile navigation excludes closed content, manages focus, and restores scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl/catalog", { waitUntil: "networkidle" });

  const toggle = page.locator('button[aria-controls="witnessops-mobile-menu"]');
  await expect(toggle).toHaveAttribute("aria-label", "Otwórz główną nawigację");
  const firstMenuLink = page.locator("#witnessops-mobile-menu a").first();
  expect(
    await firstMenuLink.evaluate((element) => {
      element.focus();
      return document.activeElement === element;
    }),
    "closed mobile links stay out of the focus order",
  ).toBe(false);

  const closedGeometry = await page.locator("main").evaluate((main) => {
    const box = main.getBoundingClientRect();
    return { top: box.top, left: box.left, width: box.width };
  });
  await toggle.focus();
  await openMobileMenu(page);
  await expect(toggle).toHaveAttribute("aria-label", "Zamknij główną nawigację");
  await expect(firstMenuLink).toBeFocused();
  await expect(firstMenuLink).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  const menuVisuals = await page.evaluate(() => {
    const current = document.querySelector<HTMLElement>(
      '#witnessops-mobile-menu [aria-current="page"]',
    );
    const cta = document.querySelector<HTMLElement>(
      '#witnessops-mobile-menu a[href="/pl/review/request"]',
    );
    return {
      currentBackground: current ? getComputedStyle(current).backgroundColor : null,
      currentBorder: current ? getComputedStyle(current).borderLeftWidth : null,
      ctaBackground: cta ? getComputedStyle(cta).backgroundColor : null,
      ctaColor: cta ? getComputedStyle(cta).color : null,
    };
  });
  expect(menuVisuals.currentBackground).toBe("rgb(238, 238, 238)");
  expect(menuVisuals.currentBorder).toBe("2px");
  expect(menuVisuals.ctaBackground).toBe("rgb(5, 5, 5)");
  expect(menuVisuals.ctaColor).toBe("rgb(255, 255, 255)");
  const openGeometry = await page.locator("main").evaluate((main) => {
    const box = main.getBoundingClientRect();
    return {
      top: box.top,
      left: box.left,
      width: box.width,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(Math.abs(openGeometry.top - closedGeometry.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(openGeometry.left - closedGeometry.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(openGeometry.width - closedGeometry.width)).toBeLessThanOrEqual(1);
  expect(openGeometry.overflow).toBeLessThanOrEqual(1);

  const mobileTargets = page.locator("#witnessops-mobile-menu a:visible");
  for (let index = 0; index < (await mobileTargets.count()); index += 1) {
    expect((await mobileTargets.nth(index).boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }

  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

  await openMobileMenu(page);
  const englishSwitch = page.locator('#witnessops-mobile-menu a[href="/catalog"]');
  await englishSwitch.click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});
