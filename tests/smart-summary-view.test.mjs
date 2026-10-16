import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {smartSummaryMarkup} from '../src/smart-summary-view.js';import {smartFacts} from '../src/smart-summary-rules.js';
const report=date=>({date,pageCount:1,markers:[{key:'normal',name:'Fictional test',value:15,unit:'mg/L',referenceText:'10-20',page:1}]});
const comparison={reports:[report('2026-01-15'),report('2026-07-15')]};
const view=(state,c=comparison)=>new JSDOM(smartSummaryMarkup(state,c,(_m,r)=>`<button>View original report ${r.date}</button>`)).window.document;
test('always-normal results are listed under a closed Stayed in range disclosure, never under Hits',()=>{
 const f=smartFacts(comparison),doc=view({available:true,...f,questions:[]});const details=doc.querySelector('.smart-summary-stayed');assert(details);assert.equal(details.open,false);assert(details.querySelector('summary').textContent.includes('Stayed in range'));assert.equal(details.querySelectorAll('li').length,1);assert.equal(details.querySelectorAll('.smart-source-trigger').length,1);assert.equal(details.querySelectorAll('.smart-summary-sources button').length,2);assert.equal(doc.querySelector('[aria-label="Hits"] li'),null);
});
test('single-report summary uses In range and Out of range with no Hit or Miss in success, loading or failure',()=>{
 const c={reports:[report('2026-07-15')]},f=smartFacts(c),state={...f,available:true,hits:f.hits.map(x=>({line:x.lines[0],sources:x.sources})),misses:[],questions:[]};
 for(const response of [state,null,{available:false}]){const doc=view(response,c);assert(!/\b(?:hits?|miss(?:es)?)\b/i.test(doc.body.textContent));assert(doc.body.textContent.includes('A trend appears once a second report is added.'));}
 const doc=view(state,c);assert(doc.querySelector('[aria-label="In range"]'));assert(doc.querySelector('[aria-label="Out of range"]'));assert.equal(doc.querySelector('.smart-summary-stayed'),null);
});
test('short presentation preserves server groups, shows glossy status meaning, and hides dates in one Source popover',()=>{
 const rows=[{key:'tg',name:'Triglycerides',value:120,referenceText:'<150',unit:'mg/dL',page:2,readPath:'vision'},{key:'hdl',name:'HDL cholesterol',value:30,referenceText:'>40',unit:'mg/dL',page:3,readPath:'vision'},{key:'high',name:'Fictional high test',value:25,referenceText:'10-20',unit:'mg/L',page:4}];
 const c={reports:[{date:'2026-01-15',markers:rows},{date:'2026-07-15',markers:rows}]};
 const state={available:true,hits:[{line:'verified hit',sources:[{reportIndex:0,markerIndex:0},{reportIndex:1,markerIndex:0}]}],misses:[{line:'verified low',sources:[{reportIndex:1,markerIndex:1}]},{line:'improved since last report',sources:[{reportIndex:0,markerIndex:2},{reportIndex:1,markerIndex:2}]}],questions:['Fictional doctor question?'],totalHits:1,totalMisses:2,stayed:[]};
 const options=[];const doc=new JSDOM(smartSummaryMarkup(state,c,(_m,_r,opts)=>{options.push(opts);return '<button class="source-button">View original report</button>';})).window.document;
 assert.deepEqual([...doc.querySelectorAll('.smart-summary-line')].map(p=>p.textContent),['Triglycerides came back to normal','HDL (good cholesterol) is low','Fictional high test is still high, but better than last time']);
 assert.deepEqual([...doc.querySelectorAll('.smart-status')].map(p=>p.getAttribute('aria-label')),['In range','Below range','Above range']);
 assert.equal(doc.querySelector('.smart-summary-questions'),null);assert(!doc.body.textContent.includes('Fictional doctor question?'));
 assert.equal(doc.querySelectorAll('.smart-summary-scan-note').length,1);assert.equal(doc.querySelectorAll('.scan-value-notice').length,0);assert(options.every(o=>o.scanNotice===false));
 assert.equal(doc.querySelectorAll('.smart-source-trigger').length,3);assert.equal(doc.querySelectorAll('[popover="auto"]').length,3);assert.equal(doc.querySelectorAll('.smart-source-popover .source-button').length,5);
 for(const item of doc.querySelectorAll('.smart-summary-items>li')){const copy=item.cloneNode(true);copy.querySelector('[popover]').remove();assert(!/2026|Page |read from scan/.test(copy.textContent));assert.equal(copy.querySelectorAll('.smart-source-trigger').length,1);}
 assert.equal(doc.querySelectorAll('[aria-label="Hits"] .smart-summary-line').length,1);assert.equal(doc.querySelectorAll('[aria-label="Misses"] .smart-summary-line').length,2);
});
