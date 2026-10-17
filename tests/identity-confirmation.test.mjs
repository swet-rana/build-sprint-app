import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {resolveReportIdentity} from '../src/report-identity.js';
import {confirmReportIdentity,createIdentityConfirmation} from '../src/identity-confirmation.js';
const sources=(a='Alex Sample',b='Alec Sample')=>[{page:1,patientName:a,reportDate:'2026-07-15'},{page:7,patientName:b,reportDate:null}];
test('matching surname and one inserted deleted or substituted first-name letter continue without asking',async()=>{
 for(const name of ['Alec Sample','Ale Sample','Alexx Sample','Mr. ALEX SAMPLE']){
  const result=await confirmReportIdentity(sources('Alex Sample',name),()=>assert.fail('No question expected'));
  assert.equal(result.patientName,'Alex Sample');
 }
});
test('different surname pauses with both source pages instead of throwing',()=>{
 const result=resolveReportIdentity(sources('Alex Sample','Alex Other'));
 assert.equal(result.needsConfirmation,true);assert.deepEqual(result.conflict.map(x=>x.page),[1,7]);
});
test('Yes resumes with identity, saves only an answer for the file, and does not ask again',async()=>{
 const dom=new JSDOM('<div id="question"></div>',{url:'https://fictional.test'}),box=dom.window.document.querySelector('#question');
 const ask=createIdentityConfirmation(box,{storage:dom.window.localStorage,scope:'fictional'}),file={id:'fictional-file',contentHash:'fictional-hash'};
 const pending=confirmReportIdentity(sources('Alex Sample','Alex Other'),conflict=>ask(file,conflict));
 assert.match(box.textContent,/Alex Sample \(page 1\) and Alex Other \(page 7\)/);
 box.querySelector('[data-identity-answer="yes"]').click();const result=await pending;
 assert.equal(result.patientName,'Alex Sample');assert.equal(box.hidden,true);
 const saved=JSON.stringify({...dom.window.localStorage});assert(!saved.includes('Alex'));assert(saved.includes('yes'));
 const again=createIdentityConfirmation(box,{storage:dom.window.localStorage,scope:'fictional'});
 assert.equal((await confirmReportIdentity(sources('Alex Sample','Alex Other'),c=>again(file,c))).patientName,'Alex Sample');assert.equal(box.hidden,true);
});
test('No removes only that report and gives the separate-file message without names',async()=>{
 const dom=new JSDOM('<div id="question"></div>',{url:'https://fictional.test'}),box=dom.window.document.querySelector('#question');let removed;
 const ask=createIdentityConfirmation(box,{storage:dom.window.localStorage,scope:'fictional',onRemove:id=>removed=id});
 const pending=confirmReportIdentity(sources('Alex Sample','Alex Other'),c=>ask({id:'fictional-file'},c));
 box.querySelector('[data-identity-answer="no"]').click();
 await assert.rejects(pending,e=>e.code==='IDENTITY_REPORT_REMOVED'&&e.message==='Upload a separate file for each person.'&&!e.message.includes('Alex'));
 assert.equal(removed,'fictional-file');assert.equal(box.textContent,'Upload a separate file for each person.');
});
test('confirmed identity keeps every page of the fictional scanned report',async()=>{
 const {mergeScanResults}=await import('../src/scan-results.js');
 const scans=sources('Alex Sample','Alex Other').map((s,i)=>({page:s.page,result:{reportKind:'blood',patientName:s.patientName,reportDate:s.reportDate,tests:[{name:i?'CRP':'Haemoglobin',value:i?'3':'13',unit:i?'mg/L':'g/dL',referenceRange:i?'0-5':'12-16',readable:true,sourceTop:.4}]}}));
 const identity=await confirmReportIdentity(sources('Alex Sample','Alex Other'),async()=>true);
 const read=mergeScanResults(scans,null,7,[],identity);assert.deepEqual(read.usedPages,[1,7]);assert.equal(read.markers.length,2);
});
test('evaluation copies omit names from structured fields, embedded AI replies and summary text',async()=>{
 const {withoutPatientNames}=await import('../src/private-log.js');
 const log={result:{patientName:'Alex Sample',tests:[]},rawResponse:{output:[{text:JSON.stringify({patientName:'Alex Other',tests:[]})}]},html:'Patient Alex Sample',ocrDiagnostics:{words:['Alex','Sample','Other']}};
 const cleaned=JSON.stringify(withoutPatientNames(log));for(const name of ['Alex','Sample','Other'])assert(!cleaned.includes(name));assert.equal(log.result.patientName,'Alex Sample');
});
