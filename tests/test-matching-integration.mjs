import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api.js';
const env=Object.fromEntries((await readFile('.env.local','utf8')).split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const cloud=process.env.MATCHING_TEST_CONVEX_URL??env.VITE_CONVEX_URL,client=new ConvexHttpClient(cloud),sessionKey=randomBytes(32).toString('hex');
const body=new FormData();body.append('sessionKey',sessionKey);body.append('uploadId',randomUUID());body.append('file',new Blob([await readFile('tests/fixtures/sample-blood-report.pdf')],{type:'application/pdf'}),'Fictional matching check.pdf');
const response=await fetch(cloud.replace('.convex.cloud','.convex.site')+'/reports/upload',{method:'POST',headers:{Origin:'http://localhost:5173'},body});assert.equal(response.status,201);const {reportId}=await response.json();
try{
 const args={sessionKey,reportIds:[reportId],entries:[{name:'Blood haemoglobin level',unit:'g/L',specimen:'blood',method:''}]};
 const first=await client.action(api.testMatching.match,args);assert.equal(first.length,1);assert.equal(first[0].status,'mapped');assert.equal(first[0].standardId,'haemoglobin');
 const second=await client.action(api.testMatching.match,{...args,entries:[{...args.entries[0],unit:'g/dL'}]});assert.equal(second[0]._id,first[0]._id);assert.equal(second[0].finishedAt,first[0].finishedAt);
 console.log('PASS: actual OpenAI server action maps fictional Blood haemoglobin level to haemoglobin.');console.log('PASS: another unit reuses the same saved mapping without a second AI call.');console.log(JSON.stringify({deployment:cloud,mapping:first[0]},null,2));
}finally{await client.mutation(api.reports.setDeleted,{sessionKey,reportId,deleted:true});}
