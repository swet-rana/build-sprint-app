import {decodeLocalImage,encodeScanImage} from './scan-image.js';
export const isHeicPhoto=file=>/^image\/(?:heic|heif)(?:-sequence)?$/i.test(file.type)||/\.(?:heic|heif)$/i.test(file.name??'');
async function decodeHeic(file){
 try{return await decodeLocalImage(file);}catch{}
 const {heicTo}=await import('heic-to/csp');const image=await heicTo({blob:file,type:'bitmap'});return {image,close:()=>image.close()};
}
export async function convertHeicUpload(file,{decode=decodeHeic,makeCanvas}={}){
 if(!isHeicPhoto(file))return file;
 let decoded;
 try{
  decoded=await decode(file);const {image,metadata}=await encodeScanImage(decoded.image,{maxSide:2000,...(makeCanvas?{makeCanvas}:{})});
  const bytes=Uint8Array.from(atob(image.split(',')[1]),c=>c.charCodeAt(0));console.info('HEIC upload converted locally',metadata);
  return new File([bytes],file.name.replace(/\.(?:heic|heif)$/i,'')+'.jpg',{type:'image/jpeg',lastModified:file.lastModified});
 }catch{throw Error('This HEIC photo could not be converted. Try exporting it as JPEG from Photos and upload that copy.');}
 finally{decoded?.close();}
}
