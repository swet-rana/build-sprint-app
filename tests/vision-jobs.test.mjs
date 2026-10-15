import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {getFunctionName} from 'convex/server';
const compiled=await build({entryPoints:['convex/visionJobs.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const jobs=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const scan={reportKind:'blood',patientName:'Fictional Patient',reportDate:'2026-07-15',tests:[{name:'Haemoglobin',value:'13.2',unit:'g/dL',referenceRange:'12-16',readable:true,sourceTop:.2}]};
function harness(){
 const sessionKey='a'.repeat(64),rows=new Map([['reading',{_id:'reading',sessionKey,owner:`browser:${sessionKey}`,reportIds:['report'],pages:0,createdAt:Date.now()}],['report',{_id:'report',sessionKey,name:'Fictional multi-page.pdf',storageId:'original',contentType:'application/pdf'}]]),scheduled=[];
 const db={get:async(_t,id)=>rows.get(id)??null,patch:async(_t,id,change)=>{const row=rows.get(id);for(const[k,v]of Object.entries(change))if(v===undefined)delete row[k];else row[k]=v;},insert:async(table,value)=>{const id=table+'-'+rows.size;rows.set(id,{_id:id,table,...value});return id;},query:table=>({withIndex(_name,filter){const fields=[];const q={eq(k,v){fields.push([k,v]);return q;}};filter(q);const found=()=>[...rows.values()].filter(r=>r.table===table&&fields.every(([k,v])=>r[k]===v));return{unique:async()=>found()[0]??null,first:async()=>found()[0]??null,take:async n=>found().slice(0,n)}}})};
 const ctx={db,auth:{getUserIdentity:async()=>null},scheduler:{runAfter:async(delay,ref,args)=>{scheduled.push({delay,name:getFunctionName(ref),args});return 'scheduled';}}};
 return {ctx,rows,scheduled,args:{sessionKey,readingId:'reading',reportId:'report',page:3,image:'data:image/jpeg;base64,/9j/AA=='}};
}
test('enqueue atomically saves reading and schedules once; completed page is reused after reconnect',async()=>{
 const h=harness(),id=await jobs.enqueue._handler(h.ctx,h.args);
 assert.equal(h.rows.get(id).status,'reading');assert.equal(h.scheduled[0].delay,0);assert.equal(h.scheduled[0].name,'visionJobs:run');
 assert.equal(await jobs.enqueue._handler(h.ctx,h.args),id);assert.equal(h.scheduled.length,2,'One action and its timeout guard only');
 const claimed=await jobs.claim._handler(h.ctx,{jobId:id,attempt:1});assert(claimed.image);assert.equal(await jobs.claim._handler(h.ctx,{jobId:id,attempt:1}),null,'Cannot run a provider call twice');
 await jobs.finish._handler(h.ctx,{jobId:id,attempt:1,result:scan});
 const result=await jobs.get._handler(h.ctx,{sessionKey:h.args.sessionKey,jobId:id});assert.equal(result.status,'succeeded');assert.deepEqual(result.result,scan);assert(!('image'in result));assert(!('image'in h.rows.get(id)));
 assert.equal(await jobs.enqueue._handler(h.ctx,{...h.args,retry:true}),id);assert.equal(h.scheduled.length,2,'Reopening/retrying a completed page must not schedule another read');
 console.log('STATUS reading -> succeeded; reconnect reused the same job and result; new AI calls: 0.');
});
test('failed jobs show plain error, retry explicitly and ignore stale completion',async()=>{
 const h=harness(),id=await jobs.enqueue._handler(h.ctx,h.args);
 await jobs.finish._handler(h.ctx,{jobId:id,attempt:1,error:'[CONVEX A(vision:read)] Connection lost while action was in flight'});
 assert.equal((await jobs.get._handler(h.ctx,{sessionKey:h.args.sessionKey,jobId:id})).error,jobs.READING_FAILURE);
 await jobs.enqueue._handler(h.ctx,h.args);assert.equal(h.scheduled.length,2,'Reconnecting must not retry a failed provider call');
 await jobs.enqueue._handler(h.ctx,{...h.args,retry:true});assert.equal(h.rows.get(id).attempt,2);assert.equal(h.rows.get(id).status,'reading');
 await jobs.finish._handler(h.ctx,{jobId:id,attempt:1,result:scan});assert.equal(h.rows.get(id).status,'reading');
 await jobs.finish._handler(h.ctx,{jobId:id,attempt:2,result:scan});assert.equal(h.rows.get(id).status,'succeeded');
 console.log('STATUS reading -> failed -> reading -> succeeded; Try again is explicit; raw Convex error hidden.');
});
test('job access is private and an interrupted scheduler cannot leave reading forever',async()=>{
 const h=harness(),id=await jobs.enqueue._handler(h.ctx,h.args);
 assert.equal(await jobs.get._handler(h.ctx,{sessionKey:'b'.repeat(64),jobId:id}),null);
 await assert.rejects(jobs.enqueue._handler(h.ctx,{...h.args,sessionKey:'b'.repeat(64)}));
 await jobs.expire._handler(h.ctx,{jobId:id,attempt:1});assert.equal(h.rows.get(id).status,'failed');
 assert.equal((await jobs.get._handler(h.ctx,{sessionKey:h.args.sessionKey,jobId:id})).error,jobs.READING_FAILURE);
});

test('scheduled action writes the real reader result and cannot call the provider twice',async()=>{
 const h=harness(),id=await jobs.enqueue._handler(h.ctx,h.args),beforeFetch=globalThis.fetch,beforeKey=process.env.OPENAI_API_KEY;let providerCalls=0;
 process.env.OPENAI_API_KEY='fictional-key';
 const ctx={...h.ctx,storage:{store:async()=> 'fictional-log'},runMutation:async(ref,args)=>{
  const name=getFunctionName(ref);
  if(name==='visionJobs:claim')return jobs.claim._handler(h.ctx,args);
  if(name==='visionJobs:finish')return jobs.finish._handler(h.ctx,args);
  if(name==='vision:reserve'){assert.equal(args.jobId,id);return 'fictional-evaluation';}
  if(name==='evaluations:complete')return true;
  assert.fail(name);
 }};
 globalThis.fetch=async()=>{providerCalls++;return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(scan)}]}]});};
 try{await jobs.run._handler(ctx,{jobId:id,attempt:1});assert.equal(h.rows.get(id).status,'succeeded');assert.equal(h.rows.get(id).result.tests[0].value,'13.2');await jobs.run._handler(ctx,{jobId:id,attempt:1});assert.equal(providerCalls,1);}
 finally{globalThis.fetch=beforeFetch;if(beforeKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=beforeKey;}
});

test('failed job keeps friendly message and exposes the saved cap reason without a stack trace',async()=>{
 const h=harness(),id=await jobs.enqueue._handler(h.ctx,h.args);
 const reason='Scan reading stopped: the limit is 30 vision pages per summary preparation. Choose a smaller set of result pages.';
 await jobs.finish._handler(h.ctx,{jobId:id,attempt:1,error:`Uncaught ConvexError: ${reason}\n    at handler (../../convex/vision.ts:33:7)\n`});
 const result=await jobs.get._handler(h.ctx,{sessionKey:h.args.sessionKey,jobId:id});
 assert.equal(result.error,jobs.READING_FAILURE);assert.equal(result.failureReason,reason);assert(!result.failureReason.includes('at handler'));
});
