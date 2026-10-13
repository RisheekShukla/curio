import { devices, expect, test, type Page } from "@playwright/test";

const PAGES = ["/", "/discover", "/d/black-hole-formation", "/saved", "/history", "/interests", "/no-such-page"];

const emulate = (d: (typeof devices)[string]) => ({
  viewport: d.viewport,
  userAgent: d.userAgent,
  deviceScaleFactor: d.deviceScaleFactor,
  isMobile: d.isMobile,
  hasTouch: d.hasTouch,
});

const VIEWPORTS = [
  { name: "iPhone SE", context: emulate(devices["iPhone SE"]) },
  { name: "Pixel 7", context: emulate(devices["Pixel 7"]) },
  { name: "iPad Mini", context: emulate(devices["iPad Mini"]) },
  { name: "Desktop", context: emulate(devices["Desktop Chrome"]) },
  { name: "Desktop dark", context: { ...emulate(devices["Desktop Chrome"]), colorScheme: "dark" as const } },
];

async function audit(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const unlabeledButtons = [...document.querySelectorAll("button, a[href]")]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) return false;
        const name = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "").trim();
        return !name && !el.closest("[aria-hidden='true']");
      })
      .map((el) => el.outerHTML.slice(0, 120));
    const imagesWithoutAlt = [...document.querySelectorAll("img")].filter((img) => !img.hasAttribute("alt")).length;
    const brokenImages = [...document.querySelectorAll("img")]
      .filter((img) => img.complete && img.naturalWidth === 0 && img.loading !== "lazy")
      .map((img) => img.currentSrc.slice(0, 120));
    return {
      overflowX: doc.scrollWidth - doc.clientWidth,
      h1Count: document.querySelectorAll("h1").length,
      unlabeledButtons,
      imagesWithoutAlt,
      brokenImages,
    };
  });
}

for (const { name, context } of VIEWPORTS) {
  test.describe(name, () => {
    test.use(context);

    test("pages render without layout, console or accessibility problems", async ({ page }) => {
      const problems: string[] = [];
      page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
      page.on("console", (msg) => {
        // Remote image hiccups are handled by the image fallback, so they are not app errors.
        if (msg.type() === "error" && !msg.text().startsWith("Failed to load resource")) problems.push(msg.text().slice(0, 200));
      });

      for (const path of PAGES) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(400);
        const result = await audit(page);
        expect.soft(result.overflowX, `${path}: horizontal overflow`).toBeLessThanOrEqual(0);
        expect.soft(result.h1Count, `${path}: exactly one h1`).toBe(1);
        expect.soft(result.unlabeledButtons, `${path}: controls without accessible names`).toEqual([]);
        expect.soft(result.imagesWithoutAlt, `${path}: images without alt`).toBe(0);
        expect.soft(result.brokenImages, `${path}: broken eager images`).toEqual([]);
      }
      expect(problems, "console errors").toEqual([]);
    });
  });
}
