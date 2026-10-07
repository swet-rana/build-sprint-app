import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanDetails } from '../convex/reportDetails.js';
import { detailsFromReport, fillMissingDetails, shortTestType } from '../src/report-details.js';
test('report details use the collection date and patient, with unknown labs left blank', () => {
  const report = { date:'2024-08-19', patientName:'Fictional Patient', patientIdIssuer:'tata-1mg', labName:'Tata 1mg', markers:[{name:'LDL Cholesterol',key:'ldl|mg/dl'}] };
  const details = detailsFromReport(report);
  assert.equal(details.labName,'Tata 1mg'); assert.equal(details.testDate,report.date);
  assert.equal(details.patientName,report.patientName); assert.equal(details.testType,'Cholesterol blood test panel');
  assert.equal(detailsFromReport({...report,labName:''}).labName,'');
});
test('existing category lists become short descriptions while custom wording is preserved', () => {
  assert.equal(shortTestType('Blood tests: Heart & cholesterol, Liver, Kidney'),'Comprehensive blood tests');
  assert.equal(shortTestType('Blood tests: Thyroid'),'Thyroid function blood tests');
  assert.equal(shortTestType('Annual health check tests'),'Annual health check tests');
});
test('a temporary reading failure does not save blank details and can be retried after reload', async () => {
  const reports=[{id:'a'}], saved=[];
  let failed=false;
  await fillMissingDetails({getReports:()=>reports,attempted:new Set(),readDetails:async()=>{throw Error('offline');},saveDetails:async(r,d)=>saved.push(d),onFailure:()=>{failed=true;}});
  assert.equal(failed,true); assert.equal(saved.length,0);
  await fillMissingDetails({getReports:()=>reports,attempted:new Set(),readDetails:async()=>({labName:'Printed lab'}),saveDetails:async(r,d)=>saved.push(d),onFailure:()=>assert.fail()});
  assert.equal(saved[0].labName,'Printed lab');
});
test('reports uploaded during a details read are included in the same pass', async () => {
  let reports=[{id:'a'}]; const saved=[];
  await fillMissingDetails({getReports:()=>reports,attempted:new Set(),readDetails:async r=>{
    if(r.id==='a') reports=[...reports,{id:'b'}];
    return {labName:r.id};
  },saveDetails:async(r,d)=>saved.push(d.labName),onFailure:()=>assert.fail()});
  assert.deepEqual(saved,['a','b']);
});
test('missing details are allowed but impossible dates and oversized values are rejected', () => {
  const blank = {labName:'',testType:'',patientName:'',testDate:''};
  assert.deepEqual(cleanDetails(blank),blank);
  assert.equal(cleanDetails({...blank,labName:' Lab\n name '}).labName,'Lab name');
  assert.throws(() => cleanDetails({...blank,testDate:'2026-02-30'}),/valid test date/);
  assert.throws(() => cleanDetails({...blank,patientName:'x'.repeat(161)}),/160/);
});
