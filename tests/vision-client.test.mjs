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
