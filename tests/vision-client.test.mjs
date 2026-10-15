import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const compiled=await build({entryPoints:['src/vision-client.js'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env.VITE_CONVEX_URL':'"https://elegant-schnauzer-503.convex.cloud"'}});
const {awaitVisionJob,VISION_FAILURE}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
function client(){let value,notify,stops=0;return{watchQuery(){return{onUpdate(callback){notify=callback;return()=>stops++;},localQueryResult(){return value;}}},set(v){value=v;notify();},get stops(){return stops},action(){assert.fail('The browser must not call a vision action');}};}
test('the screen waits through disconnect and gets the saved result from the query',async()=>{
 const c=client(),states=[],pending=awaitVisionJob(c,'fictional','job',j=>states.push(j.status));
 c.set({status:'reading'});c.set(undefined);c.set({status:'succeeded',result:{tests:['fictional']}});
 assert.deepEqual(await pending,{tests:['fictional']});assert.deepEqual(states,['reading','succeeded']);assert.equal(c.stops,1);
});
test('failed jobs and query errors never expose raw Convex errors',async()=>{
 const c=client(),pending=awaitVisionJob(c,'fictional','job');c.set({status:'failed',error:'[CONVEX A(vision:read)] Connection lost while action was in flight'});await assert.rejects(pending,e=>e.message===VISION_FAILURE);assert.equal(c.stops,1);
});

test('retry ignores the cached old failed attempt until the newly scheduled attempt finishes',async()=>{
 const c=client(),states=[],pending=awaitVisionJob(c,'fictional','job',j=>states.push([j.status,j.attempt]),2);
 c.set({status:'failed',attempt:1,error:VISION_FAILURE});c.set({status:'reading',attempt:2});c.set({status:'succeeded',attempt:2,result:{tests:['fictional']}});
 assert.deepEqual(await pending,{tests:['fictional']});assert.deepEqual(states,[['reading',2],['succeeded',2]]);
});

test('explicit retry preserves an older preparation and requests the new attempt, rather than forgetting successful jobs',async()=>{
 const {getFunctionName}=await import('convex/server'),oldStorage=globalThis.localStorage,store=new Map(),calls=[];
 globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const session='a'.repeat(64);store.set('health-history-upload-session',session);store.set(`healthstats-pending-vision:https://elegant-schnauzer-503.convex.cloud:${session}`,JSON.stringify({reportIds:['report'],requestKey:'same-request',readingId:'same-reading',status:'failed',startedAt:Date.now()-7200000}));
 globalThis.__visionTestClient={mutation:async(ref,args)=>{const name=getFunctionName(ref);calls.push({name,args});return name==='vision:begin'?'same-reading':{jobId:'same-job',attempt:2};},watchQuery:()=>({localQueryResult:()=>({status:'succeeded',attempt:2,result:{tests:[]}}),onUpdate:fn=>{queueMicrotask(fn);return()=>{};}})};
 try{
  const output=await build({entryPoints:['src/vision-client.js'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env.VITE_CONVEX_URL':'"https://elegant-schnauzer-503.convex.cloud"'},plugins:[{name:'fictional-client',setup(b){b.onResolve({filter:/auth-client\.js$|scan-image\.js$/},a=>({path:a.path,namespace:'fake'}));b.onLoad({filter:/.*/,namespace:'fake'},a=>({contents:a.path.includes('auth-client')?'export function authClient(){return globalThis.__visionTestClient;}':'export async function encodeScanImage(){return {image:"fictional-jpeg",metadata:{}};}'}));}}]});
  const {visionReading}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
  const read=visionReading(['report'],{retryFailed:true});await read({},4,{id:'report'});
  assert.equal(calls[0].name,'vision:begin');assert.equal(calls[0].args.requestKey,'same-request');assert.equal(calls[0].args.retry,true);assert.equal(calls[1].name,'visionJobs:enqueueAttempt');assert.equal(calls[1].args.readingId,'same-reading');assert.equal(calls[1].args.retry,true);
 }finally{if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;delete globalThis.__visionTestClient;}
});
