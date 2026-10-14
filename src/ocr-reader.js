import {decodeLocalImage} from './scan-image.js';
import { ocrPage } from './ocr-page.js';
import {scanPageCheck} from './scan-screening.js';
export async function makeOcrReader(onStatus=()=>{}){
 let worker;
 try{
  const {createWorker}=await import('tesseract.js');
  worker=await createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',workerBlobURL:false,logger:({status,progress})=>onStatus(`${status}${Number.isFinite(progress)?` ${Math.round(progress*100)}%`:''}`)});
  await worker.setParameters({preserve_interword_spaces:'1'});
 }catch(error){console.error('Photo reader startup failed:',error);await worker?.terminate();throw Error('The photo reader could not start. Reload and try again. If this continues, its reading files need to be installed.');}
 return {
  async read(canvas,page,{screen=false}={}){
   let timer;
   try{
    const result=await Promise.race([worker.recognize(canvas,{}, {blocks:true}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Image reading timed out. Upload a clearer image or try again.')),120000);})]);
    const screening=screen?scanPageCheck(result.data):null;
    if(screening&&!screening.hasTestContent)return {page,items:[],exclusionReason:screening.reason,screening};
    try{return {...ocrPage(result.data,canvas.width,canvas.height,page),...(screening?{screening}:{})};}catch(error){if(screening)error.screening=screening;throw error;}
   }finally{clearTimeout(timer);}
  },close:()=>worker.terminate(),
 };
}
export async function imageCanvas(blob){
 let bitmap;
 try{bitmap=await decodeLocalImage(blob);}catch{throw Error('This photo could not be opened. Upload a valid JPG, PNG or WebP image.');}
 try{
  const source=bitmap.image,width=source.width??source.naturalWidth,height=source.height??source.naturalHeight;
  if(width*height>40000000)throw Error('This image is too large to read. Upload a smaller full-page photo.');
  const scale=Math.min(2,2400/Math.max(width,height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0,canvas.width,canvas.height);return canvas;
 }finally{bitmap.close();}
}
