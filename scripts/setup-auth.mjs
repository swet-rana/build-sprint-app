import {generateKeyPair,exportPKCS8,exportJWK} from 'jose';
import {spawnSync} from 'node:child_process';

const production=process.argv.includes('--prod');
const skipPush=process.argv.includes('--skip-push');
const requestedSite=process.argv.find(arg=>arg.startsWith('--site-url='))?.slice('--site-url='.length);
if(production && (!requestedSite || !/^https:\/\/[a-z0-9-]+\.convex\.site$/.test(requestedSite))) throw Error('Production account setup requires an HTTPS Convex site address.');
if(production && !skipPush) throw Error('Production account setup requires --skip-push; npm run deploy handles publishing.');
const siteUrl=requestedSite || 'http://localhost:5173';
function convex(args){
 if(production)args=[...args,'--prod'];
 const result=spawnSync(process.execPath,['node_modules/convex/bin/main.js',...args],{encoding:'utf8',timeout:20000});
 if(result.status!==0)throw Error('Could not reach your Convex deployment. Run this command from your own Terminal and check that Convex is signed in.');
 return result.stdout.trim();
}
try{
 const privateKey=convex(['env','get','JWT_PRIVATE_KEY']);
 const existingJwks=convex(['env','get','JWKS']);
 if(!privateKey&&!existingJwks){
  const keys=await generateKeyPair('RS256',{extractable:true});
  const privateValue=(await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g,' ');
  const publicValue=JSON.stringify({keys:[{use:'sig',...await exportJWK(keys.publicKey)}]});
  convex(['env','set',`JWT_PRIVATE_KEY=${privateValue}`]);
  convex(['env','set',`JWKS=${publicValue}`]);
 }else if(!privateKey||!existingJwks){
  throw Error('Only one account key is configured. Stop here so an existing key is not overwritten.');
 }
 convex(['env','set',`SITE_URL=${siteUrl}`]);
 if(!skipPush){
  if(production)throw Error('Use --skip-push, then npm run deploy to publish production.');
  convex(['dev','--once']);
 }
 console.log('Account sign-up and sign-in configured. Reload HealthStats.');
}catch(error){console.error(error.message);process.exitCode=1;}
