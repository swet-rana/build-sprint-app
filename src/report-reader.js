import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseReport } from './lab-parser.js';
GlobalWorkerOptions.workerSrc=workerUrl;
export async function readLabPdf(blob,onProgress=()=>{}){
 const task=getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false,useSystemFonts:true,disableFontFace:true});
 try{
  const pdf=await task.promise;
  if(pdf.numPages>100)throw Error('This preview reads up to 100 pages per file. Split the PDF into smaller dated lab reports.');
  const pages=[];
  for(let n=1;n<=pdf.numPages;n++){
   onProgress(n,pdf.numPages);
   const page=await pdf.getPage(n);
   pages.push({page:n,items:(await page.getTextContent()).items});
  }
  return parseReport(pages);
 }catch(error){
  if(error.name==='PasswordException')throw Error('This PDF is password-protected. Upload an unlocked copy.');
  if(error.name==='InvalidPDFException')throw Error('This PDF cannot be read. Upload another copy of the original.');
  throw error;
 }finally{await task.destroy?.();}
}
