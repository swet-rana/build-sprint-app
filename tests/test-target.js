export const DEV_CONVEX_URL='https://elegant-schnauzer-503.convex.cloud';
export const PROD_CONVEX_URL='https://zealous-kiwi-423.convex.cloud';
export function guardTestTarget(input=DEV_CONVEX_URL,{script='test',allowProd=false,devOnly=false}={}){
 const url=new URL(input),host=url.hostname;
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!['http:','https:'].includes(url.protocol))throw Error(`REFUSED ${script}: invalid test deployment URL.`);
 if(['localhost','127.0.0.1','[::1]'].includes(host))return url.origin;
 const dev=host==='elegant-schnauzer-503.convex.cloud'||host==='elegant-schnauzer-503.convex.site';
 const prod=host==='zealous-kiwi-423.convex.cloud'||host==='zealous-kiwi-423.convex.site';
 if(url.protocol!=='https:'||(!dev&&!prod))throw Error(`REFUSED ${script}: ${url.origin} is not this project's approved development or production deployment.`);
 if(prod&&devOnly)throw Error(`REFUSED ${script}: ${url.origin}; this viewer check uses fictional development reports only.`);
 if(prod&&!allowProd)throw Error(`REFUSED ${script}: ${url.origin} is production. Pass --allow-prod explicitly to run against production.`);
 return url.origin.replace('.convex.site','.convex.cloud');
}
