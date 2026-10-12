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
for(const kind of ['fertility','blood','semen','crosslab','scanned','mixed','blurred','tilted','blur-rejected','rotation-rejected','layout','multipage','footer'])test(`${kind.includes('rejected')?'unreadable or unsupported reports are rejected without a partial summary':'finished summary matches the original PDFs'}: ${kind}, selected backwards`,async()=>{
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
   builder.onResolve({filter:/evaluation-log\.js$/},()=>({path:'captured-logging',namespace:'captured-logging'}));
   builder.onLoad({filter:/.*/,namespace:'captured-logging'},()=>({contents:'export const capturedEvaluations=[];export function evaluationLogger(){return {begin:async kind=>kind,finish:async(kind,output,error)=>capturedEvaluations.push({kind,output,error})};}'}));
   builder.onLoad({filter:/[\\/]src[\\/]analysis\.js$/},async args=>({contents:(await readFile(args.path,'utf8'))+"\nexport {capturedEvaluations} from './evaluation-log.js';",resolveDir:new URL('../src/',import.meta.url).pathname}));
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
  const {mountAnalysis,capturedEvaluations}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  capturedEvaluations.length=0;
  const root=document.querySelector('#summary');const analysis=mountAnalysis(root,()=>{});
  analysis.updateReports(['july','january'].map((id,i)=>({id,serial:i+1,name:`${kind}-sample-${id}.pdf`,contentType:'application/pdf',size:files[id==='january'?0:1].length})),['july','january']);
  assert.equal(downloads.length,0);
  await analysis.prepare();
  if(expected.mode==='reject'){
   const status=root.querySelector('#analysis-status').textContent;
   for(const text of expected.errorIncludes)assert(status.includes(text),status);
   assert.equal(root.querySelector('#retry-summary').hidden,false);
   assert.equal(root.querySelector('#prepare-summary').disabled,false);
   assert.equal(root.querySelector('#real-summary').textContent,'','Unreadable reports must not produce a fabricated or partial summary');
   assert.deepEqual(downloads,['july','january']);
   const readings=capturedEvaluations.filter(run=>run.kind==='report-reading');
   assert.equal(readings.length,2);assert(readings[0].output,'Readable report must finish before the damaged report is rejected');assert(!readings[0].error);
   const summaryLog=capturedEvaluations.find(run=>run.kind==='summary');assert(summaryLog.error);assert.equal(summaryLog.output,null);
   assert(capturedEvaluations.some(run=>run.kind==='report-reading'&&run.error));
   return;
  }
  assert.equal(root.querySelector('#retry-summary').hidden,true,root.querySelector('#analysis-status').textContent);
  assert.deepEqual(downloads,['july','january']);
  const captured=capturedEvaluations.find(run=>run.kind==='summary');assert(captured?.output,'Finished output must be available for logging');
  if(expected.labs)assert.deepEqual(captured.output.comparison.reports.map(r=>r.labName),expected.labs);
  root.querySelector('[data-category="all"]').click();
  const paper=root.querySelector('.real-summary-paper');assert(paper,'A finished summary must be rendered');
  assert.equal(paper.querySelector('.summary-heading p').textContent,expected.dates);
  assert.equal(paper.querySelector('.report-count strong').textContent,String(expected.reports));
  assert.equal(paper.querySelector('.context strong').textContent,expected.patient);
  const markers=[...paper.querySelectorAll('.marker')];assert.equal(markers.length,expected.markers.length);
  for(const wanted of expected.markers){
   const marker=markers.find(m=>m.querySelector('.marker-heading h4').textContent===wanted.name);
   assert(marker,`Missing test ${wanted.name}`);
   assert.deepEqual([...marker.querySelectorAll('.values>div')].map(v=>v.querySelector('.result-value')?.textContent??null),wanted.values);
   assert.equal(marker.querySelector('.marker-heading span').textContent,wanted.unit);
   assert.deepEqual([...marker.querySelectorAll('.values>div')].map(v=>v.querySelector('.result-value')?v.querySelector(':scope>span').textContent:null),wanted.values.map(v=>v===null?null:`Reference: ${wanted.reference}`));
   assert.equal(marker.querySelector('.change strong').textContent,wanted.change);
   assert.equal(marker.querySelector('.change>span:last-child').textContent,`Latest value: ${wanted.latest}`);
   assert.deepEqual([...marker.querySelectorAll('.source-button')].map(b=>[b.dataset.source,b.dataset.page]),['january','july'].map((id,i)=>[id,(wanted.pages??['1','1'])[i]]).filter(([,page])=>page!==null));
   assert.equal(marker.querySelectorAll('.source-button').length,wanted.values.filter(v=>v!==null).length);
   if(wanted.values.includes(null)){assert(marker.textContent.includes('Not reported'));assert.equal(marker.querySelectorAll('.result-point').length,0);}
   if(wanted.pointStates)assert.deepEqual([...marker.querySelectorAll('.result-point')].map(p=>p.getAttribute('class').split(' ').find(c=>c.startsWith('trend-')).slice(6)),wanted.pointStates);
  }
  if(kind==='fertility'){
  const prolactin=markers.find(m=>m.querySelector('.change strong').textContent==='Decreased by 10 ng/mL');
  assert.deepEqual([...prolactin.querySelectorAll('.result-point')].map(p=>p.getAttribute('class')),['result-point trend-out-of-range range-above','result-point trend-normal-transition range-within']);
  }
  assert(paper.querySelector('.summary-footer').textContent.includes('A change is not a diagnosis'));
 }finally{dom.window.close();for(const key of globals){if(previous[key]===undefined)delete globalThis[key];else globalThis[key]=previous[key];}}
});
