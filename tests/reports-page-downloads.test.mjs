import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

// Mount the actual Reports page against a fake backend: no stored data is touched.
const reports = [
  { id:'pdf-1',serial:1,name:'Fictional.pdf',contentType:'application/pdf',size:5000000 },
  { id:'photo-2',serial:2,name:'Fictional.jpg',contentType:'image/jpeg',size:80000 },
];
test('PDF cards stay unopened; central selection and private image previews work', async () => {
  const dom = new JSDOM('<div id="reports"></div>', {url:'http://localhost:5173'});
  const previous = Object.fromEntries(['window','document','localStorage','fetch','FormData'].map(key=>[key,globalThis[key]]));
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,FormData:dom.window.FormData});
  const uploadScrolls=[];window.matchMedia=()=>({matches:false});
  window.HTMLElement.prototype.scrollIntoView=function(options){uploadScrolls.push({id:this.id,...options});};
  const downloads=[],uploads=[],mutations=[],selections=[];let summaries=0;const previousObserver=globalThis.IntersectionObserver;
  globalThis.__reportHarness={reports,mutations};
  globalThis.fetch=async(url,options)=>{
    if(String(url).endsWith('/reports/upload')){uploads.push(options.body.get('file').name);return Response.json({ok:true});}
    if(String(url).endsWith('/reports/open'))downloads.push(JSON.parse(options.body).reportId);
    return new Response(new Blob(['fictional file']),{status:200});
  };
  const bundled=await build({entryPoints:['src/uploads.js'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env.VITE_CONVEX_URL':'"https://fictional.convex.cloud"'},loader:{'.css':'empty'},plugins:[{
    name:'isolated-reports-backend',setup(builder){
      builder.onResolve({filter:/^(convex\/browser)$|report-viewer\.js$|report-reader\.js$|_generated\/api$/},args=>({path:args.path,namespace:'fake'}));
      builder.onLoad({filter:/.*/,namespace:'fake'},args=>({contents:
        args.path==='convex/browser'?`export class ConvexClient { onUpdate(name,args,callback){queueMicrotask(()=>callback(name==='listPage'?{page:globalThis.__reportHarness.reports,isDone:true,continueCursor:null}:name==='trash'?{page:[],isDone:true,continueCursor:null}:globalThis.__reportHarness.reports));return {unsubscribe(){}};} async mutation(name,args){globalThis.__reportHarness.mutations.push(name);return null;} }`:
        args.path.includes('_generated/api')?`export const api={reports:{listPage:'listPage',list:'list',trash:'trash',ensureNumbers:'ensureNumbers',setContentHash:'setContentHash',updateDetails:'updateDetails'}};`:
        args.path.includes('report-viewer')?`export async function openReportViewer({load}){await load();}`:
        `export async function reportPreview(){return 'data:image/png;base64,AA==';} export async function readLabReport(){throw Error('Fictional file');}`
      }));
    }
  }]});
  try{
    const {mountUploads}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
    const root=document.querySelector('#reports');const selection=mountUploads(root,(...args)=>selections.push(args),()=>summaries++);
    await new Promise(resolve=>setTimeout(resolve,60));
    assert.equal(root.querySelectorAll('[data-report-id]').length,2,'Both saved report cards must be rendered');
    assert.equal(downloads.length,0,`Reports load downloaded ${downloads.length} files`);
    assert(!mutations.includes('setContentHash')&&!mutations.includes('updateDetails'),'Page load must not backfill stored report data');
    root.querySelector('#search-reports').value='Fictional';
    root.querySelector('#search-reports').dispatchEvent(new window.Event('input',{bubbles:true}));
    root.querySelector('[data-analysis-id]').checked=true;
    root.querySelector('[data-analysis-id]').dispatchEvent(new window.Event('change',{bubbles:true}));
    await new Promise(resolve=>setTimeout(resolve,20));
    assert.equal(downloads.length,0,'Search/render and For summary selection must not download files');
    assert(selections.at(-1)[1].length===1,'For summary still publishes the chosen report');
    assert.equal(root.querySelectorAll('#move-to-summary').length,1,'There is just one summary action');
    assert.equal(root.querySelector('.reports-selection-bar').hidden,false);
    assert.equal(root.querySelector('#move-to-summary').disabled,true,'One report cannot be compared');
    const second=root.querySelector('[data-analysis-id="photo-2"]');second.checked=true;second.dispatchEvent(new window.Event('change',{bubbles:true}));
    assert.equal(root.querySelector('#selected-report-count').textContent,'2 of 10 reports selected');
    root.querySelector('#move-to-summary').click();assert.equal(summaries,1);
    assert.deepEqual(selections.at(-1)[1],['pdf-1','photo-2']);
    selection.removeFromAnalysis('photo-2');
    assert.deepEqual(selections.at(-1)[1],['pdf-1'],'Removing from Summary publishes through the existing selection');
    assert.deepEqual(JSON.parse(localStorage.getItem('health-history-analysis-reports')),['pdf-1']);
    assert.equal(root.querySelector('[data-analysis-id="photo-2"]').checked,false);
    assert.equal(root.querySelector('#move-to-summary').disabled,true);
    root.querySelector('#unselect-all-reports').click();assert.equal(selections.at(-1)[1].length,0);
    assert.equal(root.querySelector('.reports-selection-bar').hidden,true);
    assert.equal(root.querySelectorAll('[data-analysis-id]:checked').length,0);
    root.querySelector('[data-report-id="pdf-1"]').click();
    await new Promise(resolve=>setTimeout(resolve,20));
    assert.deepEqual(downloads,['pdf-1'],'Open report must download just the clicked file');
    let observer;
    globalThis.IntersectionObserver=class{constructor(callback){this.callback=callback;this.targets=[];observer=this;}observe(target){this.targets.push(target);}unobserve(){}disconnect(){this.targets=[];}};
    root.querySelector('[data-report-filter="image"]').click();
    assert.equal(root.querySelectorAll('[data-report-id]').length,1);
    observer.callback(observer.targets.map(target=>({target,isIntersecting:true})));
    await new Promise(resolve=>setTimeout(resolve,25));
    assert.deepEqual(downloads,['pdf-1','photo-2'],'Only the visible image is loaded for its thumbnail');
    assert.equal(root.querySelectorAll('.report-preview img').length,1);
    root.querySelector('#search-reports').value='No match';root.querySelector('#search-reports').dispatchEvent(new window.Event('input',{bubbles:true}));
    assert.equal(root.querySelector('.reports-empty h3').textContent,'No matching reports');
    root.querySelector('[data-clear-filters]').click();assert.equal(root.querySelectorAll('[data-report-id]').length,2);
    observer.callback(observer.targets.map(target=>({target,isIntersecting:true})));
    await new Promise(resolve=>setTimeout(resolve,25));assert.equal(downloads.length,2,'Cached thumbnails do not redownload when filters change');
    root.querySelector('[data-report-id="photo-2"]').click();
    root.querySelector('[data-report-id="pdf-1"]').click();
    await new Promise(resolve=>setTimeout(resolve,25));
    assert.deepEqual(downloads,['pdf-1','photo-2'],'Opening the thumbnail image or reopening a PDF reuses the shared original');
    root.querySelector('#show-upload').click();
    assert.deepEqual(uploadScrolls.at(-1),{id:'add-reports-panel',behavior:'smooth',block:'start'},'Opening upload must reveal the visible panel, not its one-pixel file input');
    assert.equal(root.querySelector('.reports-selection-bar').nextElementSibling.id,'add-reports-panel','The summary action stays above the expanded upload form');
    const scrollCount=uploadScrolls.length;
    root.querySelector('#show-upload').click();
    assert.equal(uploadScrolls.length,scrollCount,'Closing upload must not move the page');
    window.matchMedia=()=>({matches:true});
    root.querySelector('#show-upload').click();
    assert.deepEqual(uploadScrolls.at(-1),{id:'add-reports-panel',behavior:'instant',block:'start'},'Reduced motion must reveal the same panel without animation');
    const picker=root.querySelector('#report-files');
    assert.equal(picker.multiple,true,'The native picker must allow multiple files');
    const choose=files=>{Object.defineProperty(picker,'files',{value:files,configurable:true});picker.dispatchEvent(new window.Event('change',{bubbles:true}));};
    const file=name=>new window.File(['fictional report'],name,{type:'application/pdf'});
    choose([file('first.pdf'),file('second.pdf')]);
    assert.equal(root.querySelectorAll('#upload-queue li').length,2);
    assert.equal(root.querySelector('#upload-submit').textContent,'Upload 2 reports');
    choose([file('third.pdf')]);
    assert.equal(root.querySelectorAll('#upload-queue li').length,3,'Adding a file must preserve earlier choices');
    choose([new window.File(['invalid'],'invalid.txt',{type:'text/plain'})]);
    assert.equal(root.querySelectorAll('#upload-queue li').length,3,'An invalid choice must not discard valid reports');
    root.querySelector('#upload-submit').click();
    await new Promise(resolve=>setTimeout(resolve,30));
    assert.deepEqual(uploads,['first.pdf','second.pdf','third.pdf'],'One upload submits all accumulated files');
    assert.equal(root.querySelectorAll('#upload-queue li').length,0);
    assert.match(root.querySelector('#upload-status').textContent,/3 reports uploaded/);
    choose([file('clear-first.pdf'),file('clear-second.pdf')]);root.querySelector('#clear-selection').click();
    assert.equal(root.querySelectorAll('#upload-queue li').length,0,'Clear selection still clears the entire pending queue');
    console.log('PROOF: PDF cards remain unopened; central summary preserves selected IDs; visible image thumbnails load privately once.');
  }finally{dom.window.close();Object.assign(globalThis,previous);delete globalThis.__reportHarness;globalThis.IntersectionObserver=previousObserver;}
});
