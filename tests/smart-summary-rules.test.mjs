import test from 'node:test';import assert from 'node:assert/strict';
import {smartFacts,validateSmartReply,smartReplySchema} from '../src/smart-summary-rules.js';
const marker=(key,value,referenceText='10-20',unit='mg/L')=>({key,name:key,unit,value,referenceText,page:2});
const report=(date,markers)=>({id:date,date,pageCount:2,markers});
test('tests present in only one of multiple reports are separate from Hits, Misses and Stayed in range',()=>{
 const c={reports:[report('2026-01-15',[marker('shared',15),marker('earlier-only',15)]),report('2026-07-15',[marker('shared',16),marker('new-high',30),marker('new-low',5)])]};
 const f=smartFacts(c);assert.equal(f.totalHits,0);assert.equal(f.totalMisses,0);assert.equal(f.stayed.length,1);assert.equal(f.unclassified,0);assert.deepEqual(f.onlyInOneReport.map(x=>x.name),['earlier-only','new-high','new-low']);assert(f.onlyInOneReport.every(x=>x.sources.length===1));assert(!smartReplySchema(f).properties.onlyInOneReport);
});
test('hits and misses use only printed numeric ranges and the immediately preceding compatible result',()=>{
 const c={reports:[report('2026-01-15',[marker('normal',15),marker('improved',30),marker('worse',22),marker('changed-range',30)]),report('2026-07-15',[marker('normal',16),marker('improved',25),marker('worse',27),marker('changed-range',25,'5-15'),marker('missing',12,''),marker('written','Negative','Negative')])]};
 const f=smartFacts(c);assert.equal(f.hits.length,0);assert.equal(f.stayed.length,1);assert.equal(f.misses.length,3);assert(f.misses.find(x=>x.name==='improved').lines.every(l=>l.includes('improved since last report')&&l.includes('outside')));assert(f.misses.find(x=>x.name==='worse').lines.some(l=>l.includes('farther')));assert(!f.misses.find(x=>x.name==='changed-range').lines.some(l=>/closer|farther/.test(l)));assert.equal(f.unclassified,2);
});
test('one report has no invented trend; unclear ranges and missing source pages are excluded',()=>{
 const f=smartFacts({reports:[report('2026-07-15',[marker('within',15),marker('below',5),{...marker('no-page',30),page:null}])]});assert(f.single);assert.equal(f.hits.length,1);assert.equal(f.misses.length,1);assert(f.hits[0].lines.every(l=>!l.includes('previous')));assert.equal(f.unclassified,1);assert.equal(f.hits[0].sources.length,1);
});
test('AI reply cannot invent a value, diagnosis, treatment, source, category or extra question',()=>{
 const f=smartFacts({reports:[report('2026-07-15',[marker('within',15),marker('above',25)])]});
 const valid={hits:f.hits.map(x=>({id:x.id,line:x.lines[0]})),misses:f.misses.map(x=>({id:x.id,line:x.lines[0]})),questions:[f.questions[0]]};assert.deepEqual(validateSmartReply(valid,f),valid);assert(smartReplySchema(f).properties.hits);
 for(const bad of [{...valid,hits:[{...valid.hits[0],line:'A value of 999 means a disease; take medicine.'}]},{...valid,hits:valid.misses},{...valid,questions:['Take a medicine?']},{...valid,questions:Array(4).fill(f.questions[0])},{...valid,hits:[]}])assert.throws(()=>validateSmartReply(bad,f));
});
test('Hits require an earlier outside result and the latest report inside; always-normal tests stay collapsed',()=>{
 const f=smartFacts({reports:[report('2026-01-15',[marker('normal',15),marker('returned',30),marker('improved',30),marker('missing-latest',30)]),report('2026-04-15',[marker('normal',16),marker('returned',15),marker('improved',28)]),report('2026-07-15',[marker('normal',17),marker('returned',16),marker('improved',25),marker('new-normal',15)])]});
 assert.deepEqual(f.hits.map(x=>x.name),['returned']);assert.deepEqual(f.stayed.map(x=>x.name),['normal']);assert.deepEqual(f.misses.map(x=>x.name),['improved']);assert(f.misses[0].lines.every(line=>line.includes('improved since last report')));assert.equal(f.unclassified,0);assert.deepEqual(f.onlyInOneReport.map(x=>x.name),['missing-latest','new-normal']);
});
