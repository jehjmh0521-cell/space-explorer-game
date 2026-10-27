const { test, expect } = require("@playwright/test");
test.beforeEach(async ({ page }) => {
  page.__errors = [];
  page.on("pageerror", (e) => page.__errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#start")).toBeVisible({ timeout: 30000 });
});
test.afterEach(async ({ page }) => expect(page.__errors).toEqual([]));
async function visit(page, id) {
  if (await page.locator("#title").isVisible()) {
    await page.locator("#exploreNow").click();
    await page.locator(`[data-visit="${id}"]`).click();
  } else {
    if (await page.locator("#sheet").isVisible())
      await page.locator("#closeSheet").click();
    await page.locator("#map").click();
    await page.locator(`[data-visit="${id}"]`).click();
  }
  await expect(page.locator("#sheet")).toBeVisible();
}
async function moon(page) {
  for (let i = 0; i < 3; i++)
    await page.locator(`[data-surface="${i}"]`).click();
  for (const p of [1, 2, 4, 6, 7])
    await page.locator(`[data-phase="${p}"]`).click();
}
async function connectChart(page, id) {
  await page.locator(`[data-chart="${id}"]`).click();
  const n = await page.locator("[data-star]").count();
  for (let i = 0; i < n; i++) await page.locator(`[data-star="${i}"]`).click();
}
async function stars(page) {
  for (const id of ["dipper", "little", "cassiopeia"])
    await connectChart(page, id);
  await page.locator('[data-polar="A"]').click();
}
async function secondQuestion(page, id) {
  const answers = {
    sun: 0,
    mercury: 1,
    venus: 2,
    earth: 0,
    mars: 1,
    jupiter: 2,
    saturn: 0,
    uranus: 1,
    neptune: 2,
    moon: 0,
    stars: 1,
  };
  await page.locator("#nextQuestion").click();
  await page.locator(`[data-answer="${answers[id]}"]`).click();
}
test("Three.js scene renders and responsive title matches viewport", async ({
  page,
}, info) => {
  await expect(page.locator("#stage")).toHaveAttribute(
    "data-engine",
    "Three.js 162",
  );
  await expect(page.locator("#stage canvas")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("title.png") });
});
test("autopilot reaches the moon; pause resumes and manual input overrides navigation", async ({
  page,
}) => {
  await page.locator("#start").click();
  await page.locator("#pause").click();
  await expect(page.locator("#modalTitle")).toContainText("쉬어");
  await page.locator("#resume").click();
  await expect(page.locator("#arrivalName")).toHaveText("달", {
    timeout: 30000,
  });
  await expect(page.locator("#scan")).toBeVisible();
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowLeft");
  await expect(page.locator("#flightState")).toContainText("직접 조종");
});
test("moon surface and phases gate quiz, wrong answer retries, progress persists", async ({
  page,
}) => {
  await visit(page, "moon");
  await expect(page.locator("#beginQuiz")).toBeDisabled();
  await moon(page);
  await expect(page.locator("#beginQuiz")).toBeEnabled();
  await page.locator("#moonDay").fill("45");
  await expect(page.locator("#phaseName")).toHaveText("보름달");
  await page.locator("#beginQuiz").click();
  await page.locator('[data-answer="0"]').click();
  await expect(page.locator("#answerFeedback")).toContainText("다시");
  await page.locator('[data-answer="1"]').click();
  await secondQuestion(page, "moon");
  await expect(page.locator("#count")).toHaveText("1/11");
  await page.reload();
  await visit(page, "moon");
  await moon(page);
  await page.locator("#beginQuiz").click();
  await page.locator('[data-answer="1"]').click();
  await secondQuestion(page, "moon");
  await expect(page.locator("#count")).toHaveText("1/11");
});
test("northern stars connect in order and north-star choice gates completion", async ({
  page,
}) => {
  await visit(page, "stars");
  await page.locator('[data-star="2"]').click();
  await expect(page.locator("#starNote")).toContainText("1번");
  await page.locator('[data-chart="cassiopeia"]').click();
  for (let i = 0; i < 5; i++) await page.locator(`[data-star="${i}"]`).click();
  await page.locator('[data-polar="B"]').click();
  await expect(page.locator("#beginQuiz")).toBeDisabled();
  await page.locator('[data-polar="A"]').click();
  await expect(page.locator("#beginQuiz")).toBeDisabled();
  await connectChart(page, "dipper");
  await connectChart(page, "little");
  await page.locator("#beginQuiz").click();
  await page.locator('[data-answer="2"]').click();
  await secondQuestion(page, "stars");
  await expect(page.locator("#count")).toHaveText("1/11");
});
test("all three research challenges award once and reset requires confirmation", async ({
  page,
}) => {
  await page.locator("#start").click();
  await page.locator("#lab").click();
  await page.locator('[data-lab="order"]').click();
  await page.locator('[data-order="earth"]').click();
  await expect(page.locator("#challengeFeedback")).toContainText("다시");
  for (const id of [
    "mercury",
    "venus",
    "earth",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
  ])
    await page.locator(`[data-order="${id}"]`).click();
  await expect(page.locator("#challengeFeedback")).toContainText("50 XP");
  await page.locator("#labReturn").click();
  await page.locator('[data-lab="sort"]').click();
  for (const type of [
    "gas",
    "rock",
    "gas",
    "rock",
    "gas",
    "rock",
    "gas",
    "rock",
  ])
    await page.locator(`[data-sort="${type}"]`).click();
  await expect(page.locator("#challengeFeedback")).toContainText("50 XP");
  await page.locator("#labReturn").click();
  await page.locator('[data-lab="size"]').click();
  await page.locator('[data-size="jupiter"]').click();
  await page.locator('[data-size="mercury"]').click();
  await expect(page.locator("#challengeFeedback")).toContainText("50 XP");
  await page.locator("#closeModal").click();
  await page.locator("#journal").click();
  await expect(page.locator("#modalBody")).toContainText("연구 배지 3 / 3");
  await page.locator("#reset").click();
  await page.locator("#cancelReset").click();
  await expect(page.locator("#modalBody")).toContainText("연구 배지 3 / 3");
  await page.locator("#reset").click();
  await page.locator("#confirmReset").click();
  await page.locator("#journal").click();
  await expect(page.locator("#modalBody")).toContainText("연구 배지 0 / 3");
});
test("all eleven actual missions unlock downloadable certificate", async ({
  page,
}) => {
  test.setTimeout(150000);
  const answers = {
    sun: 0,
    mercury: 1,
    venus: 2,
    earth: 0,
    mars: 1,
    jupiter: 2,
    saturn: 0,
    uranus: 1,
    neptune: 2,
    moon: 1,
    stars: 2,
  };
  for (const [id, answer] of Object.entries(answers)) {
    await visit(page, id);
    if (id === "moon") await moon(page);
    if (id === "stars") await stars(page);
    await page.locator("#beginQuiz").click();
    await page.locator(`[data-answer="${answer}"]`).click();
    await secondQuestion(page, id);
  }
  await page.locator("#nextDestination").click();
  await expect(page.locator("#modalTitle")).toContainText("임명장");
  const promise = page.waitForEvent("download");
  await page.locator("#downloadCert").click();
  const dl = await promise;
  expect(dl.suggestedFilename()).toMatch(/임명장.svg$/);
});
test("touch controls release, orbit rotation and observation layout", async ({
  page,
}, info) => {
  await page.locator("#start").click();
  if (info.project.name === "mobile") {
    await page
      .locator('[data-dir="left"]')
      .dispatchEvent("pointerdown", { pointerId: 1 });
    await page
      .locator('[data-dir="left"]')
      .dispatchEvent("pointerup", { pointerId: 1 });
    await expect(page.locator("#flightState")).toContainText("직접 조종");
  }
  await visit(page, "saturn");
  await expect(page.locator("#stage")).toHaveAttribute(
    "data-focused",
    "saturn",
  );
  await page.screenshot({ path: info.outputPath("saturn-observation.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("#beginQuiz")).toBeEnabled();
});
