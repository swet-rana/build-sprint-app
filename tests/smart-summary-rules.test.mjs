import test from 'node:test';import assert from 'node:assert/strict';
import {smartFacts,validateSmartReply,smartReplySchema} from '../src/smart-summary-rules.js';
const marker=(key,value,referenceText='10-20',unit='mg/L')=>({key,name:key,unit,value,referenceText,page:2});
const report=(date,markers)=>({id:date,date,pageCount:2,markers});
test('hits and misses use only printed numeric ranges and the immediately preceding compatible result',()=>{
 const c={reports:[report('2026-01-15',[marker('normal',15),marker('improved',30),marker('worse',22),marker('changed-range',30)]),report('2026-07-15',[marker('normal',16),marker('improved',25),marker('worse',27),marker('changed-range',25,'5-15'),marker('missing',12,''),marker('written','Negative','Negative')])]};
 const f=smartFacts(c);assert.equal(f.hits.length,1);assert.equal(f.misses.length,3);assert(f.misses.find(x=>x.name==='improved').lines.every(l=>l.includes('closer')&&l.includes('outside')));assert(f.misses.find(x=>x.name==='worse').lines.some(l=>l.includes('farther')));assert(!f.misses.find(x=>x.name==='changed-range').lines.some(l=>/closer|farther/.test(l)));assert.equal(f.unclassified,2);
});
test('one report has no invented trend; unclear ranges and missing source pages are excluded',()=>{
 const f=smartFacts({reports:[report('2026-07-15',[marker('within',15),marker('below',5),{...marker('no-page',30),page:null}])]});assert(f.single);assert.equal(f.hits.length,1);assert.equal(f.misses.length,1);assert(f.hits[0].lines.every(l=>!l.includes('previous')));assert.equal(f.unclassified,1);assert.equal(f.hits[0].sources.length,1);
});
test('AI reply cannot invent a value, diagnosis, treatment, source, category or extra question',()=>{
 const f=smartFacts({reports:[report('2026-07-15',[marker('within',15),marker('above',25)])]});
 const valid={hits:f.hits.map(x=>({id:x.id,line:x.lines[0]})),misses:f.misses.map(x=>({id:x.id,line:x.lines[0]})),questions:[f.questions[0]]};assert.deepEqual(validateSmartReply(valid,f),valid);assert(smartReplySchema(f).properties.hits);
 for(const bad of [{...valid,hits:[{...valid.hits[0],line:'A value of 999 means a disease; take medicine.'}]},{...valid,hits:valid.misses},{...valid,questions:['Take a medicine?']},{...valid,questions:Array(4).fill(f.questions[0])},{...valid,hits:[]}])assert.throws(()=>validateSmartReply(bad,f));
});
