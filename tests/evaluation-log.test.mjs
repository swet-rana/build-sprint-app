import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['src/evaluation-log.js'],bundle:true,write:false,format:'esm',platform:'node'});
const {createEvaluationLogger}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
test('evaluation logger sends original report IDs, complete output and errors without changing results',async()=>{
 const calls=[],failures=[];
 const logger=createEvaluationLogger({mutation:async(ref,args)=>{calls.push(args);return 'run-1';},action:async(ref,args)=>{calls.push(args);}},'browser-session',e=>failures.push(e));
 const id=await logger.begin('report-reading',['original-report'],'reader v1');
 const output={markers:[{name:'AMH',value:1.2,page:1}],missing:null};
 await logger.finish(id,output);
 assert.deepEqual(calls[0],{sessionKey:'browser-session',kind:'report-reading',reportIds:['original-report'],engine:'reader v1'});
 assert.deepEqual(JSON.parse(calls[1].outputJson),output);assert.equal(calls[1].runId,id);
 await logger.finish(id,null,new Error('Unreadable PDF'));
 assert.equal(calls[2].error,'Unreadable PDF');assert.equal(calls[2].outputJson,undefined);assert.equal(failures.length,0);
});
test('logging outages are reported without breaking report reading or summary preparation',async()=>{
 const failures=[];const logger=createEvaluationLogger({mutation:async()=>{throw Error('Offline');},action:async()=>{throw Error('Storage unavailable');}},'session',e=>failures.push(e.message));
 assert.equal(await logger.begin('summary',['report'],'summary v1'),null);
 await logger.finish(null,{});await logger.finish('run',{});
 assert.deepEqual(failures,['Offline','Storage unavailable']);
});
