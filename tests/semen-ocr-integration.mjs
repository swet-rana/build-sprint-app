// Fictional local image fixtures; no personal reports or remote recognition service.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createCanvas} from '@napi-rs/canvas';
import {createWorker} from 'tesseract.js';
import {ocrPage} from '../src/ocr-page.js';
import {parseReport,compareReportSeries} from '../src/lab-parser.js';
const folder=new URL('../tmp/semen-fixtures/',import.meta.url);await mkdir(folder,{recursive:true});
const worker=await createWorker('eng',1,{langPath:new URL('../public/ocr/lang',import.meta.url).pathname});
try{
 const reports=[];
 for(const [index,date,concentration] of [[1,'15/Jan/2026',24],[2,'15/Feb/2026',30]]){
  const canvas=createCanvas(3200,3000),ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,3200,3000);ctx.fillStyle='black';ctx.font='48px Arial';
  ctx.fillText('SEMEN ANALYSIS',60,100);ctx.fillText('Patient Name : Sample Patient',60,200);ctx.fillText(`Collection Date : ${date}`,60,280);
  const xs=[60,1250,1580,2150,2750];
  ['Test Name','Result','Unit','Bio. Ref. Interval','Method'].forEach((v,i)=>ctx.fillText(v,xs[i],500));
  const rows=[['Semen volume','2.5','mL','1.4-6','Measured'],['Sperm concentration',String(concentration),'million/mL','16-200','Counting'],['Total sperm count',String(concentration*2.5),'million/ejaculate','39-500','Calculated'],['Total motility','45','%','42-100','Microscopy'],['Progressive motility','31','%','30-100','Microscopy'],['Normal forms','5','%','4-100','Strict']];
  rows.forEach((row,n)=>row.forEach((v,i)=>ctx.fillText(v,xs[i],630+n*110)));
  const bytes=canvas.toBuffer('image/png');await writeFile(new URL(`semen-${index}.png`,folder),bytes);
  const recognized=await worker.recognize(bytes,{}, {blocks:true});const report=parseReport([ocrPage(recognized.data,3200,3000)]);
  assert.equal(report.reportKind,'semen');assert.equal(report.patientName,'Sample Patient');assert.equal(report.markers.length,6);assert.equal(report.markers.find(m=>m.name==='Sperm concentration').value,concentration);reports.push(report);
 }
 const compared=compareReportSeries(reports);assert.equal(compared.comparable.length,6);assert.equal(compared.comparable.find(m=>m.name==='Sperm concentration').change,6);console.log('Two semen photos: real recognition, identities, source references and comparison passed.');
}finally{await worker.terminate();}
