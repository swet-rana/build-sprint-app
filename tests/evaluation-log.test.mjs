import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['src/evaluation-log.js','src/evaluation-retry-store.js'],bundle:true,write:false,format:'esm',platform:'node',outdir:'/tmp/evaluation-test-build'});
const {createEvaluationLogger}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles.find(f=>f.path.endsWith('/evaluation-log.js')).text).toString('base64')}`);
const {memoryRetryStore}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles.find(f=>f.path.endsWith('/evaluation-retry-store.js')).text).toString('base64')}`);
const options=store=>({store,makeId:()=> 'retry-key',schedule:()=>1,cancel:()=>{}});
test('logger saves original inputs and full output, then clears the retry queue',async()=>{
 const calls=[],store=memoryRetryStore();
 const logger=createEvaluationLogger({mutation:async(ref,args)=>{calls.push(args);return 'run-1';},action:async(ref,args)=>calls.push(args)},'session',assert.fail,options(store));
 const id=await logger.begin('report-reading',['original-report'],'reader v1');
 const output={markers:[{name:'AMH',value:1.2,page:1}],missing:null};await logger.finish(id,output);
 assert.deepEqual(calls[0],{sessionKey:'session',kind:'report-reading',reportIds:['original-report'],engine:'reader v1',runKey:id});
 assert.deepEqual(JSON.parse(calls[1].outputJson),output);assert.equal(calls[1].runId,'run-1');assert.deepEqual(await store.list(),[]);logger.dispose();
});
test('offline begin and finish survive logger recreation and save once after reconnection',async()=>{
 const store=memoryRetryStore(),failures=[],starts=[],finishes=[];let online=false;
 const client={mutation:async(ref,args)=>{if(!online)throw Error('Offline');starts.push(args);return 'run';},action:async(ref,args)=>finishes.push(args)};
 const first=createEvaluationLogger(client,'session',e=>failures.push(e.message),options(store));
 const id=await first.begin('summary',['report'],'summary v1');await first.finish(id,{html:'Full summary',missing:null});first.dispose();
 assert.equal((await store.list()).length,1);assert.equal(finishes.length,0);
 online=true;const reopened=createEvaluationLogger(client,'session',assert.fail,options(store));await reopened.flush();await reopened.flush();
 assert.equal(starts.length,1);assert.equal(finishes.length,1);assert.equal(JSON.parse(finishes[0].outputJson).html,'Full summary');assert.deepEqual(await store.list(),[]);assert(failures.includes('Offline'));reopened.dispose();
});
test('failed finish retries its original server run and preserves errors',async()=>{
 const store=memoryRetryStore();let starts=0,online=false;const actions=[];
 const logger=createEvaluationLogger({mutation:async()=>{starts++;return 'existing-run';},action:async(ref,args)=>{if(!online)throw Error('Offline');actions.push(args);}},'session',()=>{},options(store));
 const id=await logger.begin('report-reading',['report'],'reader');await logger.finish(id,null,new Error('Unreadable PDF'));online=true;await logger.flush();
 assert.equal(starts,1);assert.equal(actions[0].runId,'existing-run');assert.equal(actions[0].error,'Unreadable PDF');assert.equal(actions[0].outputJson,undefined);assert.deepEqual(await store.list(),[]);logger.dispose();
});
test('retry delay increases to one minute and another session’s jobs stay untouched',async()=>{
 const store=memoryRetryStore(),delays=[];await store.put({id:'other',sessionKey:'different',kind:'summary',reportIds:['private'],engine:'test'});
 const logger=createEvaluationLogger({mutation:async()=>{throw Error('Offline');}},'session',()=>{},{...options(store),schedule:(fn,ms)=>{delays.push(ms);return 1;}});
 await logger.begin('summary',['own'],'v1');for(let n=0;n<8;n++)await logger.flush();
 assert.deepEqual(delays,[1000,2000,4000,8000,16000,32000,60000,60000,60000]);assert.equal((await store.get('other')).reportIds[0],'private');logger.dispose();
});

test('failed OCR reading preserves rejected words and scores through offline retry',async()=>{
 const store=memoryRetryStore();let online=false;const actions=[];
 const logger=createEvaluationLogger({mutation:async()=> 'run',action:async(ref,args)=>{if(!online)throw Error('Offline');actions.push(args);}},'session',()=>{},options(store));
 const error=Error('Could not read name confidently.');error.diagnostics={kind:'ocr-low-confidence',page:2,threshold:80,lowConfidenceWords:[{text:'Sample',confidence:79.5,bbox:{x0:1,y0:2,x1:3,y1:4}}]};
 const id=await logger.begin('report-reading',['report'],'reader');await logger.finish(id,null,error);online=true;await logger.flush();
 assert.equal(actions[0].error,error.message);assert.deepEqual(JSON.parse(actions[0].outputJson),{diagnostics:error.diagnostics});logger.dispose();
});
