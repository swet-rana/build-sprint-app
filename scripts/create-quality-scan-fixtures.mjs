// Exact, repeatable scan degradation; preserves the fictional source values.
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {readFile,writeFile} from 'node:fs/promises';
import {imageOnlyPdf} from './create-ocr-fixtures.mjs';
const source=new URL('../tmp/ocr-fixtures/',import.meta.url);
const target=new URL('../tests/fixtures/',import.meta.url);
for(const [sourceName,label] of [['first','early'],['second','late']]){
 const image=await loadImage(await readFile(new URL(`${sourceName}.jpg`,source)));
 for(const kind of ['blurred','tilted']){
  const c=createCanvas(image.width,image.height),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);
  if(kind==='blurred')ctx.filter='blur(0.8px)';
  else{ctx.translate(c.width/2,c.height/2);ctx.rotate(0.25*Math.PI/180);ctx.translate(-c.width/2,-c.height/2);}
  ctx.drawImage(image,0,0);
  await writeFile(new URL(`${kind}-sample-${label}.pdf`,target),imageOnlyPdf(c.toBuffer('image/jpeg'),c.width,c.height));
 }
 if(label==='early'){
  const c=createCanvas(image.width,image.height),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.filter='blur(10px)';ctx.drawImage(image,0,0);
  await writeFile(new URL('blur-unreadable-sample.pdf',target),imageOnlyPdf(c.toBuffer('image/jpeg'),c.width,c.height));
  const rotated=createCanvas(image.height,image.width),r=rotated.getContext('2d');r.fillStyle='white';r.fillRect(0,0,rotated.width,rotated.height);r.translate(rotated.width,0);r.rotate(Math.PI/2);r.drawImage(image,0,0);
  await writeFile(new URL('rotation-unreadable-sample.pdf',target),imageOnlyPdf(rotated.toBuffer('image/jpeg'),rotated.width,rotated.height));
 }
}
console.log('Quality scan fixtures: 0.8px blur, 0.25° tilt, 10px blur and 90° rotation.');
