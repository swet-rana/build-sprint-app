import {visionPageQueue} from './vision-page-queue.js';
import {identityFromItems,resolveReportIdentity} from './report-identity.js';
import {textPageNeedsVision} from './text-page-fallback.js';
import {classifyScanPage} from './blood-page-classification.js';
import './pdf-stream-compat.js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { parseReport } from './lab-parser.js';
import {mergeScanResults} from './scan-results.js';
GlobalWorkerOptions.workerSrc=workerUrl;
const coverageFor=total=>({total,checked:0,read:0,vision:0,ocr:0,skipped:[]});
function skipPage(coverage,page,reason){if(!coverage.skipped.some(s=>s.page===page))coverage.skipped.push({page,reason});}
function finishCoverage(coverage,result,scanned,visionPages){
 const used=new Set(result.usedPages),vision=new Set(visionPages.map(p=>p.page));
 coverage.read=scanned.filter(n=>used.has(n)).length;
 coverage.vision=scanned.filter(n=>used.has(n)&&vision.has(n)).length;coverage.ocr=coverage.read-coverage.vision;
 for(const n of scanned)if(!used.has(n))skipPage(coverage,n,'No supported, dated test result table was included from this scanned page.');
 for(const page of coverage.textPages??[])if(page.tests===null)page.tests=result.markers.filter(marker=>marker.page===page.page).length;
 result.scanCoverage=coverage;
}

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
export async function readLabReport(blob,onProgress=()=>{},contentType=blob.type,options={}){
 if(contentType==='application/pdf')return readLabPdf(blob,onProgress,options);
 if(!['image/jpeg','image/png','image/webp'].includes(contentType))throw Error('This report format cannot be read. Use PDF, JPG, PNG or WebP.');
 const {makeOcrReader,imageCanvas}=await import('./ocr-reader.js');
 const reader=await makeOcrReader(status=>onProgress(1,1,status)),coverage=coverageFor(1);
 try{
  const canvas=await imageCanvas(blob);
  try{
   const page=await reader.read(canvas,1,{screen:!!options.vision});coverage.checked++;
   if(page.exclusionReason)skipPage(coverage,1,page.exclusionReason);
   const result=parseReport([page]);finishCoverage(coverage,result,[1],[]);result.readingPaths=['scan (OCR)'];result.warnings.push('Photo text was read automatically. Check every value against the original image.');return result;
  }catch(error){
   if(!options.vision||!error.screening?.hasTestContent){error.pageCoverage=coverage;throw error;}
   coverage.checked++;if(error.diagnostics)coverage.ocrDiagnostics=error.diagnostics;
   onProgress(1,1,'Scan path · AI vision');
   const scan=classifyScanPage(await options.vision(canvas,1,error.diagnostics));
   if(scan.reportKind==='other')skipPage(coverage,1,'AI vision found no supported blood or semen result table.');
   const result=mergeScanResults([{page:1,result:scan}],null,1);finishCoverage(coverage,result,[1],[{page:1}]);result.ocrDiagnostics=error.diagnostics?[error.diagnostics]:[];return result;
  }finally{canvas.width=canvas.height=0;}
 }catch(error){error.pageCoverage=coverage;throw error;}finally{await reader.close();}
}
export async function readLabPdf(blob,onProgress=()=>{},options={}){
 const task=getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false,useSystemFonts:true,disableFontFace:true});
 let reader,coverage;const visionQueue=visionPageQueue();
 try{
  const pdf=await task.promise;
  if(pdf.numPages>100)throw Error('This preview reads up to 100 pages per file. Split the PDF into smaller dated lab reports.');
  const reportIdentities=[],pages=[],textPages=[],scanned=[],nativeFallback=[],unreadablePages=[],visionPages=[],ocrDiagnostics=[];
  for(let n=1;n<=pdf.numPages;n++){
   onProgress(n,pdf.numPages,'Text path · PDF text');
   const page=await pdf.getPage(n),viewport=page.getViewport({scale:1});
   const items=(await page.getTextContent()).items.map(item=>({...item,sourceTop:viewport.convertToViewportPoint(item.transform[4],item.transform[5])[1]/viewport.height}));
   if(items.map(i=>i.str).join('').trim().length<30)scanned.push(n);
   pages.push({page:n,items});reportIdentities.push(identityFromItems({page:n,items}));
   if(!scanned.includes(n)){
    const outcome=options.vision?textPageNeedsVision(pages[n-1]):null;
    if(outcome?.eligible)nativeFallback.push(n);else textPages.push({page:n,tests:outcome?.testsFound??null});
   }
  }
  const attempts=[...scanned,...nativeFallback].sort((a,b)=>a-b);
  if(!attempts.length)return parseReport(pages);
  coverage={...coverageFor(attempts.length),pdfTotal:pdf.numPages,textPages};
  const {makeOcrReader}=await import('./ocr-reader.js');
  reader=await makeOcrReader(status=>onProgress(attempts[0],pdf.numPages,status));
  async function queueVision(canvas,n,diagnostics){
   await visionQueue.add(async()=>{
    try{
     const result=classifyScanPage(await options.vision(canvas,n,diagnostics));visionPages.push({page:n,result});pages[n-1]={page:n,items:[]};
     if(result.reportKind==='other')skipPage(coverage,n,'AI vision found no supported blood or semen result table.');
    }finally{canvas.width=canvas.height=0;}
   });
  }
  for(const n of attempts){
   visionQueue.check();
   onProgress(n,pdf.numPages,nativeFallback.includes(n)?'Text fallback · local OCR screening':'Scan path · OCR');
   const page=await pdf.getPage(n),natural=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(3,2400/Math.max(natural.width,natural.height))});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await page.render({canvas,canvasContext:canvas.getContext('2d'),viewport}).promise;
   let queued=false;
   try{
    const ocr=await reader.read(canvas,n,{screen:!!options.vision});coverage.checked++;if(ocr.reportIdentity)reportIdentities.push(ocr.reportIdentity);
    if(ocr.exclusionReason){pages[n-1]=ocr;skipPage(coverage,n,ocr.exclusionReason);}
    else if(nativeFallback.includes(n)){
     onProgress(n,pdf.numPages,'Text fallback · AI vision');
     await queueVision(canvas,n);queued=true;
    }else pages[n-1]=ocr;
   }catch(error){
    if(error===visionQueue.error)throw error;
    if(error.reportIdentity)reportIdentities.push(error.reportIdentity);
    if(error.screening)coverage.checked++;
    if(options.vision&&error.screening?.hasTestContent){
     if(error.diagnostics)ocrDiagnostics.push(error.diagnostics);
     onProgress(n,pdf.numPages,nativeFallback.includes(n)?'Text fallback · AI vision':'Scan path · AI vision');
     await queueVision(canvas,n,error.diagnostics);queued=true;
    }else if(['NO_TEXT','NO_TABLE'].includes(error.code)){pages[n-1]={page:n,items:[]};unreadablePages.push(n);skipPage(coverage,n,error.message);}
    else{const failure=Error(`Page ${n}: ${error.message}`);if(error.diagnostics)failure.diagnostics=error.diagnostics;throw failure;}
   }finally{if(!queued)canvas.width=canvas.height=0;}

  }
  await visionQueue.finish();
  visionPages.sort((a,b)=>a.page-b.page);coverage.skipped.sort((a,b)=>a.page-b.page);
  let native,identityForPages,reportIdentity;
  if(scanned.length){reportIdentity=resolveReportIdentity([...reportIdentities,...visionPages.map(({page,result})=>({page,patientName:result.patientName,reportDate:result.reportDate}))]);identityForPages=new Map(scanned.map(n=>[n,reportIdentity]));}
  try{native=parseReport(pages,{identityForPages});}catch(error){if(!visionPages.length||!error.message.startsWith('No supported dated'))throw error;}
  if(native&&reportIdentity){native.identitySources=reportIdentity.identitySources;native.warnings.push(...reportIdentity.warnings);}
  if(native)native.readingPaths=[...(scanned.length<pages.length?['text']:[]),...(scanned.length>visionPages.length?['scan (OCR)']:[])];
  const result=visionPages.length?mergeScanResults(visionPages,native,pdf.numPages,reportIdentities):native;
  finishCoverage(coverage,result,attempts,visionPages);
  if(visionPages.some(p=>nativeFallback.includes(p.page))){
   result.readingPaths=(result.readingPaths??[]).filter(path=>path!=='scan (AI vision)'||visionPages.some(p=>scanned.includes(p.page)));
   result.readingPaths.push('text fallback (AI vision)');
  }
  if(ocrDiagnostics.length)result.ocrDiagnostics=ocrDiagnostics;
  if(unreadablePages.length)result.warnings.push(`Reading error on scanned pages ${unreadablePages.join(', ')}: no supported blood table could be read; these pages are excluded. Check the originals for omitted tests.`);result.warnings.push('Scanned pages were read automatically. Check every value against the original PDF.');return result;
 }catch(error){
  if(coverage)error.pageCoverage=coverage;
  if(error.name==='PasswordException')throw Error('This PDF is password-protected. Upload an unlocked copy.');
  if(error.name==='InvalidPDFException')throw Error('This PDF cannot be read. Upload another copy of the original.');
  throw error;
 }finally{await visionQueue.settle();await reader?.close();await task.destroy?.();}
}

// Older successful/error records have scan counts but no text-page notes.
// Inspect only the cached PDF's existing text layer for this explanation.
// This never calls OCR/vision, changes results, or updates the reading cache.
export async function explainPdfTextPages(blob){
 const task=getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false,useSystemFonts:true,disableFontFace:true});
 try{
  const pdf=await task.promise,textPages=[];
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),items=(await page.getTextContent()).items;
   if(items.map(item=>item.str).join('').trim().length<30)continue;
   const outcome=textPageNeedsVision({page:n,items});
   if(!outcome.eligible)textPages.push({page:n,tests:outcome.testsFound});
  }
  return textPages;
 }finally{await task.destroy?.();}
}
