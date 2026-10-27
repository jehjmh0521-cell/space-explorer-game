const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.__errors=errors;
 await page.goto('/');await page.locator('#launch').click();
});
test.afterEach(async({page})=>{expect(page.__errors).toEqual([]);});
test('earth mission, wrong answer, reward, persistence and no duplicate rewards',async({page})=>{
 await page.locator('#scan').click();await page.locator('#rotation').fill('180');await expect(page.locator('#dayLabel')).toContainText('밤');
 await page.locator('#beginQuiz').click();await page.locator('[data-answer="2"]').click();await expect(page.locator('#answerFeedback')).toContainText('다시');
 await page.locator('[data-answer="0"]').click();await expect(page.locator('#xp')).toHaveText('✧ 100 XP');
 await page.reload();await expect(page.locator('#xp')).toHaveText('✧ 100 XP');
 await page.locator('#journal').click();await page.locator('[data-journal="earth"]').click();await page.locator('#beginQuiz').click();await page.locator('[data-answer="0"]').click();await expect(page.locator('#xp')).toHaveText('✧ 100 XP');
});
test('moon observation gate and correct answer',async({page})=>{
 await page.locator('[data-region="moon"]').click();await expect(page.locator('#scan')).toBeEnabled({timeout:15000});await page.locator('#scan').click();
 await expect(page.locator('#modalTitle')).toHaveText('달 관측소 탐사');await expect(page.locator('#beginQuiz')).toBeDisabled();
 for(const p of [2,4,6])await page.locator('[data-phase="'+p+'"]').click();
 await expect(page.locator('#phaseName')).toHaveText('지구에서 본 하현달');
 await page.locator('#beginQuiz').click();await page.locator('[data-answer="1"]').click();await expect(page.locator('#progressText')).toHaveText('1 / 11');
});
test('star course, chart and north star unlock quiz',async({page})=>{
 await page.locator('[data-region="stars"]').click();await expect(page.locator('#scan')).toBeEnabled({timeout:15000});await page.locator('#scan').click();
 await expect(page.locator('#modalTitle')).toHaveText('별자리 관측소 탐사');
 const stars=page.locator('[data-star]');for(let i=0;i<await stars.count();i++)await stars.nth(i).click();
 await expect(page.locator('#beginQuiz')).toBeDisabled();
 await page.locator('[data-polar="B"]').click();await expect(page.locator('#beginQuiz')).toBeDisabled();
 await page.locator('[data-polar="A"]').click();await page.locator('#beginQuiz').click();await page.locator('[data-answer="2"]').click();
 await expect(page.locator('#progressText')).toHaveText('1 / 11');
});
test('order challenge, controls and reset confirmation',async({page})=>{
 await page.locator('#order').click();await page.locator('[data-order="earth"]').click();await expect(page.locator('#orderFeedback')).toContainText('다시');
 for(const id of ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'])await page.locator('[data-order="'+id+'"]').click();
 await expect(page.locator('#orderFeedback')).toContainText('성공');await page.locator('#close').click();
 await page.locator('#map').click();await expect(page.locator('#map')).toHaveAttribute('aria-pressed','true');await page.locator('#map').click();
 await page.locator('#about').click();await page.locator('#reset').click();await page.locator('#cancelReset').click();await expect(page.locator('#modal')).not.toBeVisible();
});
test('layout fits viewport and screenshot',async({page},info)=>{
 await expect(page.locator('#space')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:info.outputPath('expedition.png'),fullPage:true});
});
