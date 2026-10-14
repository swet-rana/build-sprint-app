// A dedicated fictional dev upload in a fresh browser context; never use a
// real user's page, access key, selection or first uploaded report.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api.js';
import {guardTestTarget} from './test-target.js';
import {nodeTestTarget} from './test-target-node.mjs';
const cloud=nodeTestTarget('report-viewer.browser.mjs','REPORT_VIEWER_CONVEX_URL',{devOnly:true});
export async function checkReportViewer(page){
 const originalUrl=await page.url();
 guardTestTarget(new URL(originalUrl).origin,{script:'report-viewer.browser.mjs',devOnly:true});
 const browser=page.context().browser();
 if(!browser)throw Error('Use a browser that can create a fresh fictional test context.');
 const sessionKey=randomBytes(32).toString('hex'),site=cloud.replace('.convex.cloud','.convex.site');
 const fixture=await readFile(new URL('./fixtures/sample-blood-report.pdf',import.meta.url));
 const form=new FormData();form.set('sessionKey',sessionKey);form.set('uploadId',randomUUID());form.set('file',new File([fixture],'fictional-report-viewer.pdf',{type:'application/pdf'}));
 const uploaded=await fetch(`${site}/reports/upload`,{method:'POST',headers:{Origin:site},body:form});
 assert(uploaded.ok,'Fictional dev report could not be uploaded.');const {reportId}=await uploaded.json();
 let context;
 try{
  context=await browser.newContext();
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(/\.convex\.(cloud|site)$/.test(url.hostname)&&!url.hostname.startsWith('elegant-schnauzer-503.'))return route.abort();
   return route.continue();
  });
  if(context.routeWebSocket)await context.routeWebSocket(/\.convex\.cloud/,socket=>{
   if(new URL(socket.url()).hostname==='elegant-schnauzer-503.convex.cloud')socket.connectToServer();else socket.close();
  });
  await context.addInitScript(key=>{localStorage.setItem('health-history-upload-session',key);localStorage.setItem('health-history-analysis-reports','[]');},sessionKey);
  const fictionalPage=await context.newPage();await fictionalPage.goto(originalUrl);
  await fictionalPage.locator('#reports-tab').click();
  const button=fictionalPage.locator(`button[data-report-id="${reportId}"]`);
  await button.waitFor({state:'visible'});await button.click();
  await fictionalPage.locator('.viewer-document canvas').waitFor({state:'visible'});
  assert.equal(await fictionalPage.locator('#app').isVisible(),false);
  await fictionalPage.getByRole('button',{name:'Back to HealthStats',exact:true}).click();
  assert.equal(await fictionalPage.locator('.original-viewer').count(),0);
  assert.equal(await fictionalPage.locator('#uploads-view').isVisible(),true);
  assert.equal(await button.isVisible(),true);
 }finally{
  await context?.close();
  await new ConvexHttpClient(cloud).mutation(api.reports.setDeleted,{sessionKey,reportId,deleted:true});
 }
}
