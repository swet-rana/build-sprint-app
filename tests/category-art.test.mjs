import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,stat} from 'node:fs/promises';
import {loadImage} from '@napi-rs/canvas';
import {CATEGORY_ART,SMALL_CATEGORY_ART,categoryIllustration} from '../src/category-art.js';
import {imageUrl} from '../src/image-assets.js';
test('all category illustrations retain their originals at small WebP sizes under 100 KB combined',async()=>{
 const dir=new URL('../public/images/categories/',import.meta.url);let bytes=0;
 for(const file of await readdir(dir))bytes+=(await stat(new URL(file,dir))).size;
 assert(bytes<100000,`${bytes} category bytes exceed the budget`);
 for(const [category,name] of Object.entries(CATEGORY_ART)){
  const image=await loadImage(new URL('../public'+imageUrl(`/images/categories/${name}.webp`),import.meta.url));assert(image.width<=120&&image.height<=120);
  const markup=categoryIllustration(category);assert.match(markup,/loading="lazy"/);assert.match(markup,/\.webp/);
  if(SMALL_CATEGORY_ART[category]){const small=await loadImage(new URL('../public'+imageUrl(`/images/categories/${name}-${SMALL_CATEGORY_ART[category]}.webp`),import.meta.url));assert(Math.max(small.width,small.height)<=SMALL_CATEGORY_ART[category]);assert.match(markup,/<source media="\(max-width:760px\)"/);}
 }
 console.log(`CATEGORY ART: ${Object.keys(CATEGORY_ART).length} illustrations; ${bytes} bytes including mobile variants; each at most twice its displayed size.`);
});
