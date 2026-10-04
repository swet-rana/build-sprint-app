import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReport, compareReports, rangeStatus} from '../src/lab-parser.js';
const item=(str,x,y,width=30)=>({str,transform:[1,0,0,1,x,y],width});
function page(date,patient='Mrs.Sample Patient',id='TEST-123',value='6,830',unit='cells/cu.mm'){
 return {page:1,items:[item('Patient Name',30,743),item(': '+patient,112,743,85),item('Collected',302,743),item(': '+date,383,743,85),item('UHID/MR No',30,717),item(': '+id,112,717),item('Test Name',88,604,50),item('Result',236,604,31),item('Unit',323,604,19),item('Bio. Ref. Interval',376,604,80),item('Method',499,604,36),item('TOTAL LEUCOCYTE COUNT (TLC)',33,573,154),item(value,239,573,25),item(unit,308,573,50),item('4000-10000',389,573,52),item('Electrical Impedance',467,573,88),item('Comment:',33,545),item('Do not extract these illustrative notes',33,531,160),item('999',239,531),item('mg/L',308,531),item('0-5',389,531)]};
}
test('reads dated result columns, commas and source pages without extracting notes',()=>{
 const report=parseReport([page('27/May/2026 09:36AM')]);
 assert.equal(report.date,'2026-05-27');assert.equal(report.patientName,'Mrs.Sample Patient');
 assert.equal(report.markers.length,1);assert.equal(report.markers[0].value,6830);assert.equal(report.markers[0].page,1);assert.equal(report.markers[0].referenceText,'4000-10000');
});
test('different titles for the same patient compare in date order without inventing missing tests',()=>{
 const first=parseReport([page('27/May/2026')]);const last=parseReport([page('25/Aug/2026','Ms.Sample Patient','TEST-123','7,920')]);
 const result=compareReports(last,first);assert.equal(result.comparable.length,1);assert.equal(result.comparable[0].change,1090);assert.equal(result.earlier.date,'2026-05-27');assert.equal(result.comparable.some(m=>m.name==='C-reactive protein'),false);
});
test('different patients, same dates and incompatible units are not merged',()=>{
 const a=parseReport([page('27/May/2026')]);
 assert.throws(()=>compareReports(a,parseReport([page('25/Aug/2026','Mr.Other Patient','OTHER')])) ,/different people/);
 assert.throws(()=>compareReports(a,parseReport([page('27/May/2026')])) ,/different dates/);
 assert.throws(()=>compareReports(a,parseReport([page('25/Aug/2026','Ms.Sample Patient','TEST-123','7.9','10^9\/L')])) ,/matching tests/);
});
test('range boundaries respect printed less-than and less-than-or-equal symbols',()=>{
 assert.equal(rangeStatus(5,'0-5'),'within');assert.equal(rangeStatus(5,'<5'),'above');assert.equal(rangeStatus(5,'<=5'),'within');assert.equal(rangeStatus(40,'>=40 Desirable'),'within');assert.equal(rangeStatus(39,'>=40 Desirable'),'below');assert.equal(rangeStatus(5,''),'unknown');
});
test('undated attachments and urine tests cannot enter blood-test comparisons',()=>{
 const lab=page('27/May/2026');const attachment={page:2,items:lab.items.filter(i=>!i.str.includes('Collected')&&!i.str.includes('27/May'))};
 const urine={...lab,page:3,items:[...lab.items,item('COMPLETE URINE EXAMINATION (CUE)',26,590,200)]};
 const report=parseReport([lab,attachment,urine]);assert.equal(report.markers.length,1);assert.deepEqual(report.usedPages,[1]);assert.equal(report.excludedPages,2);
});
