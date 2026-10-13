import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReport} from '../src/lab-parser.js';
const item=(str,x,y)=>({str,width:20,transform:[1,0,0,1,x,y],sourceTop:(840-y)/840});
const header=y=>['Test Name','Result','Unit','Bio. Ref. Interval','Method'].map((s,i)=>item(s,[30,230,330,430,530][i],y));
const row=(y,name,value,unit,range)=>[name,value,unit,range,'Measured'].map((s,i)=>item(s,[30,230,330,430,530][i],y));
function page(extra){return {page:6,items:[item('Patient Name : Sample Patient',30,800),item('Collection Date : 15 Jan 2026',30,780),...header(700),...row(670,'Calcium','9','mg/dL','8-10'),item('Comment:',30,640),...row(620,'Fake note value','999','mg/dL','0-5'),...extra]};}
test('explicit later panel resumes after comments and preserves its numeric source row',()=>{const r=parseReport([page([item('Iron Studies, Basic',30,590),...row(560,'Iron','45','ug/dL','30-150')])]);assert.deepEqual(r.markers.map(m=>[m.name,m.value,m.page,m.sourceTop]),[['CALCIUM',9,6,(840-670)/840],['Iron',45,6,(840-560)/840]]);});
test('a repeated full header resumes with its own reordered columns',()=>{const r=parseReport([page([item('Test Name',30,590),item('Unit',230,590),item('Result',330,590),item('Bio. Ref. Interval',430,590),item('Method',530,590),item('Iron',30,560),item('ug/dL',230,560),item('45',330,560),item('30-150',430,560),item('Measured',530,560)])]);assert.equal(r.markers.length,2);assert.equal(r.markers[1].value,45);assert.equal(r.markers[1].unit,'ug/dL');});
test('notes never resume extraction without an explicit result-panel or table header',()=>{assert.equal(parseReport([page([])]).markers.length,1);assert.equal(parseReport([page([item('Iron studies may be needed.',30,590),...row(560,'Fake result','888','ug/dL','0-5')])]).markers.length,1);});
