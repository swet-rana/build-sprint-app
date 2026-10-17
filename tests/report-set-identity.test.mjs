import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {compareReports,compareReportSeries} from '../src/lab-parser.js';
import {confirmReportSet,createReportSetConfirmation} from '../src/report-set-confirmation.js';
const reports=(name='Alec Sample')=>[{id:'fictional-a',contentHash:'a',date:'2026-01-15',patientName:'Mr. Alex Sample (45Y/M)',patientId:'lab-a',patientIdIssuer:'fictional',markers:[{key:'crp|mg/l',name:'CRP',value:4,unit:'mg/L',page:1,referenceText:'0-5'}]},{id:'fictional-b',contentHash:'b',date:'2026-07-15',patientName:name,patientId:'lab-b',patientIdIssuer:'fictional',markers:[{key:'crp|mg/l',name:'CRP',value:3,unit:'mg/L',page:1,referenceText:'0-5'}]}];
test('across reports, the shared rule auto-matches one-letter changes and ignores titles case spacing and age/sex suffixes',async()=>{
 for(const name of ['Master ALEC SAMPLE (45 M)','Alexx Sample','Ale Sample','AlexSample',' alex   sample ']){
  const selected=reports(name);assert.equal(await confirmReportSet(selected,()=>assert.fail('No question expected')),true);
  assert.equal(compareReports(...selected).comparable.length,1);assert.equal(compareReportSeries(selected).comparable.length,1);
 }
});
test('other cross-report name differences request confirmation without exposing names in the result',()=>{
 const selected=reports('Alex Other');assert.deepEqual(compareReports(...selected),{needsIdentityConfirmation:true});assert.deepEqual(compareReportSeries(selected),{needsIdentityConfirmation:true});
});
test('Yes compares the unchanged results and remembers only the answer for this unordered set of files',async()=>{
 const dom=new JSDOM('<section id="question"></section>',{url:'https://fictional.test'}),box=dom.window.document.querySelector('#question'),selected=reports('Alex Other');
 const ask=createReportSetConfirmation(box,{storage:dom.window.localStorage,scope:'fictional'});const pending=confirmReportSet(selected,()=>ask(selected));
 assert(box.textContent.includes('These reports show different names. Are they the same person?'));assert(!box.textContent.includes('Alex'));
 box.querySelector('[data-report-set-answer="yes"]').click();assert.equal(await pending,true);
 assert.equal(compareReportSeries(selected,{samePerson:true}).comparable.length,1);assert.equal(selected[1].patientName,'Alex Other');
 assert(!JSON.stringify({...dom.window.localStorage}).includes('Alex'));assert.equal(await confirmReportSet([...selected].reverse(),()=>ask([...selected].reverse())),true);assert.equal(box.hidden,true);
 const changed=selected.map(r=>({...r}));changed[1].id='fictional-c';const next=confirmReportSet(changed,()=>ask(changed));assert.equal(box.hidden,false);box.querySelector('[data-report-set-answer="no"]').click();assert.equal(await next,false);
});
test('No returns to selection without comparing or logging any names',async()=>{
 const dom=new JSDOM('<section id="question"></section>',{url:'https://fictional.test'}),box=dom.window.document.querySelector('#question'),selected=reports('Alex Other');let visits=0;
 const ask=createReportSetConfirmation(box,{storage:dom.window.localStorage,scope:'fictional',onChangeSelection:()=>visits++});const pending=confirmReportSet(selected,()=>ask(selected));
 box.querySelector('[data-report-set-answer="no"]').click();assert.equal(await pending,false);assert.equal(visits,1);assert.equal(box.hidden,true);assert.equal(dom.window.localStorage.length,0);
});
