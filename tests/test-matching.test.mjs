import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeReportTests,originalResultTitle} from '../src/test-matching.js';
import {compareReportSeries} from '../src/lab-parser.js';
import {testIdentity} from '../src/test-names.js';
import {conversionFactor,validStandardMatch} from '../convex/testMappingRules.js';
const marker=(name,value,unit,referenceText)=>({...testIdentity(name,unit),value,unit,referenceText,page:1,sourceTop:0.4});
const report=(id,date,labName,markers)=>({id,date,labName,patientName:'Fictional Patient',patientId:null,patientIdIssuer:null,markers,warnings:[],usedPages:[1],excludedPages:[],pageCount:1});
test('two labs combine an unfamiliar haemoglobin name and different units while preserving originals',async()=>{
 const input=[report('a','2026-01-15','Fictional Lab A',[marker('Haemoglobin',12.5,'g/dL','12-16')]),report('b','2026-07-15','Fictional Lab B',[marker('Hb concentration in blood',132,'g/L','120-160')])],sent=[];
 const output=await normalizeReportTests(input,async entries=>{sent.push(...entries);return entries.map(e=>({...e,status:'mapped',standardId:'haemoglobin',mappingId:'saved-mapping'}));});
 const comparison=compareReportSeries(output);assert.equal(comparison.comparable.length,1);assert.deepEqual(comparison.comparable[0].observations.map(m=>m.value),[12.5,13.2]);assert.equal(comparison.comparable[0].unit,'g/dL');assert.equal(output[1].markers[0].referenceText,'12-16');assert.equal(sent.length,1);assert.equal(sent[0].name,'Hb concentration in blood');assert.equal(sent[0].value,undefined);
 assert(originalResultTitle(output[1].markers[0]).includes('132 g/L'));assert(originalResultTitle(output[1].markers[0]).includes('Hb concentration in blood'));assert.equal(input[1].markers[0].value,132);
});
test('known aliases need no AI; repeated unfamiliar names are sent once within a batch',async()=>{
 let names=[];await normalizeReportTests([report('a','2026-01-15','A',[marker('Hb',130,'g/L','120-160'),marker('Unfamiliar haemoglobin',131,'g/L','120-160')]),report('b','2026-07-15','B',[marker('Unfamiliar haemoglobin',13.2,'g/dL','12-16')])],async entries=>{names=entries;return entries.map(e=>({...e,status:'unmatched',standardId:null}));});assert.equal(names.length,1);assert.equal(names[0].name,'Unfamiliar haemoglobin');
});
test('conversion rules preserve inequalities, do not guess descriptive ranges, and refuse unsupported units',async()=>{
 const output=await normalizeReportTests([report('a','2026-01-15','A',[marker('CRP',0.3,'mg/dL','<0.5'),marker('Haemoglobin',132,'g/L','Adult categories: consult report')])],async()=>[]);
 assert.equal(output[0].markers[0].value,3);assert.equal(output[0].markers[0].referenceText,'<5');assert.equal(output[0].markers[1].value,13.2);assert(output[0].markers[1].referenceText.includes('not converted'));assert.equal(conversionFactor('mch','pq'),null);
 assert.equal(conversionFactor('CREATININE','umol/L'),1/88.4);assert.equal(conversionFactor('cholesterol-total','mmol/L'),38.67);
});
test('uncertain AI matches and different conditions, specimens or assays cannot be combined',()=>{
 for(const [name,id] of [['Free T3','t3'],['Random plasma glucose','glucose-fasting'],['Fasting blood glucose','glucose-random'],['High sensitivity CRP','crp'],['Direct LDL cholesterol','cholesterol-ldl'],['Urea','bun'],['Free testosterone','TESTOSTERONE']])assert.equal(validStandardMatch(name,id),false,name);
});

test('Server cache claims once across units, caches uncertain and failed names, and rejects another browser',async()=>{
 const {build}=await import('esbuild');const bundle=await build({entryPoints:['convex/testMatching.ts'],bundle:true,write:false,platform:'node',format:'esm'});
 const {claim,finish}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
 const sessionKey='a'.repeat(64),rows=new Map([['report',{_id:'report',sessionKey,name:'Fictional.pdf',storageId:'storage',contentType:'application/pdf'}]]);
 const ctx={db:{get:async(t,id)=>rows.get(id),query:()=>({withIndex:(n,fn)=>{let key;const q={eq:(f,k)=>{key=k;return q;}};fn(q);return {first:async()=>[...rows.values()].find(r=>r.key===key)??null};}}),insert:async(t,value)=>{const id=`${t}-${rows.size}`;rows.set(id,{...value,_id:id,_creationTime:Date.now()});return id;},patch:async(t,id,value)=>Object.assign(rows.get(id),value)}};
 const entry={name:'Hb concentration in blood',unit:'g/L',specimen:'blood',method:''},args={sessionKey,reportIds:['report'],entries:[entry]};
 const first=await claim._handler(ctx,args);assert.equal(first.fresh.length,1);
 const concurrent=await claim._handler(ctx,{...args,entries:[{...entry,unit:'g/dL'}]});assert.equal(concurrent.fresh.length,0);
 await finish._handler(ctx,{ids:[first.fresh[0]._id],matches:[{key:first.fresh[0].key,standardId:'haemoglobin',certain:true}]});
 const repeated=await claim._handler(ctx,args);assert.equal(repeated.fresh.length,0);assert.equal(repeated.rows[0].standardId,'haemoglobin');
 await assert.rejects(claim._handler(ctx,{...args,sessionKey:'b'.repeat(64)}),/unavailable/);
 const uncertain=await claim._handler(ctx,{...args,entries:[{...entry,name:'Fictional ambiguous test'}]});await finish._handler(ctx,{ids:[uncertain.fresh[0]._id],matches:[]});assert.equal((await claim._handler(ctx,{...args,entries:[{...entry,name:'Fictional ambiguous test'}]})).fresh.length,0);
 const failed=await claim._handler(ctx,{...args,entries:[{...entry,name:'Fictional unavailable test'}]});await finish._handler(ctx,{ids:[failed.fresh[0]._id],matches:[],error:'API failed'});assert.equal((await claim._handler(ctx,{...args,entries:[{...entry,name:'Fictional unavailable test'}]})).rows[0].status,'failed');
});
