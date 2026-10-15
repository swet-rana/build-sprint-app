import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {identityFromItems,identityFromOcr,resolveReportIdentity} from '../src/report-identity.js';
import {parseReport,rowsFromItems} from '../src/lab-parser.js';
test('printed identity can be assembled from separate pages, and conflicting names are rejected',()=>{
 const identity=resolveReportIdentity([{page:1,patientName:'Sample Patient',reportDate:null},{page:3,patientName:null,reportDate:'2026-07-15'}]);
 assert.equal(identity.patientName,'Sample Patient');assert.equal(identity.reportDate,'2026-07-15');assert.deepEqual(identity.identitySources,{patientPage:1,datePage:3});
 assert.throws(()=>resolveReportIdentity([{page:1,patientName:'Sample Patient',reportDate:'2026-07-15'},{page:4,patientName:'Another Person',reportDate:null}]),/different patient names/);
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
