import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReport,rangeStatus} from '../src/lab-parser.js';
const item=(str,x,y,width=40)=>({str,width,transform:[1,0,0,1,x,y],sourceTop:(840-y)/840});
function block({date='15 Jan 2026',reference=true}={}){return {page:4,items:[item('NAME',40,770),item(':',130,770,4),item('Sample Patient (30Y/F)',140,770,140),item('TEST NAME',40,650,70),item('TECHNOLOGY',260,650,85),item('VALUE',400,650),item('UNITS',480,650),item('HbA1c - (HPLC - NGSP Certified)',40,625,195),item('H.P.L.C',260,610),item('5.8',400,610,20),item('%',480,610,10),...(reference?[item('Reference Range:',40,590,100),item('Below 5.7%: Normal',40,570,160),item('Reference Range: As per lab guidelines',40,580,220),item('Guidance For Known Diabetics',330,580,170),item('Below 6.5%: Good Control',330,570,160),item('5.7%-6.4%: Prediabetic',40,555,170)]:[]),item('Method:',40,530),item('999',400,515),item('%',480,515),item('Sample Collected on (SCT)',40,130,170),item(':',215,130,4),item(date,230,130,100),item('Report Released on (RRT)',40,110,170),item(':',215,110,4),item('20 Jul 2030',230,110,100)]};}
test('footer layout keeps collection date, patient, split result name, range categories and physical source row',()=>{const r=parseReport([block()]);assert.equal(r.date,'2026-01-15');assert.equal(r.patientName,'Sample Patient');assert.equal(r.markers.length,1);const m=r.markers[0];assert.equal(m.name,'HbA1c');assert.equal(m.value,5.8);assert.equal(m.page,4);assert.equal(m.sourceTop,(840-610)/840);assert.equal(m.referenceText,'Below 5.7%: Normal 5.7%-6.4%: Prediabetic');assert.equal(rangeStatus(m.value,m.referenceText),'unknown');});
test('missing separate reference remains missing and method numbers cannot become results',()=>{const r=parseReport([block({reference:false})]);assert.equal(r.markers.length,1);assert.equal(r.markers[0].referenceText,'Not printed in result row');});
test('release date cannot replace missing or invalid sample collection date',()=>{for(const date of ['', '31 Feb 2026'])assert.throws(()=>parseReport([block({date})]),/No supported dated/);});
test('footer layout still rejects different patients or collection dates in one file',()=>{const first=block();const second=block({date:'15 Jul 2026'});second.page=5;assert.throws(()=>parseReport([first,second]),/different dates/);const other=block();other.items=other.items.map(i=>({...i,str:i.str==='Sample Patient (30Y/F)'?'Other Patient (30Y/F)':i.str}));assert.throws(()=>parseReport([first,other]),/different people/);});

test('inline reference block stays with its result and does not consume the next split-name result',()=>{
 const p=block({reference:false});p.items=p.items.filter(i=>i.transform[5]!==530&&i.transform[5]!==515);
 p.items.push(item('Reference Range: 0-10',40,590,160),item('CRP',40,555),item('Measured',260,540),item('3',400,540,10),item('mg/L',480,540),item('Reference Range: 0-5',40,520,160),item('Method:',40,500));
 const r=parseReport([p]);assert.deepEqual(r.markers.map(m=>[m.name,m.value,m.referenceText]),[['HbA1c',5.8,'0-10'],['C-reactive protein',3,'0-5']]);
});
test('gender-specific blocks stay descriptive rather than picking a range',()=>{
 const p=block({reference:false});p.items.push(item('Reference Range:',40,590,110),item('Male: 13-17',40,570,90),item('Female: 12-15',40,555,100));
 const m=parseReport([p]).markers[0];assert.equal(m.referenceText,'Male: 13-17 Female: 12-15');assert.equal(rangeStatus(m.value,m.referenceText),'unknown');
});

test('negative bounds in an inline range keep their minus sign',()=>{const p=block({reference:false});p.items.push(item('Reference Range: -2-2',40,590,160));assert.equal(parseReport([p]).markers[0].referenceText,'-2-2');});
