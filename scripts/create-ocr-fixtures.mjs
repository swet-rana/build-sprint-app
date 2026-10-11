import { createCanvas } from '@napi-rs/canvas';
import {writeFile,mkdir} from 'node:fs/promises';
const base=new URL('../tmp/ocr-fixtures',import.meta.url).pathname;await mkdir(base,{recursive:true});
for(const [name,date,value] of [['first','27/May/2026','13.5'],['second','25/Aug/2026','11.8']]){
 const c=createCanvas(1800,2400),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1800,2400);ctx.fillStyle='black';ctx.font='36px Arial';
 const text=(str,x,y)=>ctx.fillText(str,x,y);
 text(name==='first'?'Tata 1mg':'Apollo Diagnostics',60,100);text('FICTIONAL SAMPLE - NOT FOR CLINICAL USE',60,150);text('Patient Name : Sample Patient',60,200);text(`Collected : ${date}`,60,280);
 text('Test Name',60,500);text('Result',720,500);text('Unit',960,500);text('Bio. Ref. Interval',1170,500);text('Method',1620,500);
 text('HAEMOGLOBIN',60,620);text(value,720,620);text('g/dL',960,620);text('12-15',1275,620);text('Calculated',1620,620);
 text('CRP',60,740);text('2.50',720,740);text('mg/L',960,740);text('0-5',1275,740);text('Measured',1620,740);
 const jpg=c.toBuffer('image/jpeg');await writeFile(`${base}/${name}.jpg`,jpg);
 await writeFile(`${base}/${name}-scanned.pdf`,imageOnlyPdf(jpg));
}
const blank=createCanvas(1200,1600);blank.getContext('2d').fillStyle='white';blank.getContext('2d').fillRect(0,0,1200,1600);await writeFile(`${base}/unreadable.png`,blank.toBuffer('image/png'));
console.log('Fictional photos, scanned PDFs and blank image created.');

export function imageOnlyPdf(jpg,width=1800,height=2400){
 // Image-only PDF: no text layer.
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width/3} ${height/3}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`];
 const stream=Buffer.from(`q ${width/3} 0 0 ${height/3} 0 0 cm /Im0 Do Q`);
 const image=Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`),jpg,Buffer.from('\nendstream')]);
 const content=Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`),stream,Buffer.from('\nendstream')]);
 const pieces=[Buffer.from('%PDF-1.4\n')],offsets=[0];
 for(const [i,obj] of [...objects,image,content].entries()){offsets.push(pieces.reduce((s,p)=>s+p.length,0));pieces.push(Buffer.from(`${i+1} 0 obj\n`),Buffer.isBuffer(obj)?obj:Buffer.from(obj),Buffer.from('\nendobj\n'));}
 const xref=pieces.reduce((s,p)=>s+p.length,0);pieces.push(Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));return Buffer.concat(pieces);
}
