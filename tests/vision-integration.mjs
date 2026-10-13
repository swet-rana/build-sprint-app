// Real PDF -> real OCR rejection -> Convex action -> OpenAI vision -> production comparison data.
// Uses only fictional data in a fresh isolated session; no API key is read by this script.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
import {createWorker} from 'tesseract.js';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api.js';
import {ocrPage} from '../src/ocr-page.js';
import {mergeScanResults} from '../src/scan-results.js';
import {execFileSync} from 'node:child_process';
const url=process.env.VISION_TEST_CONVEX_URL;if(!url)throw Error('Set VISION_TEST_CONVEX_URL to the deployment being tested.');
const client=new ConvexHttpClient(url),sessionKey=randomBytes(32).toString('hex'),other=randomBytes(32).toString('hex'),site=url.replace('.cloud','.site');
const bytes=await readFile(new URL('./fixtures/vision-sample.pdf',import.meta.url));
const form=new FormData();form.set('sessionKey',sessionKey);form.set('uploadId',randomUUID());form.set('file',new File([bytes],'fictional-vision-sample.pdf',{type:'application/pdf'}));
const uploaded=await fetch(`${site}/reports/upload`,{method:'POST',headers:{Origin:site},body:form});assert(uploaded.ok,await uploaded.clone().text());const reportId=(await uploaded.json()).reportId;
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true});let worker;
try{
 const pdf=await task.promise,page=await pdf.getPage(1);assert.equal((await page.getTextContent()).items.length,0,'Fictional scan must not contain a text layer');
 const viewport=page.getViewport({scale:2}),canvas=createCanvas(viewport.width,viewport.height);await page.render({canvas,canvasContext:canvas.getContext('2d'),viewport}).promise;
 worker=await createWorker('eng',1,{langPath:new URL('../node_modules/@tesseract.js-data/eng/4.0.0_best_int',import.meta.url).pathname,cacheMethod:'none'});await worker.setParameters({preserve_interword_spaces:'1'});
 const ocr=await worker.recognize(canvas.toBuffer('image/png'),{}, {blocks:true});assert.throws(()=>ocrPage(ocr.data,canvas.width,canvas.height,1),e=>['NO_TABLE','LOW_CONFIDENCE'].includes(e.code));console.log('Fictional image-only PDF: no text layer; real OCR rejected this page under its unchanged safety rules.');
 const readingId=await client.mutation(api.vision.begin,{sessionKey,reportIds:[reportId]});
 const image=canvas.toDataURL('image/jpeg',0.85),args={sessionKey,readingId,reportId,page:1,image};
 let diagnostics;try{ocrPage(ocr.data,canvas.width,canvas.height,1);}catch(error){diagnostics=error.diagnostics;}
 const scan=await client.action(api.vision.read,{...args,...(diagnostics?{ocrDiagnostics:JSON.stringify(diagnostics)}:{})}),result=mergeScanResults([{page:1,result:scan}],null,1);
 assert.equal(result.date,'2026-07-15');assert.equal(result.patientName,'Sample Patient');
 assert.deepEqual(result.markers.map(m=>[m.name,m.value,m.unit]),[['Haemoglobin',13.2,'g/dL'],['C-reactive protein',3,'mg/L'],['Vitamin D',24,'ng/mL']]);
 assert.deepEqual(result.markers.map(m=>m.referenceText.replace(/\s/g,'')),['12-16','0-5','30-100']);assert(result.markers.every(m=>m.readPath==='vision'&&m.page===1));
 console.log('Real Convex/OpenAI vision returned the original values: haemoglobin 13.2 g/dL (12 - 16), CRP 3 mg/L (0 - 5), Vitamin D 24 ng/mL (30 - 100), report date 2026-07-15.');
 await assert.rejects(client.action(api.vision.read,{...args,sessionKey:other}));console.log('A different browser session cannot read this scan.');
 // CLI invokes only server-internal quota reservation, avoiding extra paid calls for boundary tests.
 const production=url.includes('zealous-kiwi-423');
 const reserve=async(readingId,page)=>{const id=JSON.parse(execFileSync(new URL('../node_modules/.bin/convex',import.meta.url).pathname,['run','vision:reserve',JSON.stringify({sessionKey,readingId,reportId,page}),...(production?['--prod']:[])],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));await client.action(api.evaluations.finish,{sessionKey,runId:id,error:'Isolated quota-boundary test reservation; no provider call was made.'});return id;};
 for(let page=2;page<=4;page++)await reserve(readingId,page);
 await assert.rejects(client.action(api.vision.read,{...args,page:5}),/4 pages/);console.log('The fifth page is blocked on the server before any provider call.');
 for(const count of [4,2]){const id=await client.mutation(api.vision.begin,{sessionKey,reportIds:[reportId]});for(let page=1;page<=count;page++)await reserve(id,page);}
 const capped=await client.mutation(api.vision.begin,{sessionKey,reportIds:[reportId]});await assert.rejects(client.action(api.vision.read,{...args,readingId:capped}),/10 scan readings/);console.log('The eleventh daily call is blocked on the server even with a new reading.');
 const logs=JSON.parse(execFileSync(new URL('../node_modules/.bin/convex',import.meta.url).pathname,['run','--inline-query',`const rows=await ctx.db.query('evaluationRuns').withIndex('by_session',q=>q.eq('sessionKey',${JSON.stringify(sessionKey)})).take(20);return await Promise.all(rows.map(async r=>({...r,sessionKey:undefined,outputUrl:r.outputStorageId?await ctx.storage.getUrl(r.outputStorageId):null})));`,...(production?['--prod']:[])],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const saved=logs.find(r=>r.status==='succeeded');assert(saved?.outputUrl);let logged;for(let attempt=0;attempt<2;attempt++){try{logged=await(await fetch(saved.outputUrl)).json();break;}catch(error){if(attempt)throw error;console.log('Retrying the saved log download after a connection interruption.');}}assert(logged.imageStorageId);assert(logged.request);assert(logged.rawResponse);assert.deepEqual(logged.result,scan);console.log('The existing evaluationRuns log saved the page image, exact request, raw AI response and structured results.');
 console.log('Scan provenance and original page reference preserved for every included value.');
}finally{await worker?.terminate();await task.destroy();await client.mutation(api.reports.setDeleted,{sessionKey,reportId,deleted:true});console.log('Fictional upload moved to its isolated session’s trash.');}
