import manifest from './image-manifest.json' with {type:'json'};
export const IMAGE_ASSETS=manifest;
export function imageUrl(logical){
 const url=manifest[logical.split('?')[0]];
 if(!url)throw Error('Missing image asset: '+logical);
 return url;
}
