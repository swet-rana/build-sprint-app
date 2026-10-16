// Fictional mixed PDF: three native text pages, one scanned cover, one scanned table.
import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
import {readFile,writeFile} from 'node:fs/promises';
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
const task=getDocument({data:new Uint8Array(await readFile('tests/fixtures/vision-sample.pdf')),useSystemFonts:true});let resultImage;
try{const page=await(await task.promise).getPage(1),v=page.getViewport({scale:3}),c=createCanvas(v.width,v.height);await page.render({canvas:c,canvasContext:c.getContext('2d'),viewport:v}).promise;resultImage={bytes:c.toBuffer('image/jpeg'),width:c.width,height:c.height};}finally{await task.destroy();}
const cover=createCanvas(1800,2400),ctx=cover.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1800,2400);ctx.fillStyle='#17145c';ctx.font='40px Arial';ctx.fillText('FICTIONAL IMAGE ATTACHMENT',100,170);ctx.fillText('No laboratory result table on this page.',100,270);
const text=(s,x,y)=>`BT /F1 11 Tf ${x} ${y} Td (${s}) Tj ET`;
const title=text('FICTIONAL SOFTWARE TEST - NOT FOR CLINICAL USE',40,775),identity=text('Patient Name : Sample Patient',40,745)+'\n'+text('Collection Date : 15/Jul/2026',40,720);
const table=[['Test Name',40,660],['Result',250,660],['Unit',325,660],['Bio. Ref. Interval',435,660],['Calcium',40,620],['9.3',250,620],['mg/dL',325,620],['8.5-10.5',435,620]].map(a=>text(...a)).join('\n');
const pages=[{text:title+'\n'+text('Text cover page. Results follow on later pages.',40,700)},{text:title+'\n'+identity+'\n'+table},{image:{bytes:cover.toBuffer('image/jpeg'),width:1800,height:2400}},{image:resultImage},{text:title+'\n'+text('Text information page. Keep the original for reference.',40,700)}];
const objects=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),null,Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')],kids=[];
const add=bytes=>{objects.push(Buffer.from(bytes));return objects.length;};
for(const page of pages){
 const pageId=objects.length+1;kids.push(pageId);objects.push(null);
 const content=page.image?'q 600 0 0 800 0 0 cm /Im0 Do Q':page.text,stream=Buffer.from(content);
 const contentId=add(Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`),stream,Buffer.from('\nendstream')]));
 let resource='/Font << /F1 3 0 R >>';
 if(page.image){const {bytes,width,height}=page.image,imageId=add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`),bytes,Buffer.from('\nendstream')]));resource=`/XObject << /Im0 ${imageId} 0 R >>`;}
 objects[pageId-1]=Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << ${resource} >> /Contents ${contentId} 0 R >>`);
}
objects[1]=Buffer.from(`<< /Type /Pages /Kids [${kids.map(n=>n+' 0 R').join(' ')}] /Count ${pages.length} >>`);
const pieces=[Buffer.from('%PDF-1.4\n')],offsets=[0];let length=pieces[0].length;
objects.forEach((object,i)=>{offsets.push(length);const b=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),object,Buffer.from('\nendobj\n')]);pieces.push(b);length+=b.length;});
pieces.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF`));
await writeFile('tests/fixtures/page-coverage-mixed.pdf',Buffer.concat(pieces));console.log('Fictional mixed PDF created: 5 pages; 3 text pages; 1 scanned cover; 1 scanned table.');
