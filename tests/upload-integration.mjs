// Uses only a fictional fixture and a new isolated browser key.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
const env = Object.fromEntries((await readFile('.env.local','utf8')).split('\n').filter(line=>line.includes('=')&&!line.startsWith('#')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i).trim(),line.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const cloud=env.VITE_CONVEX_URL || env.CONVEX_URL;
const site=cloud.replace('.convex.cloud','.convex.site');
const client=new ConvexHttpClient(cloud);
const owner=randomBytes(32).toString('hex'), other=randomBytes(32).toString('hex');
const fixture=await readFile('tests/fixtures/sample-blood-report.pdf');
const uploadId=randomUUID();
async function upload(bytes,type,name,id=uploadId){
 const body=new FormData();body.append('sessionKey',owner);body.append('uploadId',id);body.append('file',new Blob([bytes],{type}),name);
 return fetch(`${site}/reports/upload`,{method:'POST',headers:{Origin:'http://localhost:5173'},body});
}
const uploaded=await upload(fixture,'application/pdf','Fictional test report.pdf');
assert.equal(uploaded.status,201,await uploaded.clone().text());
const {reportId}=await uploaded.json();
const reports=await client.query(api.reports.list,{sessionKey:owner});
assert.equal(reports.length,1);assert.equal(reports[0].id,reportId);assert.equal(reports[0].size,fixture.length);
assert.equal((await client.query(api.reports.list,{sessionKey:other})).length,0);
async function open(key){return fetch(`${site}/reports/open`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:5173'},body:JSON.stringify({sessionKey:key,reportId})});}
const denied=await open(other);assert.equal(denied.status,404);
const opened=await open(owner);assert.equal(opened.status,200);assert.equal(opened.headers.get('cache-control'),'no-store');assert.deepEqual(Buffer.from(await opened.arrayBuffer()),fixture);
const retry=await upload(fixture,'application/pdf','Fictional test report.pdf');assert.equal(retry.status,200);assert.equal((await retry.json()).reportId,reportId);assert.equal((await client.query(api.reports.list,{sessionKey:owner})).length,1);
const fake=await upload(Buffer.from('not a pdf'),'application/pdf','fake.pdf',randomUUID());assert.equal(fake.status,400);
const unsupported=await upload(Buffer.from('test'),'text/plain','report.txt',randomUUID());assert.equal(unsupported.status,400);
const oversize=await upload(Buffer.alloc(10*1024*1024+1),'application/pdf','large.pdf',randomUUID());assert.equal(oversize.status,400);
console.log('Passed: upload saved; original bytes preserved; another browser denied; retry creates no duplicate; fake, unsupported and oversized files rejected.');
