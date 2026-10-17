import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {identityFromItems,identityFromOcr,resolveReportIdentity} from '../src/report-identity.js';
import {parseReport,rowsFromItems} from '../src/lab-parser.js';
test('printed identity can be assembled from separate pages, and conflicting names request confirmation',()=>{
 const identity=resolveReportIdentity([{page:1,patientName:'Sample Patient',reportDate:null},{page:3,patientName:null,reportDate:'2026-07-15'}]);
 assert.equal(identity.patientName,'Sample Patient');assert.equal(identity.reportDate,'2026-07-15');assert.deepEqual(identity.identitySources,{patientPage:1,datePage:3});
 assert.equal(resolveReportIdentity([{page:1,patientName:'Sample Patient',reportDate:'2026-07-15'},{page:4,patientName:'Another Person',reportDate:null}]).needsConfirmation,true);
 assert.throws(()=>resolveReportIdentity([{page:1,patientName:'Sample Patient',reportDate:'2026-02-30'}]),/patient name and report date/);
});
test('OCR identity from a cover respects the unchanged 80-percent confidence rule',()=>{
 const words=(text,y,confidence=95)=>text.split(' ').map((text,i)=>({text,confidence,bbox:{x0:i*80,y0:y,x1:i*80+70,y1:y+25}}));
 const name=words('Patient Name : Sample Patient',100),date=words('Collected : 15/Jul/2026',200);
 const data={blocks:[{paragraphs:[{lines:[{words:name},{words:date}]}]}]};
 assert.deepEqual(identityFromOcr(data,1800,2400,1),{page:1,patientName:'Sample Patient',reportDate:'2026-07-15'});
 name.at(-1).confidence=79;assert.equal(identityFromOcr(data,1800,2400,1).patientName,null);assert.equal(identityFromOcr(data,1800,2400,1).reportDate,'2026-07-15');
});
test('OCR table rows without identity use the printed whole-report identity and retain their source page',async()=>{
 const task=getDocument({data:new Uint8Array(await readFile(new URL('./fixtures/blood-sample-january.pdf',import.meta.url))),useSystemFonts:true});
 try{const pdf=await task.promise,pages=[];for(let n=1;n<=pdf.numPages;n++)pages.push({page:n,items:(await(await pdf.getPage(n)).getTextContent()).items});
 const original=parseReport(pages),page=pages.find(p=>p.page===original.usedPages[0]),identity=identityFromItems(page),identityRows=rowsFromItems(page.items).filter(r=>/Patient Name|Collection Date/.test(r.text));
 const removed=new Set(identityRows.flatMap(r=>r.items)),without={page:page.page,items:page.items.filter(i=>!removed.has(i))};
 assert.throws(()=>parseReport([without]),/No supported dated/);
 const kept=parseReport([without],{identityForPages:new Map([[without.page,identity]])});assert.deepEqual(kept.markers,original.markers);assert.equal(kept.patientName,original.patientName);assert.equal(kept.date,original.date);
 }finally{await task.destroy();}
});

test('scan identity ignores titles, case, punctuation, spacing, middle initials and age/sex suffixes',()=>{
 const variants=['Mr. Alex Sample (45 M)','ALEX SAMPLE','Dr Alex J. Sample','A. Sample','AlexSample','Mrs. Alex Sample (45Y/F)'];
 const result=resolveReportIdentity(variants.map((patientName,i)=>({page:i+1,patientName,reportDate:'2026-07-15'})));
 assert.equal(result.patientName,variants[0]);assert.equal(result.identitySources.patientPage,1);
 assert.doesNotThrow(()=>resolveReportIdentity([{page:1,patientName:"Alex O'Connor",reportDate:'2026-07-15'},{page:2,patientName:'Alex OConnor',reportDate:null}]));
});
test('doctor and referrer labels are not patient identity, even if vision chooses that name',()=>{
 const items=[{str:'Patient Name: Alex Sample',width:500,transform:[1,0,0,1,0,900]},{str:'Ref. By: Dr Robin Example',width:500,transform:[1,0,0,1,0,850]},{str:'Collection Date: 15/Jul/2026',width:500,transform:[1,0,0,1,0,800]}];
 const evidence=identityFromItems({page:2,items});assert.deepEqual(evidence.nonPatientNames,['Dr Robin Example']);
 assert.doesNotThrow(()=>resolveReportIdentity([{page:1,patientName:'Alex Sample',reportDate:'2026-07-15'},evidence,{page:2,patientName:'Dr Robin Example',reportDate:null},{page:3,patientName:'Referring doctor: Dr Other Example',reportDate:null}]));
 const onlyDoctor=identityFromItems({page:4,items:items.slice(1)});assert.equal(onlyDoctor.patientName,null);
 assert.throws(()=>resolveReportIdentity([{...onlyDoctor,patientName:'Dr Robin Example'}]),/patient name and report date/);
 // A real patient with a Dr title is still a patient, not a doctor field.
 assert.doesNotThrow(()=>resolveReportIdentity([{page:1,patientName:'Dr Alex Sample',reportDate:'2026-07-15'},{page:2,patientName:'Alex Sample',reportDate:null}]));
});
test('clearly different patients request confirmation, including ambiguous initials between full names',()=>{
 for(const names of [['Alex Sample','Jamie Sample'],['Alex Sample','Alex Other'],['Alex Sample','A. Sample','Andrew Sample']]){
  const result=resolveReportIdentity(names.map((patientName,i)=>({page:i+1,patientName,reportDate:'2026-07-15'})));assert.equal(result.needsConfirmation,true);assert.deepEqual(result.conflict.map(x=>x.page),[1,names.length]);
 }
});
