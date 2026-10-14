// Images and new builds use a 16-character hexadecimal content digest.
// Legacy Vite eight-character hashes are accepted only in /assets and must
// contain a digit or underscore: ordinary hyphenated names are not hashes.
export function isHashedAsset(path){
 const file=path.split('/').at(-1)??'';
 if(/-[a-f0-9]{16}\.[a-z0-9]+$/i.test(file))return true;
 const legacy=path.startsWith('/assets/')?file.match(/-([A-Za-z0-9_-]{8})\.[a-z0-9]+$/i):null;
 return !!legacy&&/[0-9_]/.test(legacy[1]);
}
export function cacheControlFor(path){
 return !path.toLowerCase().endsWith('.html')&&isHashedAsset(path)?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate';
}
