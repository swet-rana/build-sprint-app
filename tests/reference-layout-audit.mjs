import {nodeTestTarget} from './test-target-node.mjs';
nodeTestTarget('reference-layout-audit.mjs','LAYOUT_AUDIT_CONVEX_URL'); // Local-only work; validate any explicitly supplied cloud target first.
// Optional local audit. Personal PDFs/results stay local; stdout contains counts only.
import {readFile,readdir} from 'node:fs/promises';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
import 'tesseract.js';
import {compareReportSeries} from '../src/lab-parser.js';
Object.assign(globalThis,{DOMMatrix,ImageData,Path2D,document:{createElement(name){if(name!=='canvas')throw Error('Unexpected element');const canvas=createCanvas(1,1);canvas[Symbol.iterator]=function*(){yield*canvas.toBuffer('image/png');};return canvas;}}});
const bundle=await build({entryPoints:['src/report-reader.js'],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'native-local-reader',setup(b){
 b.onResolve({filter:/^tesseract\.js$/},()=>({path:'native-worker',namespace:'native-worker'}));
 b.onLoad({filter:/.*/,namespace:'native-worker'},()=>({contents:`import {createWorker as real} from ${JSON.stringify(import.meta.resolve('tesseract.js'))};export function createWorker(l,o,options){const fixed={...options,langPath:${JSON.stringify(new URL('../node_modules/@tesseract.js-data/eng/4.0.0_best_int',import.meta.url).pathname)},cacheMethod:'none'};delete fixed.workerPath;delete fixed.corePath;return real(l,o,fixed);}`}));
 b.onResolve({filter:/^file:/},args=>({path:args.path,external:true}));
 b.onResolve({filter:/pdfjs-dist\/.*\?url$/},args=>({path:args.path,namespace:'worker-url'}));
 b.onLoad({filter:/.*/,namespace:'worker-url'},args=>({contents:`export default ${JSON.stringify(import.meta.resolve(args.path.replace('?url','')))}`}));
 b.onResolve({filter:/^pdfjs-dist\//},args=>({path:import.meta.resolve(args.path),external:true}));
}}]});
const {readLabReport}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const directory=process.argv[2]??'references';
const results=[];
for(const name of (await readdir(directory)).filter(n=>n.endsWith('.pdf')&&!n.includes('Sample_Fertility')).sort()){
 try{
  const report=await readLabReport(new Blob([await readFile(`${directory}/${name}`)],{type:'application/pdf'}));
  for(const marker of report.markers){
   assert(Number.isFinite(marker.value),'Result must be numeric');
   assert(report.usedPages.includes(marker.page),'Source page must belong to a used result page');
   assert(Number.isFinite(marker.sourceTop)&&marker.sourceTop>=0&&marker.sourceTop<=1,'Source row must have a valid page position');
  }
  results.push({name,report});
  console.log(JSON.stringify({file:name,status:'read',markers:report.markers.length,resultPages:report.usedPages,excludedPages:report.excludedPages,warnings:report.warnings.length}));
 }catch(error){if(error instanceof assert.AssertionError)throw error;console.log(JSON.stringify({file:name,status:'rejected',reason:error.message.includes('No supported dated')?'Unsupported dated table layout':'Reading failed (inspect locally)'}));}
}
try{const comparison=compareReportSeries(results.map(({name,report})=>({...report,id:name})));console.log(JSON.stringify({comparison:'completed',reports:comparison.reports.length,matchingTests:comparison.comparable.length}));}catch{console.log(JSON.stringify({comparison:'rejected',reason:'Reports do not meet existing patient/date/test comparison rules'}));}
