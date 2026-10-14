import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {transform} from 'esbuild';
import {IMAGE_ASSETS,imageUrl} from '../src/image-assets.js';
import {isHashedAsset,cacheControlFor} from '../shared/static-cache.js';
test('every public image has a real content hash and the original image bytes are retained',async()=>{
 const files=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const file=new URL(e.name+(e.isDirectory()?'/':''),dir);if(e.isDirectory())await walk(file);else files.push(file);}}
 await walk(new URL('../public/images/',import.meta.url));assert.equal(files.length,Object.keys(IMAGE_ASSETS).length);
 for(const [logical,hashed]of Object.entries(IMAGE_ASSETS)){
  const bytes=await readFile(new URL('../public'+hashed,import.meta.url)),hash=createHash('sha256').update(bytes).digest('hex').slice(0,16);
  assert(hashed.includes('-'+hash+'.'),`${hashed} does not identify its contents`);
  assert(isHashedAsset(hashed));assert.equal(imageUrl(logical),hashed);
  assert.equal(cacheControlFor(hashed),'public, max-age=31536000, immutable');
 }
 console.log(`HASHED IMAGES: ${files.length} files; every filename verified against its SHA-256 content digest.`);
});
test('ordinary hyphenated names are revalidated and generated content names receive long caching',()=>{
 for(const name of ['/images/home-glass-ribbons.png','/images/healthstats-logo-animated.gif','/fonts/inter-latin-variable.woff2','/images/home-old-icon.png']){assert.equal(isHashedAsset(name),false);assert.equal(cacheControlFor(name),'public, max-age=0, must-revalidate');}
 assert(isHashedAsset('/assets/index-Bb2_ZCKq.js'));assert(isHashedAsset('/assets/pdf-q-5ow4VI.js'));
 assert.equal(cacheControlFor('/index-0123456789abcdef.html'),'public, max-age=0, must-revalidate');
 const url=bytes=>'/images/icon-'+createHash('sha256').update(bytes).digest('hex').slice(0,16)+'.webp';
 assert.notEqual(url('first image'),url('changed image'));assert.equal(url('first image'),url('first image'));
});
test('installed hosting source and built client both use the strict cache rule',async()=>{
 for(const name of ['src/component/serving.ts','dist/component/serving.js']){
  const source=await readFile(new URL('../node_modules/@convex-dev/static-hosting/'+name,import.meta.url),'utf8');
  const {code}=await transform(source,{loader:name.endsWith('.ts')?'ts':'js',format:'esm'});
  const actual=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  for(const path of ['/images/home-glass-ribbons.png','/images/icon-0123456789abcdef.webp','/assets/index-Bb2_ZCKq.js'])assert.equal(actual.cacheControlFor(path),cacheControlFor(path));
 }
});
