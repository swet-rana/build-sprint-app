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
test('reads Tata collection labels and compares names across lab-specific patient IDs',()=>{
 const tata=page('19/Aug/2024','Ms.Sample Patient','TATA-9','11.7','g/dL');
 tata.items=tata.items.map(i=>({...i,str:i.str==='Patient Name'?'Name':i.str==='UHID/MR No'?'Patient ID':i.str==='Collected'?'Collection Date':i.str==='TOTAL LEUCOCYTE COUNT (TLC)'?'Hemoglobin':i.str==='4000-10000'?'12.0 - 15.0':i.str}));
 const old=parseReport([tata]);
 assert.equal(old.date,'2024-08-19');assert.equal(old.markers[0].key,'haemoglobin|g/dl');
 const apollo=page('27/May/2026','Mrs.Sample Patient','APOLLO-1','12','g/dL');
 apollo.items=apollo.items.map(i=>({...i,str:i.str==='TOTAL LEUCOCYTE COUNT (TLC)'?'HAEMOGLOBIN':i.str}));
 const comparison=compareReports(old,parseReport([apollo]));assert.equal(comparison.comparable[0].change,0.3);
 assert.throws(()=>compareReports(old,{...parseReport([apollo]),patientName:'Other Person'}),/different people/);
});
test('keeps wrapped reference categories without borrowing the next test or notes',()=>{
 const p=page('19/Aug/2024');
 p.items=p.items.filter(i=>i.transform[5]>=573);
 p.items=p.items.map(i=>({...i,str:i.str==='4000-10000'?'Deficiency: <20,':i.str}));
 p.items.push(item('Insufficiency: 20-29,',376,561,78),item('Sufficiency: 30-100',376,550,78),item('Comment:',33,530),item('Not a reference',376,515,78));
 assert.equal(parseReport([p]).markers[0].referenceText,'Deficiency: <20, Insufficiency: 20-29, Sufficiency: 30-100');
});
test('three reports are ordered by date and missing results remain empty',async()=>{
 const {compareReportSeries}=await import('../src/lab-parser.js');
 const a=parseReport([page('19/Aug/2024')]),b=parseReport([page('27/May/2026','Ms.Sample Patient','TEST-123','7000')]),c=parseReport([page('25/Aug/2026','Ms.Sample Patient','TEST-123','7920')]);
 a.markers.push({...a.markers[0],key:'crp|mg/l',name:'C-reactive protein',unit:'mg/L',value:4});
 c.markers.push({...a.markers[1],value:3});
 const result=compareReportSeries([c,a,b]);
 assert.deepEqual(result.reports.map(r=>r.date),['2024-08-19','2026-05-27','2026-08-25']);
 assert.deepEqual(result.comparable[0].observations.map(m=>m.value),[6830,7000,7920]);
 assert.deepEqual(result.comparable[1].observations.map(m=>m?.value??null),[4,null,3]);
 assert.equal(result.comparable[1].missingLabels[1],'Not reported');
 b.markers.push({...a.markers[1],key:'crp|mg/dl',unit:'mg/dL'});
 assert.equal(compareReportSeries([a,b,c]).comparable[1].missingLabels[1],'Different unit');
 assert.throws(()=>compareReportSeries([a,b,{...c,patientName:'Other',patientId:'OTHER'}]),/different people/);
 assert.throws(()=>compareReportSeries([a,b,b]),/different dates/);
});
test('page-number footers cannot become a wrapped reference range',()=>{
 const p=page('27/May/2026');p.items=p.items.filter(i=>i.transform[5]>=573);
 p.items.push(item('Page 2 of 19',376,550,70));
 assert.equal(parseReport([p]).markers[0].referenceText,'4000-10000');
});
