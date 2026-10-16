import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {PROD_CONVEX_URL} from './test-target.js';
import {nodeTestTarget} from './test-target-node.mjs';
nodeTestTarget('check-production-refusals.mjs','REFUSAL_AUDIT_CONVEX_URL');
// This audit targets no cloud deployment. Child scripts receive production
// deliberately, with all network access blocked, to verify their refusal.
const scripts=['upload-integration.mjs','evaluation-integration.mjs','vision-integration.mjs','vision-throughput.mjs','unitless-ratio-integration.mjs','name-variants-integration.mjs','test-matching-integration.mjs','report-reading-diagnosis.mjs','scan-image-diagnosis.mjs','reference-layout-audit.mjs','ocr-integration.mjs','semen-ocr-integration.mjs','report-viewer.browser.mjs','vision-reconnect-observe.mjs'];
for(const script of scripts){
 const args=['--import','./tests/refusal-network-blocker.mjs',`tests/${script}`,'--convex-url',PROD_CONVEX_URL];
 const result=spawnSync(process.execPath,args,{encoding:'utf8'}),raw=result.stdout+result.stderr;
 assert.equal(result.status,1,raw);assert(raw.startsWith(`REFUSED ${script}:`),raw);assert(!raw.includes('NETWORK ATTEMPT'),raw);
 console.log(`$ node tests/${script} --convex-url ${PROD_CONVEX_URL}`);process.stdout.write(raw);
}
for(const script of ['phone-browser-check.html','phone-error-frame.html','ocr-cdn-browser.html','vision-reconnect-browser.html','vision-retry-browser.html','vision-report-identity-browser.html','scan-highlight-browser.html','specimen-browser.html','vision-limits-browser.html','page-coverage-browser.html','hits-misses-browser.html']){
 const html=await readFile(new URL(script,import.meta.url),'utf8'),contents=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
 const output=await build({stdin:{contents,resolveDir:new URL('.',import.meta.url).pathname,sourcefile:script},bundle:true,write:false,format:'esm',platform:'browser',define:{'import.meta.env.VITE_CONVEX_URL':JSON.stringify(PROD_CONVEX_URL)},plugins:[{name:'no-app-imports-before-guard',setup(b){b.onResolve({filter:/^\/(?:src|convex)\//},args=>({path:args.path,external:true}));}}]});
 globalThis.window={location:new URL('http://localhost:5173/tests/'+script)};
 try{await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));assert.fail('Browser harness did not refuse production');}
 catch(error){assert(error.message.startsWith(`REFUSED ${script}:`),error.message);console.log(`$ ${script} with VITE_CONVEX_URL=${PROD_CONVEX_URL}`);console.log(error.message);}
 finally{delete globalThis.window;}
}
