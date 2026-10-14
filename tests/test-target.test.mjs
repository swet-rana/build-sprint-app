import test from 'node:test';
import assert from 'node:assert/strict';
import {guardTestTarget,DEV_CONVEX_URL,PROD_CONVEX_URL} from './test-target.js';
test('test targets default to dev and production needs the explicit allow flag',()=>{
 assert.equal(guardTestTarget(),DEV_CONVEX_URL);
 assert.equal(guardTestTarget(DEV_CONVEX_URL.replace('.cloud','.site')),DEV_CONVEX_URL);
 assert.throws(()=>guardTestTarget(PROD_CONVEX_URL),/Pass --allow-prod explicitly/);
 assert.throws(()=>guardTestTarget(PROD_CONVEX_URL.replace('.cloud','.site')),/Pass --allow-prod explicitly/);
 assert.equal(guardTestTarget(PROD_CONVEX_URL,{allowProd:true}),PROD_CONVEX_URL);
});
test('viewer remains dev-only; unknown hosts and misleading URLs are refused',()=>{
 assert.throws(()=>guardTestTarget(PROD_CONVEX_URL,{allowProd:true,devOnly:true}),/fictional development reports only/);
 for(const url of ['https://elegant-schnauzer-503.evil.example','https://another.convex.cloud','https://elegant-schnauzer-503.convex.cloud/?redirect=prod','https://user:password@elegant-schnauzer-503.convex.cloud'])assert.throws(()=>guardTestTarget(url,{allowProd:true}),/REFUSED/);
 assert.equal(guardTestTarget('http://localhost:5173'),'http://localhost:5173');
});
test('viewer refuses a production page before browser access or any file download',async()=>{
 const {checkReportViewer}=await import('./report-viewer.browser.mjs');let browserAccess=0;
 await assert.rejects(checkReportViewer({url:()=>PROD_CONVEX_URL.replace('.cloud','.site'),context:()=>{browserAccess++;throw Error('Must not touch this browser');}}),/fictional development reports only/);
 assert.equal(browserAccess,0);
});
