import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {pageCountLabel} from '../src/report-page-count.js';
import {createReportCache,memoryReportStore} from '../src/report-cache.js';

test('card page counts use a comma, singular page and plural pages; unknown counts stay missing',()=>{
 assert.equal(pageCountLabel(27),', 27 pages');assert.equal(pageCountLabel(1),', 1 page');
 for(const count of [undefined,null,0,-1,1.5,NaN,'27'])assert.equal(pageCountLabel(count),'');
});
test('page metadata can inspect cached originals and readings without downloading or reading again',async()=>{
 let downloads=0;const report={id:'fictional',name:'Fictional.pdf',size:12,contentType:'application/pdf'},store=memoryReportStore();
 const make=()=>createReportCache({scope:'fictional-session',store,download:async()=>{downloads++;return new Blob(['fictional']);}});
 let cache=make();assert.equal(await cache.peek(report),null);assert.equal(downloads,0);
 await cache.remember(report,new Blob(['fictional']));await cache.reading(report,async()=>({pageCount:27}));cache=make();
 assert.equal((await cache.peek(report,'reading')).pageCount,27);assert.equal(await(await cache.peek(report)).text(),'fictional');assert.equal(downloads,0);
 assert.equal(await cache.peek({...report,size:13}),null,'Changed file metadata cannot reuse an old count');
});
test('PDF page count uses actual total pages including scanned covers, with no OCR or AI',async()=>{
 const bundle=await build({entryPoints:['src/report-reader.js'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'native-pdf',setup(b){
  b.onResolve({filter:/pdfjs-dist\/.*\?url$/},a=>({path:a.path,namespace:'worker'}));
  b.onLoad({filter:/.*/,namespace:'worker'},a=>({contents:`export default ${JSON.stringify(import.meta.resolve(a.path.replace('?url','')))}`}));
  b.onResolve({filter:/^pdfjs-dist\//},a=>({path:import.meta.resolve(a.path),external:true}));
 }}]});
 const {pdfPageCount}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
 for(const [file,count] of [['blood-sample-january.pdf',2],['vision-sample.pdf',1],['plain-page-counts-fictional.pdf',3],['scan-filter-sample.pdf',27]])assert.equal(await pdfPageCount(new Blob([await readFile(new URL(`./fixtures/${file}`,import.meta.url))])),count);
});
test('saved page counts are private to the report owner and require a positive whole number',async()=>{
 const bundle=await build({entryPoints:['convex/reports.ts'],bundle:true,write:false,platform:'node',format:'esm'});
 const {setPageCount}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
 const sessionKey='a'.repeat(64),writes=[],ctx={db:{get:async()=>({sessionKey}),patch:async(...args)=>writes.push(args)}};
 await setPageCount._handler(ctx,{sessionKey,reportId:'fictional',pageCount:27});assert.deepEqual(writes,[['reports','fictional',{pageCount:27}]]);
 for(const pageCount of [0,-1,1.5])await assert.rejects(setPageCount._handler(ctx,{sessionKey,reportId:'fictional',pageCount}),/Invalid report page count/);
 await assert.rejects(setPageCount._handler(ctx,{sessionKey:'b'.repeat(64),reportId:'fictional',pageCount:27}),/not found/);assert.equal(writes.length,1);
});
