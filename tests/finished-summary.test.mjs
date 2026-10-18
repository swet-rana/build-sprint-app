import {formatTestName} from '../src/format-test-name.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
// Load the native worker before installing the test browser document.
import 'tesseract.js';

// Expected values are independently transcribed from the fictional PDFs.
// Only file download, logging transport and browser-only behavior are replaced; reading, parsing,
// comparison and the finished summary renderer are the application's real code.
for(const kind of ['fertility','blood','semen','crosslab','scanned','mixed','blurred','tilted','blur-rejected','rotation-rejected','layout','multipage','footer','panels','confidence-partial','vision','scan-filter'])test(`${kind.includes('rejected')?'failed reports are excluded while readable reports still produce a summary':'finished summary matches the original PDFs'}: ${kind}, selected backwards`,async()=>{
 const expected=JSON.parse(await readFile(new URL(`./fixtures/${kind}-summary.expected.json`,import.meta.url)));
 const files=await Promise.all((expected.files??['january','july'].map(name=>`${kind}-sample-${name}.pdf`)).map(name=>readFile(new URL(`./fixtures/${name}`,import.meta.url))));
 const dom=new JSDOM('<div id="summary" hidden></div>',{url:'http://localhost:5173',pretendToBeVisual:true});
 dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
 dom.window.matchMedia=()=>({matches:true});
 const globals=['window','document','localStorage','MutationObserver','fetch','DOMMatrix','ImageData','Path2D'];
 const previous=Object.fromEntries(globals.map(key=>[key,globalThis[key]]));
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,MutationObserver:dom.window.MutationObserver});
 if(expected.ocr||kind==='scanned'||kind==='mixed'){
  const native=await import('@napi-rs/canvas');Object.assign(globalThis,{DOMMatrix:native.DOMMatrix,ImageData:native.ImageData,Path2D:native.Path2D});
  const originalCreate=dom.window.document.createElement.bind(dom.window.document);
  dom.window.document.createElement=(name,...args)=>{if(name!=='canvas')return originalCreate(name,...args);const canvas=native.createCanvas(1,1);canvas[Symbol.iterator]=function*(){yield*canvas.toBuffer('image/png');};return canvas;};
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  for(const index of expected.scannedIndexes??[0,1]){const bytes=files[index];const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true});try{const pdf=await task.promise;assert.equal((await(await pdf.getPage(1)).getTextContent()).items.length,0,'Scan must have no hidden native text layer');}finally{await task.destroy();}}
 }
 const downloads=[];
 globalThis.fetch=async(url,options)=>{const id=JSON.parse(options.body).reportId;downloads.push(id);return new Response(files[id==='january'?0:1],{headers:{'Content-Type':'application/pdf'}});};
 const bundle=await build({entryPoints:['src/analysis.js'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env.VITE_CONVEX_URL':'"https://fictional.convex.cloud"'},loader:{'.css':'empty'},plugins:[{
  name:'node-pdf-worker',setup(builder){
   if(kind==='fertility'){
    builder.onLoad({filter:/[\\/]src[\\/]report-reader\.js$/},async args=>({contents:(await readFile(args.path,'utf8')).replace('export async function readLabReport(', 'async function originalReadLabReport(')+'\nexport async function readLabReport(...args){globalThis.__fictionalReaderCalls=(globalThis.__fictionalReaderCalls??0)+1;return originalReadLabReport(...args);}',resolveDir:new URL('../src/',import.meta.url).pathname}));
    builder.onResolve({filter:/report-viewer\.js$/},()=>({path:'viewer-download-check',namespace:'viewer-download-check'}));
    builder.onLoad({filter:/.*/,namespace:'viewer-download-check'},()=>({contents:'export async function openReportViewer({load}){await load();}'}));
   }
   if(kind==='vision'||kind==='scan-filter'){
    builder.onResolve({filter:/vision-client\.js$/},()=>({path:'fictional-vision-transport',namespace:'fictional-vision'}));
    builder.onLoad({filter:/.*/,namespace:'fictional-vision'},()=>({contents:`export const visionRequests=[];let resuming=false;export const enableResume=()=>{resuming=true;};export const savedVisionReading=()=>resuming?{status:'reading'}:null;export const finishVisionReading=()=>{resuming=false;};export const VISION_FAILURE="We couldn't finish reading this report. Tap Try again.";export function visionReading(){return async(canvas,page)=>{visionRequests.push(page);return ({droppedRows:[{page,check:'unit'}],reportKind:'blood',patientName:'Sample Patient',reportDate:'2026-07-15',tests:[{name:'Haemoglobin',value:'13.2',unit:'g/dL',referenceRange:'12 - 16',readable:true,sourceTop:0.27},{name:'CRP',value:'3.0',unit:'mg/L',referenceRange:'0 - 5',readable:true,sourceTop:0.32},{name:'Vitamin D',value:'24',unit:'ng/mL',referenceRange:'30 - 100',readable:true,sourceTop:0.37},{name:'Unreadable fictional marker',value:'999',unit:'mg/L',referenceRange:null,readable:false,sourceTop:null}]});};}`}));
   }

   builder.onResolve({filter:/evaluation-log\.js$/},()=>({path:'captured-logging',namespace:'captured-logging'}));
   builder.onLoad({filter:/.*/,namespace:'captured-logging'},()=>({contents:'export const capturedEvaluations=[];export function evaluationLogger(){return {begin:async kind=>kind,finish:async(kind,output,error)=>capturedEvaluations.push({kind,output,error})};}'}));
   builder.onLoad({filter:/[\\/]src[\\/]analysis\.js$/},async args=>({contents:(await readFile(args.path,'utf8'))+"\nexport {capturedEvaluations} from './evaluation-log.js';"+(['vision','scan-filter'].includes(kind)?"\nexport {visionRequests,enableResume} from './vision-client.js';":''),resolveDir:new URL('../src/',import.meta.url).pathname}));
   // Node replaces only browser worker paths and canvas byte transport.
   // Production readLabReport, OCR mapping, parser and renderer remain real.
   if(expected.ocr||kind==='scanned'||kind==='mixed'){
    builder.onResolve({filter:/^tesseract\.js$/},()=>({path:'node-ocr-runtime',namespace:'node-ocr'}));
    builder.onLoad({filter:/.*/,namespace:'node-ocr'},()=>({contents:`import {createWorker as real} from ${JSON.stringify(import.meta.resolve('tesseract.js'))};export function createWorker(l,o,options){const fixed={...options,langPath:${JSON.stringify(new URL('../node_modules/@tesseract.js-data/eng/4.0.0_best_int',import.meta.url).pathname)},cacheMethod:'none'};delete fixed.workerPath;delete fixed.corePath;return real(l,o,fixed);}`}));
    builder.onResolve({filter:/^file:/},args=>({path:args.path,external:true}));
   }
   builder.onResolve({filter:/pdfjs-dist\/.*\?url$/},args=>({path:args.path,namespace:'worker-url'}));
   builder.onLoad({filter:/.*/,namespace:'worker-url'},args=>({contents:`export default ${JSON.stringify(import.meta.resolve(args.path.replace('?url','')))}`}));
   builder.onResolve({filter:/^pdfjs-dist\//},args=>({path:import.meta.resolve(args.path),external:true}));
  }
 }]});
 try{
  const {mountAnalysis,capturedEvaluations,visionRequests,enableResume}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  capturedEvaluations.length=0;
  if(visionRequests)visionRequests.length=0;
  const root=document.querySelector('#summary');const analysis=mountAnalysis(root,()=>{});
  if(kind==='vision')enableResume();
  analysis.updateReports(['july','january'].map((id,i)=>({id,serial:i+1,name:kind==='confidence-partial'?expected.files[id==='january'?0:1]:`${kind}-sample-${id}.pdf`,contentType:'application/pdf',size:files[id==='january'?0:1].length})),['july','january']);
  assert.equal(downloads.length,0);
  if(kind==='vision'){
   for(let attempt=0;attempt<600&&!root.querySelector('.real-summary-paper');attempt++)await new Promise(resolve=>setTimeout(resolve,50));
   assert(root.querySelector('.real-summary-paper'),'Reopening must resume and show the finished summary without pressing Prepare summary');
   console.log('RESUME PROOF: the saved reading automatically restored a finished summary without pressing Prepare summary.');
  }else await analysis.prepare();
  if(kind==='vision'||kind==='scan-filter'){const notice=root.querySelector('#scan-page-coverage');assert.match(notice.textContent,/1 row on page \d+ couldn't be read/);assert(!notice.hidden);assert(root.querySelector('.real-summary-paper'));assert(notice.closest('#real-summary'));assert.equal(notice.previousElementSibling?.className,'unpaired-results');assert.equal(notice.previousElementSibling?.previousElementSibling?.className,'all-results');assert(notice.parentElement.textContent.includes('What was included'));const exclusion=notice.nextElementSibling;if(exclusion)assert.equal(exclusion.querySelector('summary')?.textContent,'Pages excluded from this comparison');}
  if(root.querySelector('#lab-report-summary-title'))assert.equal(root.querySelector('#lab-report-summary-title').textContent,'Reports summary');
  if(expected.mode==='reject'||expected.mode==='partial'){
   assert.deepEqual(downloads,['july','january'],'A failed file must not prevent the other download');
   const readings=capturedEvaluations.filter(run=>run.kind==='report-reading');assert.equal(readings.length,2);
   const failed=readings.find(r=>r.error),good=readings.find(r=>r.output);assert(failed);assert(good);
   const captured=capturedEvaluations.find(run=>run.kind==='summary');assert(captured.output);assert(!captured.error);
   const c=captured.output.comparison;assert.equal(c.reports.length,1);assert.equal(c.comparable.length,0);assert.deepEqual(c.reports[0].markers,good.output.markers);
   assert.equal(captured.output.failedFiles.length,1);
   assert.equal(root.querySelector('.real-summary-paper .report-count strong').textContent,'1');
   assert.equal(root.querySelectorAll('.result-point').length,0,'One readable report must not invent a trend');
   assert.equal(root.querySelectorAll('.real-summary-paper .source-button').length,good.output.markers.length);
   assert.equal(root.querySelector('#retry-summary').hidden,false);
   assert.equal(root.querySelector('[data-reading-status="failed"]').querySelector('.reading-file-error').textContent.includes('could not be read'),true);
   if(kind==='confidence-partial'){
    assert(root.querySelector('#reading-failures').textContent.includes('low-confidence-scan.pdf'));
    assert(root.querySelector('#reading-failures').textContent.includes('too unclear'));
    assert.deepEqual([...root.querySelectorAll('.values .result-value')].map(e=>e.textContent),expected.values);
    assert.equal(failed.error.diagnostics.threshold,80);assert.equal(failed.error.diagnostics.page,1);
    assert(failed.error.diagnostics.lowConfidenceWords.length>0);
    for(const word of failed.error.diagnostics.lowConfidenceWords){assert(word.text);assert(word.confidence<80);assert(word.bbox);}
   }
   return;
  }
  assert.equal(root.querySelector('#retry-summary').hidden,true,root.querySelector('#analysis-status').textContent+' '+root.querySelector('#reading-failures').textContent);
  assert.deepEqual(downloads,['july','january']);
  const captured=capturedEvaluations.find(run=>run.kind==='summary');assert(captured?.output,'Finished output must be available for logging');
  if(expected.labs)assert.deepEqual(captured.output.comparison.reports.map(r=>r.labName),expected.labs);
  const included=[...root.querySelectorAll('.included-report')];assert.equal(included.length,2,'Both selected reports must have their own inclusion block');
  assert(!root.querySelector('.reading-coverage').textContent.includes('dated result-table pages used.'));
  for(const report of captured.output.comparison.reports){const block=included.find(e=>e.querySelector('strong').textContent===report.fileName);assert(block);assert(block.textContent.includes(`Total pages: ${report.pageCount}`));const count=report.scanCoverage?Math.max(0,(report.scanCoverage.pdfTotal??report.scanCoverage.total)-report.scanCoverage.total)+report.scanCoverage.read:new Set(report.usedPages).size;assert(block.textContent.includes(`Pages with test results: ${count}`));}

  root.querySelector('[data-category="all"]').click();
  const paper=root.querySelector('.real-summary-paper');assert(paper,'A finished summary must be rendered');
  assert.equal(paper.querySelector('.summary-heading p').textContent,expected.dates);
  assert.equal(paper.querySelector('.report-count strong').textContent,String(expected.reports));
  assert.equal(paper.querySelector('.context strong').textContent,expected.patient);
  const markers=[...paper.querySelectorAll('.marker')];assert.equal(markers.length,expected.markers.length);
  for(const wanted of expected.markers){
   const marker=markers.find(m=>m.querySelector('.marker-heading h4').textContent===formatTestName(wanted.name));
   assert(marker,`Missing test ${wanted.name}`);
   assert.equal(marker.querySelector('[data-test-info]').dataset.testInfo,wanted.name);
   const picker=[...root.querySelectorAll('.test-option')].find(row=>row.querySelector('[data-test-info]').dataset.testInfo===wanted.name);assert(picker,`Missing picker explanation ${wanted.name}`);assert(!picker.querySelector('label button'),'Info must not toggle test selection');
   assert.deepEqual([...marker.querySelectorAll('.values>div')].map(v=>v.querySelector('.result-value')?.textContent??null),wanted.values);
   assert.equal(marker.querySelector('.marker-heading span').textContent,wanted.unit);
   assert.deepEqual([...marker.querySelectorAll('.values>div')].map(v=>v.querySelector('.result-value')?v.querySelector(':scope>span').textContent:null),wanted.values.map((v,i)=>v===null?null:`Reference: ${wanted.references?.[i]??wanted.reference}`));
   assert.equal(marker.querySelector('.change strong').textContent,wanted.change);
   assert.equal(marker.querySelector('.change>span:last-child').textContent,`Latest value: ${wanted.latest}`);
   assert.deepEqual([...marker.querySelectorAll('.source-button')].map(b=>[b.dataset.source,b.dataset.page]),['january','july'].map((id,i)=>[id,(wanted.pages??['1','1'])[i]]).filter(([,page])=>page!==null));
   assert.equal(marker.querySelectorAll('.source-button').length,wanted.values.filter(v=>v!==null).length);
   if(wanted.values.includes(null)){assert(marker.textContent.includes('Not reported'));assert.equal(marker.querySelectorAll('.result-point').length,0);}
   if(wanted.pointStates)assert.deepEqual([...marker.querySelectorAll('.result-point')].map(p=>p.getAttribute('class').split(' ').find(c=>c.startsWith('trend-')).slice(6)),wanted.pointStates);
  }
  if(kind==='vision'||kind==='scan-filter'){
   assert.equal(paper.querySelectorAll('.scan-value-notice').length,4);
   assert(paper.textContent.includes('unreadable in scan'));
   const unreadable=paper.querySelector('p.scan-value-notice .source-button');
   assert(unreadable,'Unreadable scan entries must link to their original report');
   assert.equal(unreadable.parentElement.querySelector('[data-test-info]').dataset.testInfo,'Unreadable fictional marker');
   assert.equal(unreadable.dataset.source,'july');
   assert.equal(unreadable.dataset.page,kind==='scan-filter'?'27':'1');
   assert.equal(unreadable.dataset.sourcePath,'vision');
   assert.equal(unreadable.dataset.sourceOcrName,'Unreadable fictional marker');
   assert.equal(unreadable.dataset.sourceTop,'');
   assert.equal(paper.textContent.includes('999'),false,'An unsure scan value must never be included');
   assert.equal(root.querySelectorAll('.reading-path').length,2);
   assert([...root.querySelectorAll('[data-reading-path-detail]')].some(p=>p.textContent.includes('AI vision')));
   assert([...root.querySelectorAll('[data-reading-path-detail]')].some(p=>p.textContent.includes('Reading path: text')));
   assert.equal(captured.output.comparison.later.markers.every(m=>m.readPath==='vision'),true);
   if(kind==='scan-filter'){
    assert.deepEqual(visionRequests,[27],'The first 26 OCR-screened covers/images must never reach AI vision');
    const coverage=captured.output.comparison.later.scanCoverage;
    assert.equal(coverage.checked,27);assert.equal(coverage.read,1);assert.equal(coverage.vision,1);assert.equal(coverage.skipped.length,26);
    assert.deepEqual(coverage.skipped.map(p=>p.page),Array.from({length:26},(_,i)=>i+1));
    assert(coverage.skipped.every(p=>p.reason.includes('no test-like')));
    assert(root.querySelector('#scan-page-coverage details').textContent.includes('1 scanned page read · 26 skipped · 27 of 27 scan/fallback pages checked · PDF total: 27 pages'));assert.equal(root.querySelector('.page-coverage-summary').textContent,'27 pages checked · test results found on 1 · 26 had no test results');assert.equal(root.querySelector('#scan-page-coverage details').open,false);
    assert(root.querySelector('#scan-page-coverage').textContent.includes('Page 26:'));
   }

   analysis.updateReports(['july','january'].map((id,i)=>({id,serial:i+1,name:`updated-${id}.pdf`,contentType:'application/pdf',size:files[id==='january'?0:1].length,details:{labName:'Updated details',testDate:'',patientName:'',testType:''}})),['july','january']);
   assert.equal(root.querySelectorAll('.reading-path').length,2,'Reading paths survive a report-details refresh');
   assert([...root.querySelectorAll('[data-reading-path-detail]')].some(p=>p.textContent.includes('AI vision')));
   assert([...root.querySelectorAll('[data-reading-path-detail]')].some(p=>p.textContent.includes('Reading path: text')));

  }
  if(kind==='fertility'){
  const prolactin=markers.find(m=>m.querySelector('.change strong').textContent==='Decreased by 10 ng/mL');
  assert.deepEqual([...prolactin.querySelectorAll('.result-point')].map(p=>p.getAttribute('class')),['result-point trend-out-of-range range-above','result-point trend-normal-transition range-within']);
  assert.equal(globalThis.__fictionalReaderCalls,2);
  const source=paper.querySelector('.source-button');source.click();source.click();
  await new Promise(resolve=>setTimeout(resolve,20));
  await analysis.prepare();
  assert.deepEqual(downloads,['july','january'],'Repeated source opens and summary preparation reuse the same original files');
  assert.equal(globalThis.__fictionalReaderCalls,2,'The real PDF reader runs once per file, including repeated preparation');
  assert.equal(root.querySelector('.real-summary-paper .summary-heading p').textContent,expected.dates);
  console.log('CACHE PROOF: two fictional originals downloaded twice total; real PDF reader ran twice total; two source opens and a second summary made zero extra downloads or readings.');
  delete globalThis.__fictionalReaderCalls;
  }
  assert(paper.querySelector('.summary-footer').textContent.includes('A change is not a diagnosis'));
 }finally{dom.window.close();for(const key of globals){if(previous[key]===undefined)delete globalThis[key];else globalThis[key]=previous[key];}}
});
