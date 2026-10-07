// Browser regression check for an existing uploaded PDF. Pass a Playwright page
// already displaying My Reports with an Open report button. No uploads or writes.
import assert from 'node:assert/strict';
export async function checkReportViewer(page) {
  const originalUrl = page.url();
  const button = page.getByRole('button', {name:/^Open report #/}).first();
  await button.click();
  await page.locator('.viewer-document canvas').waitFor({state:'visible'});
  assert.equal(page.url(), originalUrl);
  assert.equal(await page.locator('#app').isVisible(),false);
  await page.getByRole('button',{name:'← Back',exact:true}).click();
  assert.equal(await page.locator('.original-viewer').count(),0);
  assert.equal(await page.locator('#uploads-view').isVisible(),true);
  assert.equal(await button.isVisible(),true);
}
