import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';

// Expected values are independently transcribed from the fictional PDFs.
// Only file download and browser-only behavior are replaced; reading, parsing,
// comparison and the finished summary renderer are the application's real code.
for(const kind of ['fertility','blood','semen'])test(`finished summary matches the original ${kind} PDFs, even when selected backwards`,async()=>{
 const expected=JSON.parse(await readFile(new URL(`./fixtures/${kind}-summary.expected.json`,import.meta.url)));
 const files=await Promise.all(['january','july'].map(name=>readFile(new URL(`./fixtures/${kind}-sample-${name}.pdf`,import.meta.url))));
 const dom=new JSDOM('<div id="summary" hidden></div>',{url:'http://localhost:5173'});
 dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
 dom.window.matchMedia=()=>({matches:true});
 const globals=['window','document','localStorage','MutationObserver','fetch'];
 const previous=Object.fromEntries(globals.map(key=>[key,globalThis[key]]));
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,MutationObserver:dom.window.MutationObserver});
 const downloads=[];
 globalThis.fetch=async(url,options)=>{const id=JSON.parse(options.body).reportId;downloads.push(id);return new Response(files[id==='january'?0:1],{headers:{'Content-Type':'application/pdf'}});};
 const bundle=await build({entryPoints:['src/analysis.js'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env.VITE_CONVEX_URL':'"https://fictional.convex.cloud"'},loader:{'.css':'empty'},plugins:[{
  name:'node-pdf-worker',setup(builder){
   builder.onResolve({filter:/pdfjs-dist\/.*\?url$/},args=>({path:args.path,namespace:'worker-url'}));
   builder.onLoad({filter:/.*/,namespace:'worker-url'},args=>({contents:`export default ${JSON.stringify(import.meta.resolve(args.path.replace('?url','')))}`}));
   builder.onResolve({filter:/^pdfjs-dist\//},args=>({path:import.meta.resolve(args.path),external:true}));
  }
 }]});
 try{
  const {mountAnalysis}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const root=document.querySelector('#summary');const analysis=mountAnalysis(root,()=>{});
  analysis.updateReports(['july','january'].map((id,i)=>({id,serial:i+1,name:`${kind}-sample-${id}.pdf`,contentType:'application/pdf',size:files[id==='january'?0:1].length})),['july','january']);
  assert.equal(downloads.length,0);
  await analysis.prepare();
  assert.equal(root.querySelector('#retry-summary').hidden,true,root.querySelector('#analysis-status').textContent);
  assert.deepEqual(downloads,['july','january']);
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
