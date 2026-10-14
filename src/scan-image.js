// The server limit counts the complete base64 data URL, not just decoded bytes.
export const SCAN_IMAGE_MAX_CHARACTERS=750000;
export const SCAN_IMAGE_MAX_SIDE=2000;
export function scanImageMetadata(image,width,height){
 const payload=image.split(',')[1]??'',padding=payload.endsWith('==')?2:payload.endsWith('=')?1:0;
 return {width,height,fileType:image.match(/^data:([^;,]+)/)?.[1]??'invalid',byteSize:Math.max(0,Math.floor(payload.length*3/4)-padding),dataUrlCharacters:image.length};
}
export async function encodeScanImage(source,{makeCanvas=()=>document.createElement('canvas'),maxSide=1600}={}){
 const sourceWidth=source.width??source.naturalWidth,sourceHeight=source.height??source.naturalHeight;
 if(!Number.isFinite(sourceWidth)||!Number.isFinite(sourceHeight)||sourceWidth<1||sourceHeight<1)throw Error('The browser could not encode this page as a JPEG. Reload and try again.');
 let longest=Math.min(SCAN_IMAGE_MAX_SIDE,maxSide,Math.max(sourceWidth,sourceHeight));const canvas=makeCanvas();
 try{
  for(let attempt=0;attempt<10;attempt++){
   const scale=Math.min(1,longest/Math.max(sourceWidth,sourceHeight));canvas.width=Math.max(1,Math.round(sourceWidth*scale));canvas.height=Math.max(1,Math.round(sourceHeight*scale));
   const context=canvas.getContext('2d');if(!context)throw Error('The browser could not encode this page as a JPEG. Reload and try again.');context.drawImage(source,0,0,canvas.width,canvas.height);
   for(const quality of [.85,.65,.5,.35,.2]){
    let image;try{image=canvas.toDataURL('image/jpeg',quality);}catch{break;}
    if(/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]+$/.test(image)&&image.length<SCAN_IMAGE_MAX_CHARACTERS){const metadata=scanImageMetadata(image,canvas.width,canvas.height);return {image,metadata:{...metadata,sourceWidth,sourceHeight}};}
   }
   longest=Math.max(1,Math.floor(longest*.75));
  }
  throw Error('The browser could not encode this page as a JPEG. Reload and try again.');
 }finally{canvas.width=canvas.height=0;}
}
export async function decodeLocalImage(blob){
 if(typeof createImageBitmap==='function'){try{const image=await createImageBitmap(blob);return {image,close:()=>image.close()};}catch{}}
 const url=URL.createObjectURL(blob),image=new Image();
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Photo cannot be decoded by this browser.'));image.src=url;});return {image,close:()=>{image.src='';URL.revokeObjectURL(url);}};}
 catch(error){URL.revokeObjectURL(url);throw error;}
}
