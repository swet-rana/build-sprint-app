// Fictional text PDFs only. No real patient data.
import {writeFile} from 'node:fs/promises';
const text=(s,x,y)=>`BT /F1 11 Tf ${x} ${y} Td (${s}) Tj ET`;
for(const month of ['january','july']){
 const date=month==='january'?'15/Jan/2026':'15/Jul/2026',values=month==='january'?['12.5','6','20']:['13.2','3','24'];
 const rows=[['Hemoglobin',values[0],'g/dL','12-15'],['CRP',values[1],'mg/L','0-5'],['Vitamin D',values[2],'ng/mL','30-100']];
 const pageText=[text('FICTIONAL SAMPLE - NOT FOR CLINICAL USE',40,775),text('Cover page. Laboratory results are on page two.',40,730)];
 const results=[text('FICTIONAL SAMPLE - NOT FOR CLINICAL USE',40,775),text('Patient Name : Sample Patient',40,745),text('Collection Date : '+date,40,720),...['Test Name','Result','Unit','Bio. Ref. Interval'].map((s,i)=>text(s,[40,255,325,450][i],660)),...rows.flatMap((row,n)=>row.map((s,i)=>text(s,[40,255,325,450][i],620-n*40)))];
 const objects=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Kids [4 0 R 6 0 R] /Count 2 >>'),Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')];
 for(const [i,lines]of[pageText,results].entries()){const id=4+i*2,content=Buffer.from(lines.join('\n'));objects.push(Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id+1} 0 R >>`));objects.push(Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`),content,Buffer.from('\nendstream')]));}
 const pieces=[Buffer.from('%PDF-1.4\n')],offsets=[0];let size=pieces[0].length;objects.forEach((object,i)=>{offsets.push(size);const bytes=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),object,Buffer.from('\nendobj\n')]);pieces.push(bytes);size+=bytes.length;});pieces.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF`));
 await writeFile(`tests/fixtures/hits-misses-${month}.pdf`,Buffer.concat(pieces));
}
console.log('Created two fictional two-page PDFs for Hits and Misses verification.');
