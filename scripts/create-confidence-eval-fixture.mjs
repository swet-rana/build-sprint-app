// Fictional scan; only its patient-name area is blurred. Real OCR must reject it.
import {createCanvas,loadImage,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
import {readFile,writeFile} from 'node:fs/promises';
import {createWorker} from 'tesseract.js';
import {imageOnlyPdf} from './create-ocr-fixtures.mjs';
import {ocrPage} from '../src/ocr-page.js';
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
const image=await loadImage(await readFile('tmp/ocr-fixtures/first.jpg'));
const worker=await createWorker('eng',1,{langPath:new URL('../node_modules/@tesseract.js-data/eng/4.0.0_best_int',import.meta.url).pathname,cacheMethod:'none'});await worker.setParameters({preserve_interword_spaces:'1'});
let saved=false;
try{for(const blur of [2,3,4,5,6]){
 const c=createCanvas(1800,2400),ctx=c.getContext('2d');ctx.drawImage(image,0,0);ctx.save();ctx.beginPath();ctx.rect(310,160,400,65);ctx.clip();ctx.filter=`blur(${blur}px)`;ctx.drawImage(image,0,0);ctx.restore();
 const bytes=imageOnlyPdf(c.toBuffer('image/jpeg')),task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true}),pdf=await task.promise,page=await pdf.getPage(1),v=page.getViewport({scale:3}),rendered=createCanvas(v.width,v.height);await page.render({canvas:rendered,canvasContext:rendered.getContext('2d'),viewport:v}).promise;
 const result=await worker.recognize(rendered.toBuffer('image/png'),{}, {blocks:true});await task.destroy();
 try{ocrPage(result.data,rendered.width,rendered.height,1);}catch(error){if(error.code==='LOW_CONFIDENCE'){await writeFile('tests/fixtures/low-confidence-scan.pdf',bytes);console.log(`Fictional name blur ${blur}px: rejected words ${JSON.stringify(error.diagnostics.lowConfidenceWords)}`);saved=true;break;}}
}if(!saved)throw Error('No genuine low-confidence fixture was found.');}finally{await worker.terminate();}
