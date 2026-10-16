// A fictional row directly below a same-name section heading. No real patient data.
import {createCanvas} from '@napi-rs/canvas';import {writeFile} from 'node:fs/promises';import {imageOnlyPdf} from './create-ocr-fixtures.mjs';
const c=createCanvas(1800,4800),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1800,4800);ctx.fillStyle='black';
const text=(s,x,y,size=38)=>{ctx.font=`${size}px Arial`;ctx.fillText(s,x,y);};
text('FICTIONAL REPORT - NOT FOR CLINICAL USE',70,110);text('Patient Name: Sample Patient',70,210);text('Collection Date: 15 Jul 2026',70,300);
text('Test',70,470);text('Result',720,470);text('Unit',1000,470);text('Reference',1270,470);
ctx.font='bold 46px Arial';ctx.fillText('CALCIUM',70,600);
text('Calcium',70,700);text('9.4',720,700);text('mg/dL',1000,700);text('8.6 - 10',1270,700);
text('Other fictional test',70,860);text('4.0',720,860);text('mg/L',1000,860);text('1 - 6',1270,860);
text('END OF FICTIONAL REPORT',70,4700);
await writeFile('tests/fixtures/scan-highlight-heading.pdf',imageOnlyPdf(c.toBuffer('image/jpeg'),1800,4800));
console.log('Fictional highlight fixture created: result row below a same-name section heading.');
