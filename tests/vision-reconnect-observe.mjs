import {nodeTestTarget} from './test-target-node.mjs';
import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';import {ConvexHttpClient} from 'convex/browser';import {api} from '../convex/_generated/api.js';
const url=nodeTestTarget('vision-reconnect-observe.mjs','VISION_RECONNECT_CONVEX_URL',{devOnly:true});
const path=process.argv[process.argv.indexOf('--receipt')+1];if(!process.argv.includes('--receipt'))throw Error('Provide --receipt for the fictional browser test.');
const receipt=JSON.parse(await readFile(path,'utf8')),client=new ConvexHttpClient(url);let previous;
for(let attempt=0;attempt<100;attempt++){
 const job=await client.query(api.visionJobs.get,{sessionKey:receipt.sessionKey,jobId:receipt.jobId});assert(job);
 if(job.status!==previous){console.log(`TAB CLOSED: server status=${job.status}; attempt=${job.attempt}`);previous=job.status;}
 if(job.status==='failed')assert.fail(job.error);
 if(job.status==='succeeded'){
  assert.equal(job.attempt,1);assert.deepEqual(job.result.tests.map(t=>Number(t.value)),[13.2,3,24]);assert.equal(job.result.reportDate,'2026-07-15');
  const statuses=await client.query(api.visionJobs.statuses,{sessionKey:receipt.sessionKey,readingId:receipt.readingId});assert.equal(statuses.length,1);assert.equal(statuses[0].jobId,receipt.jobId);
  console.log('PASS: server finished with the tab closed; 3 known values and date match the fictional PDF.');console.log('PASS: exactly one saved page job; attempt 1.');process.exit(0);
 }
 await new Promise(resolve=>setTimeout(resolve,500));
}
throw Error('Timed out waiting for the scheduled dev job.');
