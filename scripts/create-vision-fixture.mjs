// Entirely fictional image-only report. Nonstandard headings deliberately reject the OCR table mapper.
import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
import {writeFile} from 'node:fs/promises';
import {imageOnlyPdf} from './create-ocr-fixtures.mjs';
const c=createCanvas(1800,2400),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1800,2400);ctx.fillStyle='#17145c';
const text=(str,x,y,size=34)=>{ctx.font=`${size}px Arial`;ctx.fillText(str,x,y);};
text('FICTIONAL LAB - NOT FOR CLINICAL USE',80,100,42);
text('Patient Name : Sample Patient',80,200);text('Collected : 15/Jul/2026',80,280);
text('BLOOD LABORATORY RESULTS',80,400,40);
for(const [str,x] of [['Analyte',80],['Measurement',650],['Units',1000],['Reference interval',1270]])text(str,x,510,30);
ctx.strokeStyle='#62658c';ctx.beginPath();ctx.moveTo(80,550);ctx.lineTo(1700,550);ctx.stroke();
for(const [i,row] of [['Haemoglobin','13.2','g/dL','12 - 16'],['CRP','3.0','mg/L','0 - 5'],['Vitamin D','24','ng/mL','30 - 100']].entries())for(const [j,str] of row.entries())text(str,[80,650,1000,1270][j],650+i*120);
// A clearly separate illustrative image, not another results table.
ctx.fillStyle='#EEE9FF';ctx.fillRect(80,1150,650,420);ctx.strokeStyle='#493DBB';ctx.beginPath();ctx.arc(390,1350,95,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#17145c';text('Illustrative image - not a test result',80,1650,28);
await writeFile('tests/fixtures/vision-sample.pdf',imageOnlyPdf(c.toBuffer('image/jpeg')));
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:new Uint8Array(await (await import('node:fs/promises')).readFile('tests/fixtures/vision-sample.pdf')),useSystemFonts:true});try{const page=await(await task.promise).getPage(1),v=page.getViewport({scale:2}),out=createCanvas(v.width,v.height);await page.render({canvas:out,canvasContext:out.getContext('2d'),viewport:v}).promise;await writeFile('tmp/vision-fixture-preview.png',out.toBuffer('image/png'));}finally{await task.destroy();}
console.log('Fictional scanned report created: haemoglobin 13.2 g/dL, CRP 3.0 mg/L, Vitamin D 24 ng/mL, dated 15 July 2026.');
