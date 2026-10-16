import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
test('source links open the physical PDF page, highlight its row, and clear the highlight on other pages',async()=>{
 const dom=new JSDOM('<main id="app">Existing summary</main>',{url:'http://localhost:5173'});
 const keys=['window','document','requestAnimationFrame','__sourcePages'];const old=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,requestAnimationFrame:fn=>fn(),__sourcePages:[]});
 dom.window.scrollTo=()=>{};dom.window.HTMLElement.prototype.scrollIntoView=function(){this.dataset.scrolled='true';};dom.window.HTMLCanvasElement.prototype.getContext=()=>({});
 const bundle=await build({entryPoints:['src/report-viewer.js'],bundle:true,write:false,format:'esm',platform:'node',loader:{'.css':'empty'},plugins:[{name:'mock-pdf',setup(b){b.onResolve({filter:/pdfjs-dist/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.includes('worker')?'export default "worker"':`export const GlobalWorkerOptions={};export function getDocument(){return {destroy(){},promise:Promise.resolve({numPages:20,async getPage(n){globalThis.__sourcePages.push(n);return {getViewport:()=>({width:600,height:800}),render:()=>({promise:Promise.resolve(),cancel(){}})}}})}}`}));}}]});
 try{
  const {openReportViewer}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  await openReportViewer({name:'Original PDF',page:'9',sourceTop:.72,sourceName:'Calcium',load:async()=>new Blob(['pdf'],{type:'application/pdf'})});
  assert.deepEqual(globalThis.__sourcePages,[9]);
  assert.equal(document.querySelector('.viewer-source-highlight').style.top,'70.8%');
  assert.equal(document.querySelector('.viewer-source-highlight').dataset.scrolled,'true');
  assert.match(document.querySelector('.viewer-source-note').textContent,/Calcium on page 9/);
  document.querySelector('[data-next]').click();await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(globalThis.__sourcePages,[9,10]);assert.equal(document.querySelector('.viewer-source-highlight'),null);
  assert.equal(document.querySelector('.viewer-source-note').hidden,true);
  document.querySelector('.viewer-back').click();assert.equal(document.querySelector('#app').hidden,false);assert.equal(document.querySelector('.original-viewer'),null);
 }finally{dom.window.close();for(const k of keys)if(old[k]===undefined)delete globalThis[k];else globalThis[k]=old[k];}
});

test('vision highlights use OCR row boxes and never fall back to the model estimate',async()=>{
 const dom=new JSDOM('<main id="app">Summary</main>',{url:'http://localhost:5173'}),keys=['window','document','requestAnimationFrame','__scanBox','__ocrNames'];const old=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,requestAnimationFrame:fn=>fn(),__ocrNames:[]});dom.window.scrollTo=()=>{};dom.window.HTMLElement.prototype.scrollIntoView=()=>{};dom.window.HTMLCanvasElement.prototype.getContext=()=>({});
 try{
 const out=await build({entryPoints:['src/report-viewer.js'],bundle:true,write:false,format:'esm',platform:'node',loader:{'.css':'empty'},plugins:[{name:'fake-render-and-ocr',setup(b){b.onResolve({filter:/pdfjs-dist|ocr-reader\.js$/},a=>({path:a.path,namespace:'fake'}));b.onLoad({filter:/.*/,namespace:'fake'},a=>({contents:a.path.includes('ocr-reader')?`export async function makeOcrReader(){return {locate:async(_canvas,name)=>{globalThis.__ocrNames.push(name);return globalThis.__scanBox;},close:async()=>{}};}`:a.path.includes('worker')?'export default "worker"':`export const GlobalWorkerOptions={};export function getDocument(){return {destroy(){},promise:Promise.resolve({numPages:1,getPage:async()=>({getViewport:()=>({width:600,height:800}),render:()=>({promise:Promise.resolve(),cancel(){}})})})}}`}));}}]});
 const {openReportViewer}=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));
 const args={name:'Fictional scan',page:1,sourceTop:.2,sourceName:'Calcium',sourceOcrName:'Calcium, Serum',readPath:'vision',load:async()=>new Blob(['pdf'],{type:'application/pdf'})};
 globalThis.__scanBox={top:.31,left:.04,width:.9,height:.035};await openReportViewer(args);let box=document.querySelector('.viewer-source-highlight');assert.equal(box.style.top,'31%');assert(Math.abs(parseFloat(box.style.height)-3.5)<.001);assert.deepEqual(globalThis.__ocrNames,['Calcium, Serum']);document.querySelector('.viewer-back').click();
 globalThis.__scanBox=null;await openReportViewer(args);assert.equal(document.querySelector('.viewer-source-highlight'),null);assert(document.querySelector('.viewer-document canvas'));assert.match(document.querySelector('.viewer-source-note').textContent,/No reliable/);document.querySelector('.viewer-back').click();
 const calls=globalThis.__ocrNames.length;await openReportViewer({...args,readPath:undefined,sourceTop:.72});box=document.querySelector('.viewer-source-highlight');assert.equal(box.style.top,'70.8%');assert.equal(box.style.height,'');assert.equal(globalThis.__ocrNames.length,calls);document.querySelector('.viewer-back').click();
 console.log('VIEWER PROOF: scan uses OCR bounds; uncertain scan opens with no box; text PDF keeps its original 70.8% position and performs no OCR.');
 }finally{dom.window.close();for(const k of keys)if(old[k]===undefined)delete globalThis[k];else globalThis[k]=old[k];}
});
