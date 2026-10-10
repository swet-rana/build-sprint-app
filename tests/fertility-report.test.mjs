import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {parseReport,compareReports} from '../src/lab-parser.js';
async function pages(name){
 const task=getDocument({data:new Uint8Array(await fs.readFile(new URL(`./fixtures/${name}`,import.meta.url))),useSystemFonts:true});
 try{const pdf=await task.promise;const result=[];for(let page=1;page<=pdf.numPages;page++)result.push({page,items:(await(await pdf.getPage(page)).getTextContent()).items});return result;}finally{await task.destroy();}
}
test('reads both fictional fertility PDFs with inline identity, spaced dates and four printed columns',async()=>{
 const early=parseReport(await pages('fertility-sample-january.pdf'));
 const late=parseReport(await pages('fertility-sample-july.pdf'));
 assert.equal(early.patientName,'Priya Sharma');assert.equal(late.patientName,'Priya Sharma');
 assert.equal(early.date,'2026-01-15');assert.equal(late.date,'2026-07-15');
 assert.equal(early.markers.length,6);assert.equal(late.markers.length,6);
 assert.deepEqual(early.markers.map(m=>m.value),[1.2,9.8,6.5,48,3.8,28]);
 assert.deepEqual(late.markers.map(m=>m.value),[1.5,7.2,5.8,55,2.4,18]);
 assert.equal(early.markers[0].referenceText,'Age-dependent');assert.equal(early.markers[0].status,undefined);
 assert(early.markers.every(m=>m.page===1));assert.equal(early.labName,'');
 const compared=compareReports(late,early);assert.equal(compared.comparable.length,6);
 assert.equal(compared.comparable.find(m=>/prolactin/i.test(m.name)).change,-10);
 const invalid=await pages('fertility-sample-january.pdf');
 invalid[0].items=invalid[0].items.map(i=>({...i,str:i.str.replace('15 Jan 2026','31 Feb 2026')}));
 assert.throws(()=>parseReport(invalid),/No supported dated/);
});
