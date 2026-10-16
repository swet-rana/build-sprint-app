import {nodeTestTarget} from './test-target-node.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
import {createWorker} from 'tesseract.js';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api.js';
import {encodeScanImage} from '../src/scan-image.js';
import {scanPageCheck} from '../src/scan-screening.js';
import {mergeScanResults} from '../src/scan-results.js';
import {normalizeReportTests} from '../src/test-matching.js';
import {compareReportSeries} from '../src/lab-parser.js';
const url=nodeTestTarget('unitless-ratio-integration.mjs','UNITLESS_RATIO_TEST_CONVEX_URL');
const client=new ConvexHttpClient(url),sessionKey=randomBytes(32).toString('hex');
let reportId,task,worker;
try{
 console.log('START: development; fictional image-only PDF with two unitless ratios and one unreadable ratio.');
 const bytes=await readFile(new URL('./fixtures/unitless-ratio-scan.pdf',import.meta.url)),form=new FormData();form.set('sessionKey',sessionKey);form.set('uploadId',randomUUID());form.set('file',new File([bytes],'fictional-unitless-ratio-scan.pdf',{type:'application/pdf'}));
 const uploaded=await fetch(url.replace('.cloud','.site')+'/reports/upload',{method:'POST',headers:{Origin:url.replace('.cloud','.site')},body:form});assert(uploaded.ok,'Fictional dev upload failed');reportId=(await uploaded.json()).reportId;
 Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true});const pdf=await task.promise,page=await pdf.getPage(1);assert((await page.getTextContent()).items.length===0,'Fixture must have no native text layer');
 const v=page.getViewport({scale:2}),canvas=createCanvas(v.width,v.height);await page.render({canvas,canvasContext:canvas.getContext('2d'),viewport:v}).promise;
 worker=await createWorker('eng',1,{langPath:new URL('../node_modules/@tesseract.js-data/eng/4.0.0_best_int',import.meta.url).pathname,cacheMethod:'none'});await worker.setParameters({preserve_interword_spaces:'1'});const {data}=await worker.recognize(canvas.toBuffer('image/png'),{}, {blocks:true});assert(scanPageCheck(data).hasTestContent,'Existing OCR screening must find test-like content');console.log('PASS: scanned PDF has no text layer; existing local OCR screening found test-like content.');
 const {image,metadata:imageMetadata}=await encodeScanImage(canvas,{makeCanvas:()=>createCanvas(1,1)}),readingId=await client.mutation(api.vision.begin,{sessionKey,reportIds:[reportId]});
 const receipt=await client.mutation(api.visionJobs.enqueueAttempt,{sessionKey,readingId,reportId,page:1,image,imageMetadata});let job;
 for(let attempt=0;attempt<100;attempt++){job=await client.query(api.visionJobs.get,{sessionKey,jobId:receipt.jobId});if(job?.status!=='reading')break;await new Promise(r=>setTimeout(r,1000));}
 assert(job?.status==='succeeded','Dev vision job did not succeed: '+(job?.failureReason??job?.status));console.log('STORED JOB: succeeded; attempt '+job.attempt+'; physical page 1.');
 const result=mergeScanResults([{page:1,result:job.result}],null,1);
 const expected=new Map([['AGRATIO',1.4],['TOTALCHOLESTEROLHDLCHOLESTEROLRATIO',2.4]]),compact=s=>s.toUpperCase().replace(/[^A-Z0-9]/g,'');
 assert(result.markers.length===2,'Expected two readable ratio results');for(const marker of result.markers){const key=compact(marker.rawName??marker.name);assert(expected.has(key)&&marker.value===expected.get(key),'Known fictional transcription mismatch');assert(marker.unit===''&&marker.key.endsWith('|'),'Unitless scan result must retain an empty unit');}
 assert(result.unreadable.length===1&&result.unreadable[0].value===null,'Unreadable ratio must remain missing');
 console.log('PASS: 2 known ratio results accepted with empty stored units; 1 unreadable ratio remains unreadable; no values printed.');
 const early={...structuredClone(result),date:'2026-01-15'},normalized=await normalizeReportTests([early,result],async()=>[]),comparison=compareReportSeries(normalized);assert(comparison.comparable.length===2&&comparison.comparable.every(m=>m.unit===''),'Same unitless ratios must compare');
 const withUnits={...result,markers:result.markers.map(m=>({...m,unit:'Ratio',key:m.key+'ratio'}))};assert.throws(()=>compareReportSeries([early,withUnits]),/No matching tests/);
 console.log('PASS: same unitless ratios compare; results with printed units do not combine with them.');
 console.log('PASS: prompt, model, caching and spend caps unchanged.');
}catch(error){console.error('FAIL: '+error.message);process.exitCode=1;}
finally{await worker?.terminate();await task?.destroy();if(reportId){await client.mutation(api.reports.setDeleted,{sessionKey,reportId,deleted:true});console.log('CLEANUP: fictional dev upload moved to its isolated session trash.');}}
