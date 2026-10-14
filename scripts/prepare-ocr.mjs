// Local Node test data only. Browser OCR engine files load from the pinned CDN.
import {cp,mkdir} from 'node:fs/promises';
const root=new URL('../tmp/ocr-assets/lang/',import.meta.url);
await mkdir(root,{recursive:true});
await cp('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',new URL('eng.traineddata.gz',root));
console.log('Local OCR test data prepared outside the public build.');
