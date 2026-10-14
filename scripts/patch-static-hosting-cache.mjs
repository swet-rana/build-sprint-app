// Apply the same strict rule to both the component source and its built client.
// Kept in the repo and run after installation so this is not a one-off edit.
import {readFile,writeFile} from 'node:fs/promises';
import {isHashedAsset} from '../shared/static-cache.js';
const source=isHashedAsset.toString();
for(const relative of ['src/component/serving.ts','dist/component/serving.js']){
 const file=new URL('../node_modules/@convex-dev/static-hosting/'+relative,import.meta.url);
 const current=await readFile(file,'utf8');
 const replacement='export '+(relative.endsWith('.ts')?source.replace('isHashedAsset(path)','isHashedAsset(path: string): boolean'):source);
 const pattern=/export function isHashedAsset\([^)]*\)[^{]*\{[\s\S]*?\n\}/;
 if(!pattern.test(current))throw Error('Static-hosting hash detector changed; review the cache patch before building.');
 const next=current.replace(pattern,()=>replacement);if(next!==current)await writeFile(file,next);
}
console.log('Static-hosting hash detector: strict content hashes applied.');
