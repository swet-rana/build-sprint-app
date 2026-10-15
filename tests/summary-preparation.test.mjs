import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';

test('Summary preserves selected originals, waits for a click and offers retry after a download error',async()=>{
 const dom=new JSDOM('<div id="summary"></div>',{url:'http://localhost:5173'});
 const globals=['window','document','localStorage','MutationObserver','fetch'];
 const previous=Object.fromEntries(globals.map(key=>[key,globalThis[key]]));
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,MutationObserver:dom.window.MutationObserver});
 const downloads=[],removed=[];let visits=0;
 globalThis.fetch=async(url,options)=>{downloads.push(JSON.parse(options.body).reportId);return Response.json({error:'Reports are temporarily unavailable. Try again.'},{status:503});};
 const bundle=await build({entryPoints:['src/analysis.js'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env.VITE_CONVEX_URL':'"https://fictional.convex.cloud"'},loader:{'.css':'empty'},plugins:[{
  name:'isolated-summary-reader',setup(builder){
   builder.onResolve({filter:/report-viewer\.js$|report-reader\.js$/},args=>({path:args.path,namespace:'isolated'}));
   builder.onLoad({filter:/.*/,namespace:'isolated'},args=>({contents:args.path.includes('report-viewer')?'export async function openReportViewer(){}':'export async function readLabReport(){throw Error("Download must succeed before reading");}'}));
  }
 }]});
 try{
  const {mountAnalysis}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const root=document.querySelector('#summary');
  const saved=[{id:'january',serial:3,name:'Filename-2099.pdf',contentType:'application/pdf',size:4096,details:{testDate:'2026-01-15',labName:'Recorded lab'}},{id:'july',serial:4,name:'Original-July.pdf',contentType:'application/pdf',size:4096}];
  const analysis=mountAnalysis(root,()=>{},{onAddReports:()=>visits++,onRemoveReport:id=>removed.push(id)});
  analysis.updateReports(saved,['january','july']);
  assert.equal(downloads.length,0,'Entering Summary must not read PDF reports automatically');
  assert.equal(root.querySelector('#real-summary').textContent,'');
  assert.equal(root.querySelector('#analysis-selection-count').textContent,'2 of 10 reports selected');
  assert(root.querySelector('.selected-report-details').textContent.includes('15 Jan 2026'),'Use the recorded date, not a date in the filename');
  assert(root.querySelectorAll('.selected-report-details')[1].textContent.includes('Date not added'));
  root.querySelector('#add-analysis-reports').click();assert.equal(visits,1);
  root.querySelector('[data-summary-remove="july"]').click();assert.deepEqual(removed,['july']);
  await analysis.prepare();assert.deepEqual(downloads,['january','july']);
  assert(root.querySelector('#reading-failures').textContent.includes('temporarily unavailable'));
  assert.equal(root.querySelector('#retry-summary').hidden,false);
  assert.equal(root.querySelector('#retry-summary').disabled,false);
  assert.equal(root.querySelector('#prepare-summary').disabled,false);
  assert.equal(root.querySelector('#real-summary').textContent,'','Failed analysis cannot show fabricated results');
  analysis.updateReports(saved,['january']);
  assert.equal(root.querySelector('#prepare-summary').disabled,true);
  assert.equal(root.querySelector('#analysis-selection-count').textContent,'1 of 10 reports selected');
 }finally{dom.window.close();for(const key of globals){if(previous[key]===undefined)delete globalThis[key];else globalThis[key]=previous[key];}}
});

test('A scan limit or AI service failure stops preparation with its clear message and retry',async()=>{
 const dom=new JSDOM('<div id="summary"></div>',{url:'http://localhost:5173'}),keys=['window','document','localStorage','MutationObserver','fetch'];const old=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,MutationObserver:dom.window.MutationObserver});let downloads=0;
 globalThis.fetch=async()=>{downloads++;return new Response('fictional scan',{headers:{'Content-Type':'application/pdf'}});};
 try{
  const bundle=await build({entryPoints:['src/analysis.js'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env.VITE_CONVEX_URL':'"https://fictional.convex.cloud"'},loader:{'.css':'empty'},plugins:[{name:'failed-scan-service',setup(b){b.onResolve({filter:/report-viewer\.js$|report-reader\.js$/},a=>({path:a.path,namespace:'failure'}));b.onLoad({filter:/.*/,namespace:'failure'},a=>({contents:a.path.includes('report-viewer')?'export async function openReportViewer(){}':`export async function readLabReport(){const error=Error(globalThis.scanFailure);error.code='VISION_STOP';throw error;}`}));}}]});
  const {mountAnalysis}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),root=document.querySelector('#summary'),analysis=mountAnalysis(root,()=>{});
  analysis.updateReports([{id:'one',serial:1,name:'scan.pdf',contentType:'application/pdf',size:100},{id:'two',serial:2,name:'text.pdf',contentType:'application/pdf',size:100}],['one','two']);
  for(const text of ['Scan reading stopped: the limit is 30 vision pages per summary preparation.','Scan reading stopped: HealthStats has reached its app-wide daily limit of 150 vision pages. Try again tomorrow.','Scan reading stopped: the AI service could not read this page (API 429). Try again later.']){
   const firstAttempt=globalThis.scanFailure===undefined;
   globalThis.scanFailure=text;downloads=0;await analysis.prepare();assert.equal(downloads,firstAttempt?1:0,'Retry reuses the original and never downloads the next report after a scan cap or API failure');assert(root.querySelector('#analysis-status').textContent.includes(text));assert.equal(root.querySelector('#real-summary').textContent,'');assert.equal(root.querySelector('#retry-summary').hidden,false);
  }
 }finally{delete globalThis.scanFailure;dom.window.close();for(const key of keys){if(old[key]===undefined)delete globalThis[key];else globalThis[key]=old[key];}}
});

test('saved scan failure shows its real cap reason under Why pages were skipped and keeps the friendly error',async()=>{
 const dom=new JSDOM('<div id="summary"></div>',{url:'http://localhost:5173'}),keys=['window','document','localStorage','MutationObserver','fetch'];const old=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,MutationObserver:dom.window.MutationObserver});
 globalThis.fetch=async()=>new Response('fictional PDF',{headers:{'Content-Type':'application/pdf'}});
 const reason='Scan reading stopped: the limit is 60 vision pages per summary preparation. Choose a smaller set of result pages.';
 try{
  const bundle=await build({entryPoints:['src/analysis.js'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env.VITE_CONVEX_URL':'"https://fictional.convex.cloud"'},loader:{'.css':'empty'},plugins:[{name:'saved-cap-failure',setup(b){
   b.onResolve({filter:/report-viewer\.js$|report-reader\.js$|vision-client\.js$/},a=>({path:a.path,namespace:'saved-cap'}));
   b.onLoad({filter:/.*/,namespace:'saved-cap'},a=>({contents:a.path.includes('report-viewer')?'export async function openReportViewer(){}':a.path.includes('vision-client')?`export const VISION_FAILURE="We couldn't finish reading this report. Tap Try again.";export const savedVisionReading=()=>null;export const finishVisionReading=()=>{};export function visionReading(_ids,{onStatus}){return async(_canvas,page,file)=>{onStatus({status:'failed',reportId:file.id,page,failureReason:${JSON.stringify(reason)}});throw Error(VISION_FAILURE);};}`:`export async function readLabReport(_blob,_progress,_type,options){try{await options.vision(null,57);}catch(error){error.pageCoverage={read:0,vision:0,ocr:0,total:44,checked:34,skipped:[{page:1,reason:'No test-like content.'}]};throw error;}}`}));
  }}]});
  const {mountAnalysis}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),root=document.querySelector('#summary'),analysis=mountAnalysis(root,()=>{});
  analysis.updateReports([{id:'cap-one',serial:1,name:'fictional-cap.pdf',contentType:'application/pdf',size:100},{id:'cap-two',serial:2,name:'fictional-other.pdf',contentType:'application/pdf',size:100}],['cap-one','cap-two']);
  await analysis.prepare();assert.equal(root.querySelector('#analysis-status').textContent,"We couldn't finish reading this report. Tap Try again.");
  const details=root.querySelector('#scan-page-coverage details');assert(details);assert.equal(details.querySelector('summary').textContent,'Why pages were skipped');assert(details.textContent.includes(reason));assert(details.textContent.includes('Reading stopped on page 57'));assert(details.textContent.includes('No test-like content.'));assert(!details.textContent.includes('at handler'));
  assert.equal(root.querySelector('#retry-summary').hidden,false);console.log('UI PROOF: friendly error retained; stored cap reason shown under Why pages were skipped; no stack trace.');
 }finally{dom.window.close();for(const key of keys){if(old[key]===undefined)delete globalThis[key];else globalThis[key]=old[key];}}
});
