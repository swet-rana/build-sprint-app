// Fictional identity scan: only the cover has identity; pages 2 and 3 have different results.
import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
import {readFile,writeFile} from 'node:fs/promises';
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
const task=getDocument({data:new Uint8Array(await readFile('tests/fixtures/vision-sample.pdf')),useSystemFonts:true});
let firstResultImage,secondResultImage;
try{const page=await(await task.promise).getPage(1),v=page.getViewport({scale:3}),c=createCanvas(v.width,v.height);await page.render({canvas:c,canvasContext:c.getContext('2d'),viewport:v}).promise;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(60,150,1700,180);ctx.fillRect(60,840,1700,95);firstResultImage=c.toBuffer('image/jpeg');await page.render({canvas:c,canvasContext:c.getContext('2d'),viewport:v}).promise;ctx.fillStyle='white';ctx.fillRect(60,150,1700,180);ctx.fillRect(60,600,1700,220);secondResultImage=c.toBuffer('image/jpeg');await writeFile('tmp/scan-filter-last-page.png',c.toBuffer('image/png'));}finally{await task.destroy();}
const cover=createCanvas(1800,2400),ctx=cover.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1800,2400);ctx.fillStyle='#000';ctx.font='48px Arial';ctx.fillText('FICTIONAL COVER / IMAGE ATTACHMENT',80,140);ctx.fillText('NOT FOR CLINICAL USE',80,230);ctx.fillText('Collection Date: 15 Jul 2026',80,330);ctx.fillText('Patient Name: Sample Patient',80,410);ctx.fillText('Report number: 123456789',80,490);ctx.fillText('Phone: 9876543210',80,570);ctx.strokeStyle='#493DBB';ctx.lineWidth=4;ctx.beginPath();ctx.arc(900,1400,320,0,Math.PI*2);ctx.stroke();await writeFile('tmp/scan-filter-cover-page.png',cover.toBuffer('image/png'));
const jpgs=[cover.toBuffer('image/jpeg'),firstResultImage,secondResultImage],objects=[];
// Catalog and pages root, followed by a separate page/image/content triple per physical page.
objects.push(Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'));
objects.push(Buffer.from(`<< /Type /Pages /Kids [${jpgs.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] /Count ${jpgs.length} >>`));
for(const [i,jpg] of jpgs.entries()){
 const id=3+i*3,content=Buffer.from('q 600 0 0 800 0 0 cm /Im0 Do Q');
 objects.push(Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /XObject << /Im0 ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`));
 objects.push(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1800 /Height 2400 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`),jpg,Buffer.from('\nendstream')]));
 objects.push(Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`),content,Buffer.from('\nendstream')]));
}
const pieces=[Buffer.from('%PDF-1.4\n')],offsets=[0];let size=pieces[0].length;
objects.forEach((object,i)=>{offsets.push(size);const bytes=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),object,Buffer.from('\nendobj\n')]);pieces.push(bytes);size+=bytes.length;});
pieces.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF`));
await writeFile('tests/fixtures/vision-report-identity.pdf',Buffer.concat(pieces));
console.log('Fictional identity PDF created: 3 pages; identity only on page 1; different result tables on pages 2 and 3.');
