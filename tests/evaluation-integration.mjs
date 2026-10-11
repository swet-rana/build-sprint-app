// Explicit live check using fictional fixtures and a fresh isolated browser session.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api.js';
const url=process.env.EVALUATION_TEST_CONVEX_URL;
if(!url)throw Error('Set EVALUATION_TEST_CONVEX_URL to the deployment being tested.');
const client=new ConvexHttpClient(url),sessionKey=randomBytes(32).toString('hex'),otherSession=randomBytes(32).toString('hex');
const site=url.replace('.convex.cloud','.convex.site');
const reportIds=[];
for(const name of ['january','july']){
 const form=new FormData();form.set('sessionKey',sessionKey);form.set('uploadId',randomUUID());form.set('file',new File([await readFile(new URL(`./fixtures/fertility-sample-${name}.pdf`,import.meta.url))],`evaluation-${name}.pdf`,{type:'application/pdf'}));
 const response=await fetch(`${site}/reports/upload`,{method:'POST',headers:{Origin:site},body:form});assert(response.ok,await response.clone().text());reportIds.push((await response.json()).reportId);
}
const output=JSON.parse(await readFile(new URL('./fixtures/fertility-summary.expected.json',import.meta.url)));
for(const kind of ['report-reading','summary']){
 const ids=kind==='report-reading'?[reportIds[0]]:reportIds;
 const runKey=randomUUID(),args={sessionKey,kind,reportIds:ids,engine:'isolated integration test v1',runKey};
 const runId=await client.mutation(api.evaluations.begin,args);
 assert.equal(await client.mutation(api.evaluations.begin,args),runId,'Retried begin must reuse the record');
 assert.equal((await client.query(api.evaluations.get,{sessionKey,runId})).status,'running');
 await client.action(api.evaluations.finish,{sessionKey,runId,outputJson:JSON.stringify(output)});
 const saved=await client.query(api.evaluations.get,{sessionKey,runId});assert.equal(saved.status,'succeeded');assert.deepEqual(saved.reportIds,ids);assert(saved.finishedAt>=saved.startedAt);assert(saved.outputUrl);
 await client.action(api.evaluations.finish,{sessionKey,runId,outputJson:JSON.stringify({incorrect:'A retry must not overwrite a completed output'})});
 assert.equal((await client.query(api.evaluations.get,{sessionKey,runId})).outputUrl,saved.outputUrl);
 assert.deepEqual(await(await fetch(saved.outputUrl)).json(),output);
 assert.equal(await client.query(api.evaluations.get,{sessionKey:otherSession,runId}),null);
 await assert.rejects(client.action(api.evaluations.finish,{sessionKey:otherSession,runId,error:'Forbidden'}));
 console.log(`${kind}: Convex saved full output; retries reused the record and preserved its output; another session cannot access it.`);
}
const failed=await client.mutation(api.evaluations.begin,{sessionKey,kind:'report-reading',reportIds:[reportIds[0]],engine:'isolated integration test v1'});
await client.action(api.evaluations.finish,{sessionKey,runId:failed,error:'Unreadable sample'});
assert.equal((await client.query(api.evaluations.get,{sessionKey,runId:failed})).error,'Unreadable sample');console.log('Reading error saved correctly.');
await assert.rejects(client.mutation(api.evaluations.begin,{sessionKey:otherSession,kind:'summary',reportIds,engine:'test'}));
for(const reportId of reportIds)await client.mutation(api.reports.setDeleted,{sessionKey,reportId,deleted:true});
console.log('Cross-session input rejected; fictional test uploads moved to their isolated session’s trash.');
