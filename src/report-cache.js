// Keep private originals and successful readings in this browser, scoped to
// the Convex deployment and the existing browser-local report access key.
// Bump this whenever extraction or acceptance rules change, so old readings
// cannot bypass a corrected reader. Original bytes have a separate identity.
export const READING_CACHE_VERSION='pdf6.4.299-ocr6-healthstats-reader-v1';
const fingerprint=report=>JSON.stringify([report.id,report.contentHash??null,report.name,report.size,report.contentType,report.uploadedAt??null]);
export function memoryReportStore(){
 const records=new Map();
 return {get:async key=>records.get(key),put:async record=>{records.set(record.key,record);},remove:async key=>{records.delete(key);},list:async()=>[...records.values()]};
}
export function browserReportStore(){
 if(typeof indexedDB==='undefined')return memoryReportStore();
 let opening;
 function database(){return opening??=new Promise((resolve,reject)=>{
  const request=indexedDB.open('healthstats-report-cache',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('reports',{keyPath:'key'});
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(Error('Report cache is unavailable.'));
 });}
 async function run(mode,operation){
  const db=await database();
  return new Promise((resolve,reject)=>{
   const transaction=db.transaction('reports',mode),request=operation(transaction.objectStore('reports'));let value;
   request.onsuccess=()=>{value=request.result;};
   transaction.oncomplete=()=>resolve(value);
   transaction.onerror=()=>reject(transaction.error);
   transaction.onabort=()=>reject(transaction.error);
  });
 }
 return {get:key=>run('readonly',store=>store.get(key)),put:record=>run('readwrite',store=>store.put(record)),remove:key=>run('readwrite',store=>store.delete(key)),list:()=>run('readonly',store=>store.getAll())};
}
export function createReportCache({scope,store=browserReportStore(),download}){
 const originals=new Map(),readings=new Map(),identities=new Map(),generations=new Map();let storageWarning=false;
 const key=(report,kind)=>JSON.stringify([scope,report.id,kind]);
 const generation=id=>generations.get(id)??0;
 async function storage(operation,fallback){try{return await operation();}catch{if(!storageWarning){storageWarning=true;console.warn('Report cache could not be saved; this tab will still reuse its files.');}return fallback;}}
 function identify(report){
  const identity=fingerprint(report),previous=identities.get(report.id);
  if(previous&&previous!==identity)invalidate(report.id);
  identities.set(report.id,identity);return identity;
 }
 function invalidate(id){originals.delete(id);readings.delete(id);identities.delete(id);generations.set(id,generation(id)+1);}
 async function cached(report,kind,load){
  const identity=identify(report),memory=kind==='original'?originals:readings;
  if(memory.has(report.id))return memory.get(report.id);
  const stamp=generation(report.id),recordKey=key(report,kind),version=kind==='reading'?READING_CACHE_VERSION:null;
  const pending=(async()=>{
   const saved=await storage(()=>store.get(recordKey));
   if(saved?.identity===identity&&saved.version===version)return saved.value;
   const value=await load();
   // A partly read scan must still retry its failed pages through the existing
   // reader. Reuse its original bytes, but do not freeze a partial failure.
   if(kind==='reading'&&value.warnings?.some(warning=>warning.startsWith('Reading error'))){
    if(memory.get(report.id)===pending)memory.delete(report.id);
    return value;
   }
   if(generation(report.id)===stamp&&identities.get(report.id)===identity){
    await storage(()=>store.put({key:recordKey,scope,reportId:report.id,identity,version,value}));
    // Deletion may have happened while the browser was saving the entry.
    if(generation(report.id)!==stamp)await storage(()=>store.remove(recordKey));
   }
   return value;
  })();
  memory.set(report.id,pending);
  try{return await pending;}catch(error){if(memory.get(report.id)===pending)memory.delete(report.id);throw error;}
 }
 return {
  // Inspect existing browser data without downloading or starting a reading.
  async peek(report,kind='original'){
   const identity=identify(report),memory=kind==='original'?originals:readings;
   if(memory.has(report.id))try{return await memory.get(report.id);}catch{return null;}
   const saved=await storage(()=>store.get(key(report,kind)));
   return saved?.identity===identity&&saved.version===(kind==='reading'?READING_CACHE_VERSION:null)?saved.value:null;
  },
  original:report=>cached(report,'original',()=>download(report)),
  reading:async(report,read)=>structuredClone(await cached(report,'reading',read)),
  async remember(report,blob){
   const identity=identify(report);originals.set(report.id,Promise.resolve(blob));
   await storage(()=>store.put({key:key(report,'original'),scope,reportId:report.id,identity,version:null,value:blob}));
  },
  // Call only after the complete saved-report list has arrived, never for a
  // search result or a partly loaded pagination page.
  async sync(reports){
   const live=new Map(reports.map(report=>[report.id,fingerprint(report)]));
   for(const [id,identity] of identities)if(live.get(id)!==identity)invalidate(id);
   for(const record of await storage(()=>store.list(),[]))if(record.scope===scope&&live.get(record.reportId)!==record.identity)await storage(()=>store.remove(record.key));
  },
 };
}
const instances=new Map();
export function reportCache(site,sessionKey){
 const scope=JSON.stringify([site,sessionKey]);
 if(!instances.has(scope))instances.set(scope,createReportCache({scope,download:async report=>{
  const response=await fetch(`${site}/reports/open`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionKey,reportId:report.id}),signal:AbortSignal.timeout(60000)});
  if(!response.ok){const result=await response.json();throw Error(result.error||'Could not open this report. Try again.');}
  return response.blob();
 }}));
 return instances.get(scope);
}
