import { expect, test } from "./fixtures";

test.describe("Shellbit v3 motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("original atlas jumps once on hover, lands, and opens chat", async ({ page }, testInfo) => {
    await page.goto("/");
    const launcher = page.getByRole("button", { name: "Ask Sovereign", exact: true });
    const sprite = launcher.locator("[data-shellbit-state]");
    await expect(sprite).toHaveAttribute("data-shellbit-state", "idle");
    await expect(sprite).toHaveCSS("background-image", /shellbit-v3\/spritesheet[.]png/);
    expect(await sprite.evaluate(async (el) => {
      const image = new Image();
      image.src = getComputedStyle(el).backgroundImage.slice(5, -2);
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    })).toEqual([1536, 2288]);
    await page.clock.install();
    await launcher.hover();
    await expect(sprite).toHaveAttribute("data-shellbit-state", "jump");
    await page.clock.runFor(270);
    await expect(sprite).toHaveAttribute("data-shellbit-frame", "2");
    await expect(sprite).toHaveCSS("background-position-y", "40%");
    await launcher.screenshot({ path: testInfo.outputPath("shellbit-jump.png") });
    await page.clock.runFor(400);
    await expect(sprite).toHaveAttribute("data-shellbit-state", "idle");
    await page.clock.runFor(900);
    await expect(sprite).toHaveAttribute("data-shellbit-state", "idle");
    await page.mouse.move(0, 0);
    await launcher.hover();
    await expect(sprite).toHaveAttribute("data-shellbit-state", "jump");
    await launcher.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(sprite).toHaveAttribute("data-shellbit-state", "idle");
  });

  test("drag direction and keyboard movement animate without opening chat", async ({ page }, testInfo) => {
    await page.goto("/");
    const launcher = page.getByRole("button", { name: "Ask Sovereign", exact: true });
    const sprite = launcher.locator("[data-shellbit-state]");
    await expect(sprite).toHaveAttribute("data-shellbit-state", "idle");
    await page.clock.install();
    const box = await launcher.boundingBox();
    if (!box) throw new Error("Missing launcher");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 160, y - 40, { steps: 8 });
    await expect(sprite).toHaveAttribute("data-shellbit-state", "left");
    await page.clock.runFor(100);
    await expect(sprite).toHaveAttribute("data-shellbit-frame", "1");
    await launcher.screenshot({ path: testInfo.outputPath("shellbit-run-left.png") });
    await page.mouse.move(x - 80, y - 40, { steps: 4 });
    await expect(sprite).toHaveAttribute("data-shellbit-state", "right");
    await launcher.screenshot({ path: testInfo.outputPath("shellbit-run-right.png") });
    await page.clock.runFor(200);
    await expect(sprite).toHaveAttribute("data-shellbit-state", "idle");
    await page.mouse.up();
    await expect(launcher).toHaveAttribute("aria-expanded", "false");
    await launcher.press("ArrowLeft");
    await expect(sprite).toHaveAttribute("data-shellbit-state", "left");
    await launcher.press("ArrowRight");
    await expect(sprite).toHaveAttribute("data-shellbit-state", "right");
    await launcher.press("Home");
    await expect(sprite).toHaveAttribute("data-shellbit-state", "idle");
    await expect(launcher).toHaveAttribute("aria-expanded", "false");
    await launcher.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test("reduced motion keeps the original v3 still while movement and chat work", async ({ page }) => {
  await page.goto("/");
  const launcher = page.getByRole("button", { name: "Ask Sovereign", exact: true });
  const sprite = launcher.locator("[data-shellbit-state]");
  await launcher.hover();
  await launcher.press("ArrowLeft");
  await expect(sprite).toHaveAttribute("data-shellbit-state", "idle");
  await expect(sprite).toHaveAttribute("data-shellbit-frame", "0");
  await launcher.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  const chatSprite = page.getByRole("dialog").locator("[data-shellbit-chat]");
  await expect(chatSprite).toHaveCSS("width", "32px");
  await expect(chatSprite).toHaveCSS("background-image", /shellbit-v3\/spritesheet[.]png/);
  await expect(chatSprite).toHaveAttribute("data-shellbit-frame", "0");
});

for (const width of [1280, 390, 320]) {
  test(`automatic right-edge placement leaves controls clear at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const launcher = page.getByRole("button", { name: "Ask Sovereign", exact: true });
    await expect.poll(() => launcher.evaluate((el) => (el.parentElement as HTMLElement).style.left)).not.toBe("");
    for (const scroll of [0, 500, 1200]) {
      await page.evaluate((y) => window.scrollTo(0, y), scroll);
      await page.waitForTimeout(250);
      const result = await launcher.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const overlaps = [...document.querySelectorAll('a[href], button, input, textarea, select, summary')].filter((node) => {
          if (el.contains(node) || node.closest('dialog') || !node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
          const other = node.getBoundingClientRect();
          return box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top;
        }).map((node) => node.textContent?.trim().slice(0, 70));
        return { right: box.right, top: box.top, bottom: box.bottom, overlaps };
      });
      expect(result.right).toBe(width - 16);
      expect(result.top).toBeGreaterThanOrEqual(16);
      expect(result.bottom).toBeLessThanOrEqual(828);
      expect(result.overlaps).toEqual([]);
    }
    await page.screenshot({ path: testInfo.outputPath(`shellbit-right-${width}.png`) });
  });
}

test("random landing stays settled and moves away from a new control after scrolling", async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.2; });
  await page.goto("/");
  const launcher = page.getByRole("button", { name: "Ask Sovereign", exact: true });
  await expect.poll(() => launcher.evaluate((el) => (el.parentElement as HTMLElement).style.left)).not.toBe("");
  const initial = await launcher.boundingBox();
  if (!initial) throw new Error("Missing launcher");
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  expect(await launcher.boundingBox()).toEqual(initial);
  await page.evaluate((box) => {
    const button = document.createElement("button");
    button.textContent = "Synthetic page action";
    button.id = "placement-obstacle";
    Object.assign(button.style, { position: "fixed", left: `${box.x}px`, top: `${box.y}px`, width: `${box.width}px`, height: `${box.height}px` });
    document.body.append(button);
    window.dispatchEvent(new Event("scroll"));
  }, initial);
  await expect.poll(async () => (await launcher.boundingBox())?.y).not.toBe(initial.y);
  const moved = await launcher.boundingBox();
  if (!moved) throw new Error("Missing launcher");
  expect(moved.y + moved.height <= initial.y || moved.y >= initial.y + initial.height).toBe(true);
});

test("different visits can choose different right-edge landing spots", async ({ browser }) => {
  const positions = [];
  for (const seed of [0.05, 0.95]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    try {
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        return url.hostname === "127.0.0.1" && !url.pathname.startsWith("/api/") ? route.continue() : route.abort();
      });
      await context.addInitScript((value) => { Math.random = () => value; }, seed);
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:3012/");
      const launcher = page.getByRole("button", { name: "Ask Sovereign", exact: true });
      await expect.poll(() => launcher.evaluate((el) => (el.parentElement as HTMLElement).style.left)).not.toBe("");
      positions.push((await launcher.boundingBox())?.y);
    } finally { await context.close(); }
  }
  expect(positions[0]).not.toBe(positions[1]);
});

test.describe("chat animation controls", () => {
  test.use({ reducedMotion: "no-preference" });
  test("pausing and minimizing stop the small v3 animation", async ({ page }) => {
    await page.goto("/?sim=slow");
    await page.getByRole("button", { name: "Ask Sovereign", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const sprite = dialog.locator("[data-shellbit-chat]");
    await dialog.getByRole("textbox").fill("Synthetic test question");
    await dialog.getByRole("button", { name: "Send", exact: true }).click();
    await expect(sprite).toHaveAttribute("data-shellbit-chat", "PROCESSING");
    await expect(sprite).not.toHaveAttribute("data-shellbit-frame", "0");
    await dialog.getByRole("button", { name: /Pause/ }).click();
    await expect(sprite).toHaveAttribute("data-shellbit-frame", "0");
    await dialog.getByRole("button", { name: "Play animation", exact: true }).click();
    await expect(sprite).not.toHaveAttribute("data-shellbit-frame", "0");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.locator("dialog [data-shellbit-chat]")).toHaveAttribute("data-shellbit-frame", "0");
  });
});
