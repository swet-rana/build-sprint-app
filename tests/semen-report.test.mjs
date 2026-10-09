import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReport,compareReportSeries} from '../src/lab-parser.js';
import {semenIdentity} from '../src/semen-markers.js';
import {categoriesForTest} from '../src/health-categories.js';
import {detailsFromReport} from '../src/report-details.js';
const item=(str,x,y,width=20)=>({str,width,transform:[1,0,0,1,x,y]});
export function semenPage(date='15/Jan/2026',rows=[['Sperm concentration','24','million/mL','>=16','Counting chamber'],['Total motility','45','%','>=42','Microscopy'],['Progressive motility','31','%','>=30','Microscopy'],['Normal forms','5','%','>=4','Strict criteria']]){
 return {page:1,items:[item('SEMEN ANALYSIS',25,800),item('Patient Name',25,760),item('Sample Patient',120,760),item('Collection Date',300,760),item(date,405,760),...['Test Name','Result','Unit','Bio. Ref. Interval','Method'].map((name,i)=>item(name,[40,240,320,410,520][i],680)),...rows.flatMap((r,index)=>r.map((v,col)=>item(v,[40,240,320,410,520][col],650-index*30)))]};
}
test('semen tables preserve printed values, units, references and source pages',()=>{
 const report=parseReport([semenPage()]);assert.equal(report.reportKind,'semen');assert.equal(detailsFromReport(report).testType,'Semen analysis');assert.equal(report.markers.length,4);assert.equal(report.markers[0].value,24);assert.equal(report.markers[0].referenceText,'>=16');assert.equal(report.markers[0].page,1);
 for(const m of report.markers){assert.ok(m.key.startsWith('semen-'));assert.deepEqual(categoriesForTest(m),['fertility']);}
});
test('semen concentration, total count and motility conditions remain separate',()=>{
 const a=parseReport([semenPage()]),b=parseReport([semenPage('15/Feb/2026',[['Sperm count','30','million/mL','>=16','Counting chamber'],['Total sperm count','90','million/ejaculate','>=39','Calculated'],['Total motility','49','%','>=42','Microscopy']])]);
 const result=compareReportSeries([b,a]);assert.equal(result.comparable.length,2);assert.equal(result.comparable.find(m=>m.name==='Sperm concentration').change,6);assert.ok(result.unpaired.some(m=>m.name==='Total sperm count'));assert.ok(result.unpaired.some(m=>m.name==='Progressive sperm motility'));
 assert.notEqual(semenIdentity('Total motility','%').key,semenIdentity('Progressive motility','%').key);
 assert.notEqual(semenIdentity('Sperm count','million/mL').key,semenIdentity('Total sperm count','million/ejaculate').key);
});
test('semen units and preparation must be explicit and DFI assays cannot merge',()=>{
 assert.throws(()=>parseReport([semenPage('15/Jan/2026',[['Sperm concentration','24','%','>=16','']])]),/unit/);
 assert.throws(()=>parseReport([{...semenPage(),items:[...semenPage().items,item('Post wash',20,790)]}]),/washed/);
 assert.throws(()=>semenIdentity('DFI','%'),/method/);
 assert.notEqual(semenIdentity('DFI','%','SCSA').key,semenIdentity('DFI','%','TUNEL').key);
 assert.equal(semenIdentity('Morphology','%'),null);
});
test('qualitative and bounded semen results stay out of numeric trends with an omission notice',()=>{
 const report=parseReport([semenPage('15/Jan/2026',[['Total motility','45','%','>=42','Microscopy'],['Sperm count','<1','million/mL','>=16',''],['Appearance','Normal','','','']])]);
 assert.equal(report.markers.length,1);assert.equal(report.warnings.length,2);
});
test('semen and blood rows with the same printed name cannot merge',()=>{
 const a=parseReport([semenPage()]);const bloodPage=semenPage('15/Feb/2026');bloodPage.items=bloodPage.items.filter(i=>i.str!=='SEMEN ANALYSIS');const b=parseReport([bloodPage]);
 assert.throws(()=>compareReportSeries([a,b]),/matching tests/);
});
