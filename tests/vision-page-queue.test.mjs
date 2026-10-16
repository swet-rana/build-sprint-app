import test from 'node:test';import assert from 'node:assert/strict';
import {visionPageQueue} from '../src/vision-page-queue.js';
test('screened vision pages overlap up to three slots while OCR continues',async()=>{
 const queue=visionPageQueue(),releases=[],started=[];let active=0,max=0;
 const read=page=>async()=>{started.push(page);active++;max=Math.max(max,active);await new Promise(resolve=>releases.push(resolve));active--;};
 for(let page=1;page<=3;page++)await queue.add(read(page));assert.equal(active,3);
 let next=false;const fourth=queue.add(read(4)).then(()=>{next=true;});await Promise.resolve();assert.equal(next,false);assert.deepEqual(started,[1,2,3]);
 releases.shift()();await fourth;await Promise.resolve();assert.deepEqual(started,[1,2,3,4]);assert.equal(max,3);
 while(releases.length)releases.shift()();await queue.finish();assert.equal(active,0);
});
test('a failed page stops new vision dispatch, preserves the error, and waits for already-started pages',async()=>{
 const queue=visionPageQueue(),error=Object.assign(Error('fictional quota failure'),{code:'VISION_STOP'});let release,settled=false,calls=0;
 await queue.add(async()=>{calls++;await new Promise(r=>release=r);settled=true;});await queue.add(async()=>{calls++;throw error;});
 await new Promise(resolve=>setImmediate(resolve));await assert.rejects(queue.add(async()=>calls++),e=>e===error);
 assert.equal(calls,2);assert.equal(settled,false);release();await assert.rejects(queue.finish(),e=>e===error);assert.equal(settled,true);
});
