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
  await analysis.prepare();assert.deepEqual(downloads,['january']);
  assert(root.querySelector('#analysis-status').textContent.includes('temporarily unavailable'));
  assert.equal(root.querySelector('#retry-summary').hidden,false);
  assert.equal(root.querySelector('#retry-summary').disabled,false);
  assert.equal(root.querySelector('#prepare-summary').disabled,false);
  assert.equal(root.querySelector('#real-summary').textContent,'','Failed analysis cannot show fabricated results');
  analysis.updateReports(saved,['january']);
  assert.equal(root.querySelector('#prepare-summary').disabled,true);
  assert.equal(root.querySelector('#analysis-selection-count').textContent,'1 of 10 reports selected');
 }finally{dom.window.close();for(const key of globals){if(previous[key]===undefined)delete globalThis[key];else globalThis[key]=previous[key];}}
});
