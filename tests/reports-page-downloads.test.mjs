import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

// Mount the actual Reports page against a fake backend: no stored data is touched.
const reports = [
  { id:'pdf-1',serial:1,name:'Fictional.pdf',contentType:'application/pdf',size:5000000 },
  { id:'photo-2',serial:2,name:'Fictional.jpg',contentType:'image/jpeg',size:80000 },
];
test('loading Reports once downloads zero files; only Open report downloads a file', async () => {
  const dom = new JSDOM('<div id="reports"></div>', {url:'http://localhost:5173'});
  const previous = Object.fromEntries(['window','document','localStorage','fetch'].map(key=>[key,globalThis[key]]));
  Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
  const downloads=[],mutations=[],selections=[];
  globalThis.__reportHarness={reports,mutations};
  globalThis.fetch=async(url,options)=>{
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
    const root=document.querySelector('#reports');mountUploads(root,(...args)=>selections.push(args));
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
    root.querySelector('[data-report-id="pdf-1"]').click();
    await new Promise(resolve=>setTimeout(resolve,20));
    assert.deepEqual(downloads,['pdf-1'],'Open report must download just the clicked file');
    console.log('PROOF: initial Reports load = 0 file downloads; search + For summary = 0; Open report = 1.');
  }finally{dom.window.close();Object.assign(globalThis,previous);delete globalThis.__reportHarness;}
});
