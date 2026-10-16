import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {smartSummaryMarkup} from '../src/smart-summary-view.js';import {smartFacts} from '../src/smart-summary-rules.js';
const report=date=>({date,pageCount:1,markers:[{key:'normal',name:'Fictional test',value:15,unit:'mg/L',referenceText:'10-20',page:1}]});
const comparison={reports:[report('2026-01-15'),report('2026-07-15')]};
const view=(state,c=comparison)=>new JSDOM(smartSummaryMarkup(state,c,(_m,r)=>`<button>View original report ${r.date}</button>`)).window.document;
test('always-normal results are listed under a closed Stayed in range disclosure, never under Hits',()=>{
 const f=smartFacts(comparison),doc=view({available:true,...f,questions:[]});const details=doc.querySelector('.smart-summary-stayed');assert(details);assert.equal(details.open,false);assert(details.querySelector('summary').textContent.includes('Stayed in range'));assert.equal(details.querySelectorAll('li').length,1);assert.equal(details.querySelectorAll('button').length,2);assert.equal(doc.querySelector('[aria-label="Hits"] li'),null);
});
test('single-report summary uses In range and Out of range with no Hit or Miss in success, loading or failure',()=>{
 const c={reports:[report('2026-07-15')]},f=smartFacts(c),state={...f,available:true,hits:f.hits.map(x=>({line:x.lines[0],sources:x.sources})),misses:[],questions:[]};
 for(const response of [state,null,{available:false}]){const doc=view(response,c);assert(!/\b(?:hits?|miss(?:es)?)\b/i.test(doc.body.textContent));assert(doc.body.textContent.includes('A trend appears once a second report is added.'));}
 const doc=view(state,c);assert(doc.querySelector('[aria-label="In range"]'));assert(doc.querySelector('[aria-label="Out of range"]'));assert.equal(doc.querySelector('.smart-summary-stayed'),null);
});
