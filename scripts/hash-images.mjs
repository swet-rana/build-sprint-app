import {readdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=new URL('../',import.meta.url).pathname,folder=path.join(root,'public/images'),manifestFile=path.join(root,'src/image-manifest.json');
let previous={};try{previous=JSON.parse(await readFile(manifestFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const reverse=new Map(Object.entries(previous).map(([logical,hashed])=>[hashed,logical])),groups=new Map();
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const absolute=path.join(dir,entry.name);if(entry.isDirectory()){await walk(absolute);continue;}if(!/\.(?:png|jpe?g|gif|webp|svg|avif|ico)$/i.test(entry.name))continue;
 const physical='/images/'+path.relative(folder,absolute).split(path.sep).join('/'),logical=reverse.get(physical)??physical.replace(/-[a-f0-9]{16}(?=\.[^.]+$)/i,'');
 if(!groups.has(logical))groups.set(logical,[]);groups.get(logical).push(physical);
}}
await walk(folder);const manifest={};
for(const [logical,candidates]of [...groups].sort(([a],[b])=>a.localeCompare(b))){
 const selected=candidates.find(p=>p===logical)??candidates.find(p=>p===previous[logical])??candidates[0];
 const bytes=await readFile(path.join(root,'public',selected)),hash=createHash('sha256').update(bytes).digest('hex').slice(0,16),ext=path.extname(logical);
 const target=logical.slice(0,-ext.length)+'-'+hash+ext;
 if(selected!==target){try{const existing=await readFile(path.join(root,'public',target));if(!existing.equals(bytes))throw Error('Image hash collision: '+target);}catch(error){if(error.code==='ENOENT')await rename(path.join(root,'public',selected),path.join(root,'public',target));else throw error;}}
 for(const old of candidates)if(old!==target)await unlink(path.join(root,'public',old)).catch(error=>{if(error.code!=='ENOENT')throw error;});
 manifest[logical]=target;
}
const json=JSON.stringify(manifest,null,2)+'\n';if(JSON.stringify(previous,null,2)+'\n'!==json)await writeFile(manifestFile,json);
// CSS uses literal URLs. Update those from either their original names or the
// preceding content hash; JS/JSX resolves logical names through imageUrl().
for(const entry of await readdir(path.join(root,'src'))){if(!entry.endsWith('.css'))continue;const file=path.join(root,'src',entry),before=await readFile(file,'utf8');const after=before.replace(/\/images\/[^'"\s)]+/g,url=>{
 const bare=url.split('?')[0],logical=reverse.get(bare)??bare;if(!manifest[logical])throw Error('Missing CSS image: '+url);return manifest[logical];
});if(after!==before)await writeFile(file,after);}
console.log('Content-hashed public images: '+Object.keys(manifest).length+'; bytes preserved.');
