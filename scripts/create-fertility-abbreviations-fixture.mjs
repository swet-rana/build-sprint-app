// Fictional mixed-style test names only; no real patient data.
import {writeFile} from 'node:fs/promises';
const text=(s,x,y)=>`BT /F1 11 Tf ${x} ${y} Td (${s}) Tj ET`;
const rows=[['AMH','2','ng/mL','1-4'],['FSH','5','mIU/mL','2-10'],['LH','4','mIU/mL','2-10'],['E2','50','pg/mL','20-100'],['DHEA-S','100','ug/dL','50-300'],['HCG','1','mIU/mL','0-5']];
const lines=[text('FICTIONAL SAMPLE - NOT FOR CLINICAL USE',40,775),text('Patient Name : Sample Patient',40,745),text('Collection Date : 15/Jul/2026',40,720),...['Test Name','Result','Unit','Bio. Ref. Interval'].map((s,i)=>text(s,[40,255,325,450][i],660)),...rows.flatMap((row,n)=>row.map((s,i)=>text(s,[40,255,325,450][i],620-n*34)))];
const content=Buffer.from(lines.join('\n'));
const objects=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Kids [4 0 R] /Count 1 >>'),Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 700 800] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>'),Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`),content,Buffer.from('\nendstream')])];
const pieces=[Buffer.from('%PDF-1.4\n')],offsets=[0];let size=pieces[0].length;objects.forEach((object,i)=>{offsets.push(size);const bytes=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),object,Buffer.from('\nendobj\n')]);pieces.push(bytes);size+=bytes.length;});pieces.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF`));
await writeFile('tests/fixtures/fertility-abbreviations-fictional.pdf',Buffer.concat(pieces));
console.log('Created fertility-abbreviations-fictional.pdf: six fictional fertility test rows.');
