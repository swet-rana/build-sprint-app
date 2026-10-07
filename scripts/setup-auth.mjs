import {generateKeyPair,exportPKCS8,exportJWK} from 'jose';
import {spawnSync} from 'node:child_process';

function convex(args){
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
 convex(['env','set','SITE_URL=http://localhost:5173']);
 convex(['dev','--once']);
 console.log('Account sign-up and sign-in configured. Reload HealthStats.');
}catch(error){console.error(error.message);process.exitCode=1;}
