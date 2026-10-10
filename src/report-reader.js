import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { parseReport } from './lab-parser.js';
GlobalWorkerOptions.workerSrc=workerUrl;
export async function reportPreview(blob) {
 const task=getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false,useSystemFonts:true,disableFontFace:true});
 try {
  const pdf=await task.promise,page=await pdf.getPage(1);
  const natural=page.getViewport({scale:1}),viewport=page.getViewport({scale:180/natural.width});
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await page.render({canvas,canvasContext:canvas.getContext('2d'),viewport}).promise;
  return canvas.toDataURL('image/png');
 } finally {await task.destroy?.();}
}
export async function readLabReport(blob,onProgress=()=>{},contentType=blob.type){
 if(contentType==='application/pdf')return readLabPdf(blob,onProgress);
 if(!['image/jpeg','image/png','image/webp'].includes(contentType))throw Error('This report format cannot be read. Use PDF, JPG, PNG or WebP.');
 const {makeOcrReader,imageCanvas}=await import('./ocr-reader.js');
 const reader=await makeOcrReader(status=>onProgress(1,1,status));
 try{
  const page=await reader.read(await imageCanvas(blob),1);
  const result=parseReport([page]);result.warnings.push('Photo text was read automatically. Check every value against the original image.');return result;
 }finally{await reader.close();}
}
export async function readLabPdf(blob,onProgress=()=>{}){
 const task=getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false,useSystemFonts:true,disableFontFace:true});
 let reader;
 try{
  const pdf=await task.promise;
  if(pdf.numPages>100)throw Error('This preview reads up to 100 pages per file. Split the PDF into smaller dated lab reports.');
  const pages=[],scanned=[],unreadablePages=[];
  for(let n=1;n<=pdf.numPages;n++){
   onProgress(n,pdf.numPages);
   const page=await pdf.getPage(n),items=(await page.getTextContent()).items;
   if(items.map(i=>i.str).join('').trim().length<30)scanned.push(n);
   pages.push({page:n,items});
  }
  if(!scanned.length)return parseReport(pages);
  const {makeOcrReader}=await import('./ocr-reader.js');
  reader=await makeOcrReader(status=>onProgress(scanned[0],pdf.numPages,status));
  for(const n of scanned){
   onProgress(n,pdf.numPages,'Reading scanned page');
   const page=await pdf.getPage(n),natural=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(3,2400/Math.max(natural.width,natural.height))});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await page.render({canvas,canvasContext:canvas.getContext('2d'),viewport}).promise;
   try{pages[n-1]=await reader.read(canvas,n);}catch(error){if(['NO_TEXT','NO_TABLE'].includes(error.code)){pages[n-1]={page:n,items:[]};unreadablePages.push(n);}else throw Error(`Page ${n}: ${error.message}`);}
   canvas.width=canvas.height=0;
  }
  const result=parseReport(pages);if(unreadablePages.length)result.warnings.push(`Reading error on scanned pages ${unreadablePages.join(', ')}: no supported blood table could be read; these pages are excluded. Check the originals for omitted tests.`);result.warnings.push('Scanned pages were read automatically. Check every value against the original PDF.');return result;
 }catch(error){
  if(error.name==='PasswordException')throw Error('This PDF is password-protected. Upload an unlocked copy.');
  if(error.name==='InvalidPDFException')throw Error('This PDF cannot be read. Upload another copy of the original.');
  throw error;
 }finally{await reader?.close();await task.destroy?.();}
}
