import test from 'node:test';
import assert from 'node:assert/strict';
import {createReportCache,memoryReportStore} from '../src/report-cache.js';
const report={id:'fictional-1',name:'fictional.pdf',contentHash:'fictional-hash',contentType:'application/pdf',size:100};
test('originals and successful readings are reused concurrently, across viewers and after a reload',async()=>{
 const store=memoryReportStore();let downloads=0,reads=0;
 const options={scope:'fictional-deployment-and-browser',store,download:async()=>{downloads++;return new Blob(['fictional original']);}};
 const first=createReportCache(options),read=async()=>{reads++;await first.original(report);return {markers:[{value:13.2}],readingPaths:['text']};};
 await Promise.all([first.original(report),first.original(report),first.reading(report,read),first.reading(report,read)]);
 assert.equal(downloads,1);assert.equal(reads,1);
 const result=await first.reading(report,read);result.markers[0].value=999;
 const reloaded=createReportCache(options);
 assert.equal((await reloaded.original(report)).size,18);
 assert.equal((await reloaded.reading(report,read)).markers[0].value,13.2);
 assert.equal(downloads,1);assert.equal(reads,1);
});
test('failed downloads and failed readings remain retryable',async()=>{
 let downloads=0,reads=0;const cache=createReportCache({scope:'retry',store:memoryReportStore(),download:async()=>{if(++downloads===1)throw Error('connection lost');return new Blob(['fictional']);}});
 await assert.rejects(cache.original(report),/connection lost/);await cache.original(report);await cache.original(report);assert.equal(downloads,2);
 const read=async()=>{if(++reads===1)throw Error('unclear scan');return {markers:[]};};
 await assert.rejects(cache.reading(report,read),/unclear scan/);await cache.reading(report,read);await cache.reading(report,read);assert.equal(reads,2);
});
test('partial scan failures retry reading while reusing the downloaded original',async()=>{
 let downloads=0,reads=0;const store=memoryReportStore(),cache=createReportCache({scope:'partial-scan',store,download:async()=>{downloads++;return new Blob(['fictional']);}});
 const read=async()=>{reads++;await cache.original(report);return {markers:[{value:13.2}],warnings:['Reading error on scanned page 2: unclear words']};};
 await cache.reading(report,read);await cache.reading(report,read);
 assert.equal(downloads,1);assert.equal(reads,2);assert.equal((await store.list()).length,1,'Only the original bytes should be saved after a partial failure');
});
test('changed files, deleted files and other browser access keys cannot reuse stale readings',async()=>{
 const store=memoryReportStore();let downloads=0,reads=0;
 const options={scope:'owner',store,download:async()=>{downloads++;return new Blob(['fictional']);}},cache=createReportCache(options),read=async()=>({read:++reads});
 await cache.original(report);await cache.reading(report,read);
 const changed={...report,contentHash:'changed'};await cache.original(changed);await cache.reading(changed,read);assert.equal(downloads,2);assert.equal(reads,2);
 await cache.sync([]);assert.equal((await store.list()).length,0);
 await cache.original(changed);await cache.reading(changed,read);assert.equal(downloads,3);assert.equal(reads,3);
 const other=createReportCache({...options,scope:'another-owner'});await other.original(changed);await other.reading(changed,read);assert.equal(downloads,4);assert.equal(reads,4);
});
test('uploaded originals are reused and unavailable browser storage does not block reading',async()=>{
 const broken={get:async()=>{throw Error('unavailable');},put:async()=>{throw Error('full');},list:async()=>{throw Error('unavailable');}};let downloads=0;
 const cache=createReportCache({scope:'local-upload',store:broken,download:async()=>{downloads++;return new Blob(['download']);}});
 await cache.remember(report,new Blob(['uploaded original']));assert.equal(await(await cache.original(report)).text(),'uploaded original');assert.equal(downloads,0);
 const result=await cache.reading(report,async()=>({readingPaths:['text']}));assert.deepEqual(result,{readingPaths:['text']});
});
test('deleting a report during a pending download does not save its original again',async()=>{
 const store=memoryReportStore();let release;const cache=createReportCache({scope:'deleted-during-load',store,download:()=>new Promise(resolve=>{release=resolve;})});
 const loading=cache.original(report);await new Promise(resolve=>setImmediate(resolve));await cache.sync([]);release(new Blob(['fictional']));await loading;assert.equal((await store.list()).length,0);
});
