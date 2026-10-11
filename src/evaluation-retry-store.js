export function memoryRetryStore(){
 const records=new Map();return {put:async job=>records.set(job.id,structuredClone(job)),get:async id=>structuredClone(records.get(id)),list:async()=>[...records.values()].map(job=>structuredClone(job)),remove:async id=>records.delete(id)};
}
// IndexedDB can hold large JSON summaries without the small localStorage limit.
export function browserRetryStore(onFailure){
 const memory=memoryRetryStore();let dbPromise,reported=false;
 function db(){return dbPromise??=new Promise((resolve,reject)=>{const request=indexedDB.open('healthstats-evaluation-retries',1);request.onupgradeneeded=()=>request.result.createObjectStore('pending',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
 async function request(mode,operation){const database=await db();return new Promise((resolve,reject)=>{const transaction=database.transaction('pending',mode);let result;const task=operation(transaction.objectStore('pending'));task.onsuccess=()=>{result=task.result;};transaction.oncomplete=()=>resolve(result);transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error);});}
 async function safe(operation,fallback){try{return await operation();}catch(error){if(!reported){reported=true;onFailure(error);}return fallback();}}
 return {
  put:async job=>{await memory.put(job);await safe(()=>request('readwrite',s=>s.put(job)),()=>{});},
  get:async id=>safe(async()=>await request('readonly',s=>s.get(id))??await memory.get(id),()=>memory.get(id)),
  list:async()=>safe(async()=>{const all=await request('readonly',s=>s.getAll());return [...new Map([...all,...await memory.list()].map(job=>[job.id,job])).values()];},()=>memory.list()),
  remove:async id=>{await memory.remove(id);await safe(()=>request('readwrite',s=>s.delete(id)),()=>{});},
 };
}
