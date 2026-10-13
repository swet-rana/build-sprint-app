import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
// Exercise the actual Convex action handler; only its provider and database transports are replaced.
const bundle=await build({entryPoints:['convex/vision.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {read}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
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
