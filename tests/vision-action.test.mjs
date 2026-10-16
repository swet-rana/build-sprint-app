import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
// Exercise the actual Convex action handler; only its provider and database transports are replaced.
const bundle=await build({entryPoints:['convex/vision.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {read,reserve}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
test('The server action stops on provider failure and saves its raw request, response and OCR rejection',async()=>{
 const previousFetch=globalThis.fetch,previousKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='fictional-test-key';
 const records=[],blobs=[];let reserved=0;
 const ctx={runMutation:async(ref,args)=>{if('readingId' in args){reserved++;return 'fictional-run';}records.push(args);return true;},storage:{store:async blob=>{blobs.push(blob);return `fictional-storage-${blobs.length}`;}}};
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,'Bearer fictional-test-key');return Response.json({error:{message:'fictional upstream failure'}},{status:429});};
 const diagnostics={page:1,threshold:80,lowConfidenceWords:[{text:'Fictional',confidence:79}]};
 try{
  await assert.rejects(read._handler(ctx,{sessionKey:'a'.repeat(64),readingId:'fake',reportId:'fake',page:1,image:'data:image/jpeg;base64,/9j/AA==',ocrDiagnostics:JSON.stringify(diagnostics)}),/API 429/);
  assert.equal(reserved,1);assert.equal(records.length,1);assert.match(records[0].error,/API 429/);
  const saved=JSON.parse(await blobs.at(-1).text());assert.deepEqual(saved.ocrDiagnostics,diagnostics);assert.deepEqual(saved.rawResponse,{error:{message:'fictional upstream failure'}});assert(saved.request.input[0].content[0].text.includes('Never guess'));assert.equal(saved.request.input[0].content[1].storageId,'fictional-storage-1');assert(!JSON.stringify(saved).includes('fictional-test-key'));
  const before=reserved;await assert.rejects(read._handler(ctx,{sessionKey:'a'.repeat(64),readingId:'fake',reportId:'fake',page:1,image:'data:image/jpeg;base64,'+'a'.repeat(750000)}),/too large/);assert.equal(reserved,before);
 }finally{globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey;}
});

function quotaContext({globalPages,legacy=[]}={}){
 const sessions=['a'.repeat(64),'b'.repeat(64)],rows=new Map(),writes=[];
 for(const [i,sessionKey] of sessions.entries()){
  rows.set(`reading-${i}`,{_id:`reading-${i}`,sessionKey,owner:`browser:${sessionKey}`,reportIds:[`report-${i}`],pages:0,createdAt:Date.now()});
  rows.set(`report-${i}`,{_id:`report-${i}`,sessionKey,storageId:`file-${i}`,name:'Fictional.pdf',contentType:'application/pdf'});
 }
 const ctx={auth:{getUserIdentity:async()=>null},db:{
  get:async(table,id)=>rows.get(id),
  query:table=>({withIndex(name,configure){
   assert.equal(name,'by_day');const fields=[];const q={eq(field,value){fields.push([field,value]);return q;}};
   configure(q);assert.equal(fields[0][0],'day');
   return {first:async()=>globalPages===undefined?null:{_id:'app-day',pages:globalPages},take:async count=>{assert.equal(table,'visionDaily');assert.equal(count,401);return legacy.map(calls=>({calls}));}};
  }}),
  patch:async(table,id,change)=>{writes.push({table,id,change});if(table==='visionAppDaily')globalPages=change.pages;else Object.assign(rows.get(id),change);},
  insert:async(table,value)=>{writes.push({table,value});if(table==='visionAppDaily'){globalPages=value.pages;return 'app-day';}return `evaluation-${writes.length}`;},
 }};
 return {ctx,rows,writes,sessions,usage:()=>globalPages,args:i=>({sessionKey:sessions[i],readingId:`reading-${i}`,reportId:`report-${i}`,page:1})};
}
test('Actual server reservation permits page 100, blocks page 101 and shares the hard 400-page cap across users',async()=>{
 const q=quotaContext({globalPages:399});q.rows.get('reading-0').pages=99;
 await reserve._handler(q.ctx,q.args(0));assert.equal(q.usage(),400);assert.equal(q.rows.get('reading-0').pages,100);
 const writes=q.writes.length;
 const perSummary=quotaContext({globalPages:0});perSummary.rows.get('reading-0').pages=100;await assert.rejects(reserve._handler(perSummary.ctx,perSummary.args(0)),/100 vision pages/);assert.equal(perSummary.writes.length,0);
 await assert.rejects(reserve._handler(q.ctx,q.args(0)),/400 vision pages/);
 await assert.rejects(reserve._handler(q.ctx,q.args(1)),/400 vision pages/);
 assert.equal(q.writes.length,writes,'Blocked requests must not reserve or log another provider attempt');assert.equal(q.rows.get('reading-1').pages,0);
});
test('The new global counter includes earlier daily reservations once and does not retain a ten-call user limit',async()=>{
 const q=quotaContext({legacy:[40,50]});q.rows.get('reading-0').pages=10;
 await reserve._handler(q.ctx,q.args(0));assert.equal(q.usage(),91);
 await reserve._handler(q.ctx,q.args(1));assert.equal(q.usage(),92);assert.equal(q.rows.get('reading-0').pages,11);
 const capped=quotaContext({legacy:[200,200]});await assert.rejects(reserve._handler(capped.ctx,capped.args(0)),/400 vision pages/);assert.equal(capped.writes.length,0);
});
test('The app-wide server cap prevents storage and provider calls before the action sends a page',async()=>{
 const q=quotaContext({globalPages:400}),previousKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='fictional-test-key';
 const ctx={runMutation:async(ref,args)=>reserve._handler(q.ctx,args),storage:{store:async()=>{assert.fail('A capped request must not upload or call the provider');}}};
 try{await assert.rejects(read._handler(ctx,{...q.args(1),image:'data:image/jpeg;base64,/9j/AA=='}),/400 vision pages/);}finally{if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey;}
});

test('Rejected image size saves page dimensions, format, byte count and exact rule without calling AI or reserving a vision page',async()=>{
 const oldKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='fictional-test-key';const calls=[],blobs=[];
 const ctx={runMutation:async(ref,args)=>{assert(!('readingId' in args),'Image validation must not reserve a vision page');calls.push(args);return 'fictional-run';},storage:{store:async blob=>{blobs.push(blob);return 'fictional-storage';}}};
 const image='data:image/jpeg;base64,'+'/9j/'.padEnd(750000,'A');
 try{await assert.rejects(read._handler(ctx,{sessionKey:'a'.repeat(64),readingId:'fictional',reportId:'fictional',page:2,image,imageMetadata:{width:1600,height:1200,sourceWidth:4032,sourceHeight:3024,fileType:'image/jpeg',byteSize:562500,dataUrlCharacters:image.length}}),/too large or invalid/);assert.equal(calls.length,2);assert.match(calls[0].engine,/image validation/);assert.match(calls[1].error,/too large or invalid/);const saved=JSON.parse(await blobs[0].text());assert.equal(saved.imageCheck.width,1600);assert.equal(saved.imageCheck.height,1200);assert.equal(saved.imageCheck.byteSize,562500);assert.equal(saved.imageCheck.fileType,'image/jpeg');assert.equal(saved.rejected,true);assert(saved.rule.includes('image.length>750000'));assert.equal(saved.image,undefined);}finally{if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;}
});

test('scheduled quota reservation keeps the verified signed-in owner without browser auth',async()=>{
 const q=quotaContext({globalPages:0});q.rows.get('reading-0').owner='user:fictional-user';
 q.rows.set('scheduled-job',{...q.args(0),status:'reading',startedAt:Date.now()});
 await reserve._handler(q.ctx,{...q.args(0),jobId:'scheduled-job'});assert.equal(q.usage(),1);assert.equal(q.rows.get('reading-0').pages,1);
 q.rows.get('scheduled-job').reportId='another-report';const before=q.usage();
 await assert.rejects(reserve._handler(q.ctx,{...q.args(0),jobId:'scheduled-job'}),/Invalid scheduled scan job/);assert.equal(q.usage(),before);
});

test('Apollo-sized preparation can continue beyond 30 vision pages without raising the daily limit',async()=>{
 const q=quotaContext({globalPages:30});q.rows.get('reading-0').pages=30;
 for(let page=31;page<=44;page++)await reserve._handler(q.ctx,{...q.args(0),page});
 assert.equal(q.rows.get('reading-0').pages,44);assert.equal(q.usage(),44);
 const daily=quotaContext({globalPages:400});daily.rows.get('reading-0').pages=30;
 await assert.rejects(reserve._handler(daily.ctx,daily.args(0)),/400 vision pages/);assert.equal(daily.writes.length,0);
});

test('explicit retry renews an expired preparation without resetting its spent page count',async()=>{
 const {begin}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),q=quotaContext({globalPages:40}),reading=q.rows.get('reading-0');
 reading.createdAt=Date.now()-7200000;reading.pages=30;reading.requestKey='same-request';
 q.ctx.db.query=()=>({withIndex:()=>({first:async()=>reading})});
 const id=await begin._handler(q.ctx,{sessionKey:q.sessions[0],reportIds:['report-0'],requestKey:'same-request',retry:true});
 assert.equal(id,'reading-0');assert.equal(reading.pages,30);assert(Date.now()-reading.createdAt<1000);assert.equal(q.usage(),40);
});
