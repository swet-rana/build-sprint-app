import { cp, mkdir, readdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve('public/ocr');
try{
 await access('node_modules/tesseract.js/dist/tesseract.esm.min.js');
 await mkdir(root,{recursive:true});
 await cp('node_modules/tesseract.js/dist/tesseract.esm.min.js',`${root}/tesseract.esm.min.js`);
 await cp('node_modules/tesseract.js/dist/worker.min.js',`${root}/worker.min.js`);
 await mkdir(`${root}/core`,{recursive:true});
 for(const file of await readdir('node_modules/tesseract.js-core'))if(/\.wasm(?:\.js)?$/.test(file))await cp(`node_modules/tesseract.js-core/${file}`,`${root}/core/${file}`);
 await mkdir(`${root}/lang`,{recursive:true});
 await cp('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',`${root}/lang/eng.traineddata.gz`);
 console.log('Local photo-reading assets prepared.');
}catch(error){console.error('Photo reader setup needs npm install tesseract.js@6.0.1 @tesseract.js-data/eng@1.0.0, then node scripts/prepare-ocr.mjs.');process.exitCode=1;}
