// Operational reading results stay unchanged. Evaluation copies omit patient names.
export function withoutPatientNames(value){
 const names=new Set();
 function collect(v){
  if(!v||typeof v!=='object')return;
  for(const [key,item] of Object.entries(v)){
   if(key==='patientName'&&typeof item==='string'){
    names.add(item);for(const word of item.match(/\p{L}{2,}/gu)??[])if(!/^(mr|mrs|ms|dr|master)$/i.test(word))names.add(word);
   }else if(key==='text'&&typeof item==='string'){try{collect(JSON.parse(item));}catch{}}
   else collect(item);
  }
 }
 collect(value);
 function clean(v){
  if(typeof v==='string'){
   for(const name of [...names].sort((a,b)=>b.length-a.length))v=v.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),'[private]');
   return v;
  }
  if(Array.isArray(v))return v.map(clean);
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([key])=>!['patientName','identityConfirmation','conflict'].includes(key)).map(([key,item])=>[key,clean(item)]));
  return v;
 }
 return clean(value);
}
