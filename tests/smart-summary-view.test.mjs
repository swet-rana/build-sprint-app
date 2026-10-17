import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {smartSummaryMarkup} from '../src/smart-summary-view.js';import {smartFacts} from '../src/smart-summary-rules.js';
const report=date=>({date,pageCount:1,markers:[{key:'normal',name:'Fictional test',value:15,unit:'mg/L',referenceText:'10-20',page:1}]});
const comparison={reports:[report('2026-01-15'),report('2026-07-15')]};
const source=(m,r)=>`<button class="source-button" type="button" data-source="${r.date}" data-page="${m.page}">View original report</button>`;
const view=(state,c=comparison)=>new JSDOM(smartSummaryMarkup(state,c,source)).window.document;
test('Only in one report sits below Misses and preserves normal, high and low pills and source links',()=>{
 const one=(key,value)=>({key,name:key,value,unit:'mg/L',referenceText:'10-20',page:1});
 const c={reports:[{date:'2026-01-15',pageCount:1,markers:[one('earlier-normal',15)]},{date:'2026-07-15',pageCount:1,markers:[one('later-high',30),one('later-low',5)]}]};
 const facts=smartFacts(c),doc=view({available:true,...facts},c),only=doc.querySelector('.smart-summary-only');
 assert(only);assert.equal(only.previousElementSibling.getAttribute('aria-label'),'Misses');assert.match(only.querySelector('summary').textContent,/Only in one report · 3 tests/);
 assert.deepEqual([...only.querySelectorAll('.smart-range-pill')].map(p=>p.textContent),['NORMAL','HIGH','LOW']);assert.deepEqual([...only.querySelectorAll('[data-source]')].map(b=>b.dataset.source),['2026-01-15','2026-07-15','2026-07-15']);
 assert.equal(doc.querySelector('.smart-count-normal').textContent,'0');assert.equal(doc.querySelector('.smart-count-attention').textContent,'0');
});
test('always-normal results stay collapsed and are not counted as Back to normal',()=>{
 const f=smartFacts(comparison),doc=view({available:true,...f,questions:[]});const details=doc.querySelector('.smart-summary-stayed');assert(details);assert.equal(details.open,false);assert.equal(details.querySelectorAll('li').length,1);assert.equal(details.querySelectorAll('.source-button').length,1);assert.equal(doc.querySelector('[aria-label="Hits"] li'),null);assert.equal(doc.querySelector('.smart-count-normal').textContent,'0');
});
test('single-report summary keeps range labels with no Hit or Miss in success, loading or failure',()=>{
 const c={reports:[report('2026-07-15')]},f=smartFacts(c),state={...f,available:true,hits:f.hits.map(x=>({line:x.lines[0],sources:x.sources})),misses:[],questions:[]};
 for(const response of [state,null,{available:false}]){const doc=view(response,c);assert(!/\b(?:hits?|miss(?:es)?)\b/i.test(doc.body.textContent));assert(doc.body.textContent.includes('A trend appears once a second report is added.'));}
 const doc=view(state,c);assert(doc.querySelector('[aria-label="In range"]'));assert(doc.querySelector('[aria-label="Out of range"]'));assert.equal(doc.querySelector('.smart-summary-stayed'),null);
});
test('list rows preserve groups and latest source data, with distinct labels, counts and a single scan pill',()=>{
 const rows=[{key:'tg',name:'Triglycerides',value:120,referenceText:'<150',unit:'mg/dL',page:2,readPath:'vision'},{key:'hdl',name:'HDL cholesterol',value:30,referenceText:'>40',unit:'mg/dL',page:3,readPath:'vision'},{key:'high',name:'Fictional high test',value:25,referenceText:'10-20',unit:'mg/L',page:4}];
 const c={reports:[{date:'2026-01-15',markers:rows},{date:'2026-07-15',markers:rows}]};
 const state={available:true,hits:[{line:'verified hit',sources:[{reportIndex:0,markerIndex:0},{reportIndex:1,markerIndex:0}]}],misses:[{line:'verified low',sources:[{reportIndex:1,markerIndex:1}]},{line:'improved since last report',sources:[{reportIndex:0,markerIndex:2},{reportIndex:1,markerIndex:2}]}],questions:['Fictional doctor question?'],totalHits:7,totalMisses:9,stayed:[]};
 const options=[];const doc=new JSDOM(smartSummaryMarkup(state,c,(m,r,opts)=>{options.push(opts);return source(m,r);})).window.document;
 assert.deepEqual([...doc.querySelectorAll('.smart-result-name')].map(p=>p.textContent),['Triglycerides','HDL cholesterol','Fictional high test']);
 assert.deepEqual([...doc.querySelectorAll('.smart-range-pill')].map(p=>p.textContent),['NORMAL','LOW','HIGH']);
 assert.deepEqual([...doc.querySelectorAll('.smart-result-description')].map(p=>p.textContent),['Good cholesterol','Improved since last report']);
 assert.equal(doc.querySelector('.smart-count-normal').textContent,'7');assert.equal(doc.querySelector('.smart-count-attention').textContent,'9');
 assert.equal(doc.querySelectorAll('.smart-summary-scan-note').length,1);assert.equal(doc.querySelectorAll('.scan-value-notice').length,0);assert(options.every(o=>o.scanNotice===false));
 assert.equal(doc.querySelectorAll('[popover]').length,0);assert.equal(doc.querySelectorAll('.smart-source-direct').length,3);assert.deepEqual([...doc.querySelectorAll('.smart-source-direct')].map(p=>[p.dataset.source,p.dataset.page]),[['2026-07-15','2'],['2026-07-15','3'],['2026-07-15','4']]);
 for(const item of doc.querySelectorAll('.smart-result-row')){assert(!/2026|Page |read from scan/.test(item.textContent));assert.equal(item.querySelectorAll('[data-source]').length,1);assert.equal(item.querySelectorAll('[data-test-info]').length,1);}
 assert.equal(doc.querySelector('.smart-summary-questions'),null);assert(doc.querySelector('.smart-summary-disclaimer').textContent.includes('Not a diagnosis; discuss results with your doctor.'));
 assert.equal(doc.querySelectorAll('[aria-label="Hits"] .smart-result-row').length,1);assert.equal(doc.querySelectorAll('[aria-label="Misses"] .smart-result-row').length,2);
});
