import {parseReport,rowsFromItems} from './lab-parser.js';
import {scanPageCheck} from './scan-screening.js';
export function textPageNeedsVision(page){
 try{return {eligible:parseReport([page]).markers.length===0,reason:'Native result table already parsed.'};}
 catch(error){if(!error.message.startsWith('No supported dated'))throw error;}
 const check=scanPageCheck({text:rowsFromItems(page.items).map(r=>r.text).join('\n')});
 return {eligible:check.hasTestContent,reason:check.hasTestContent?'Native text yielded no accepted values but contains lab units or reference ranges.':check.reason};
}
