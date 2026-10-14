// These are resized copies of the original illustrations, not regenerated art.
import {mkdir,writeFile} from 'node:fs/promises';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {CATEGORY_ART,SMALL_CATEGORY_ART} from '../src/category-art.js';
const output=new URL('../public/images/categories/',import.meta.url);
await mkdir(output,{recursive:true});let total=0;
for(const [category,name] of Object.entries(CATEGORY_ART)){
 const original=await loadImage(new URL(`../design/category-icon-sources/${name}.png`,import.meta.url));
 for(const size of [112,...(SMALL_CATEGORY_ART[category]?[SMALL_CATEGORY_ART[category]]:[])]){
  const scale=size/Math.max(original.width,original.height);
  const canvas=createCanvas(Math.round(original.width*scale),Math.round(original.height*scale));
  const context=canvas.getContext('2d');context.imageSmoothingQuality='high';
  context.drawImage(original,0,0,canvas.width,canvas.height);
  const bytes=canvas.toBuffer('image/webp',75),file=`${name}${size===112?'':`-${size}`}.webp`;
  await writeFile(new URL(file,output),bytes);total+=bytes.length;
  console.log(`${file} | ${canvas.width} × ${canvas.height} | ${bytes.length} bytes`);
 }
}
console.log(`All category WebP files, including mobile variants: ${total} bytes`);
if(total>=100000)throw Error('Category illustrations exceed the 100 KB budget.');
