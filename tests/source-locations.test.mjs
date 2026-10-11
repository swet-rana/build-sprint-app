import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReport,compareReportSeries} from '../src/lab-parser.js';
const item=(str,x,y,sourceTop)=>({str,width:10,transform:[1,0,0,1,x,y],sourceTop});
function page(number,date,top){return {page:number,items:[item('Patient Name',20,800),item('Sample Patient',120,800),item('Collected',300,800),item(date,400,800),...['Test Name','Result','Unit','Bio. Ref. Interval','Method'].map((s,i)=>item(s,[20,220,320,420,520][i],700)),...['CALCIUM','9.4','mg/dL','8.6-10','Method'].map((s,i)=>item(s,[20,220,320,420,520][i],400,top))]};}
test('each result preserves its own physical source page and row through date sorting',()=>{
 const later={...parseReport([page(6,'25/Aug/2026',.65)]),id:'later'};
 const earlier={...parseReport([page(9,'27/May/2026',.72)]),id:'earlier'};
 const observations=compareReportSeries([later,earlier]).comparable[0].observations;
 assert.deepEqual(observations.map(m=>({page:m.page,top:m.sourceTop,report:m.report.id})),[{page:9,top:.72,report:'earlier'},{page:6,top:.65,report:'later'}]);
});
test('missing source coordinates remain missing rather than guessing a row',()=>{
 assert.equal(parseReport([page(4,'25/Aug/2026',undefined)]).markers[0].sourceTop,undefined);
});
