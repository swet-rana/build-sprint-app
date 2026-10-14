import test from 'node:test';import assert from 'node:assert/strict';import {createCanvas} from '@napi-rs/canvas';
import {encodeScanImage} from '../src/scan-image.js';
import {convertHeicUpload} from '../src/heic-upload.js';
const makeCanvas=()=>createCanvas(1,1);
test('A noisy 4032 × 3024 phone page becomes an actual JPEG under the unchanged server limit',async()=>{
 const source=createCanvas(4032,3024),ctx=source.getContext('2d'),noise=ctx.createImageData(1008,756);let seed=7;for(let i=0;i<noise.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;noise.data[i]=seed&255;noise.data[i+1]=(seed>>>8)&255;noise.data[i+2]=(seed>>>16)&255;noise.data[i+3]=255;}const tile=createCanvas(1008,756);tile.getContext('2d').putImageData(noise,0,0);ctx.drawImage(tile,0,0,4032,3024);
 const result=await encodeScanImage(source,{makeCanvas});assert(result.image.length<750000);assert(result.metadata.width<=2000&&result.metadata.height<=2000);assert.equal(result.metadata.fileType,'image/jpeg');const bytes=Buffer.from(result.image.split(',')[1],'base64');assert.deepEqual([...bytes.subarray(0,3)],[255,216,255]);assert.equal(result.metadata.byteSize,bytes.length);assert.equal(result.metadata.dataUrlCharacters,result.image.length);
 console.log(`PHONE IMAGE: width=${result.metadata.width}, height=${result.metadata.height}, file type=${result.metadata.fileType}, byte size=${result.metadata.byteSize}, data URL characters=${result.image.length}`);
});
test('Quality ignored by a phone encoder still fits by reducing dimensions; blank and wrong-format encoders fail locally',async()=>{
 const source={width:4032,height:3024};const make=()=>{const c={width:1,height:1,getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:()=>`data:image/jpeg;base64,${'/9j/'.padEnd(Math.ceil(c.width*c.height/2/4)*4,'A')}`};return c;};const result=await encodeScanImage(source,{makeCanvas:make});assert(result.image.length<750000);assert(result.metadata.width<1600);
 for(const image of ['data:,','data:image/png;base64,iVBORw=='])await assert.rejects(encodeScanImage(source,{makeCanvas:()=>({width:1,height:1,getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:()=>image})}),/could not encode/);
});
test('Existing desktop encoding keeps the same dimensions and JPEG bytes when already within the limit',async()=>{
 const c=createCanvas(800,1100);c.getContext('2d').fillRect(0,0,800,1100);const result=await encodeScanImage(c,{makeCanvas});assert.equal(result.metadata.width,800);assert.equal(result.metadata.height,1100);assert.equal(result.image,c.toDataURL('image/jpeg',.85));
});
test('HEIC is decoded locally and converted to a JPEG File before upload; other originals stay untouched',async()=>{
 const input=new File([new Uint8Array([1,2,3])],'fictional-phone.heic',{type:'image/heic',lastModified:123});const output=await convertHeicUpload(input,{decode:async()=>({image:createCanvas(4032,3024),close(){}}),makeCanvas});assert.equal(output.name,'fictional-phone.jpg');assert.equal(output.type,'image/jpeg');assert.equal(output.lastModified,123);assert(output.size<562500);assert.deepEqual([...new Uint8Array(await output.slice(0,3).arrayBuffer())],[255,216,255]);
 const pdf=new File(['%PDF-'],'fictional.pdf',{type:'application/pdf'});assert.equal(await convertHeicUpload(pdf),pdf);
});
