import {guardTestTarget,DEV_CONVEX_URL} from './test-target.js';
export function nodeTestTarget(script,envName,{devOnly=false}={}){
 const args=process.argv.slice(2),inline=args.find(arg=>arg.startsWith('--convex-url=')),position=args.indexOf('--convex-url');
 const supplied=inline?inline.slice('--convex-url='.length):position>=0?args[position+1]:undefined;
 try{
  if((inline||position>=0)&&(!supplied||supplied.startsWith('--')))throw Error(`REFUSED ${script}: --convex-url needs a deployment URL.`);
  return guardTestTarget(supplied??process.env[envName]??process.env.TEST_CONVEX_URL??process.env.VITE_CONVEX_URL??process.env.CONVEX_URL??DEV_CONVEX_URL,{script,devOnly,allowProd:args.includes('--allow-prod')});
 }catch(error){console.error(error.message);process.exit(1);}
}
