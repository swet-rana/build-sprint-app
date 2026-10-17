export function nameParts(name){
 const text=String(name??'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/\(\s*\d{1,3}\s*(?:years?|yrs?|y)?\s*[/, -]*\s*(?:male|female|[mf])\s*\)\s*$/i,'').replace(/^(?:(?:mrs|miss|ms|mr|master|dr|prof|shri|smt)\b[.\s]*)+/i,'');
 const words=text.toLowerCase().match(/\p{L}+/gu)??[],full=words.filter(w=>w.length>1);
 return {full,compact:full.join(''),complete:words.join(''),initials:full.length<words.length};
}
function oneLetterApart(a,b){
 if(Math.abs(a.length-b.length)>1)return false;
 let i=0,j=0,changes=0;
 while(i<a.length&&j<b.length){
  if(a[i]===b[j]){i++;j++;continue;}
  if(++changes>1)return false;
  if(a.length>=b.length)i++;
  if(b.length>=a.length)j++;
 }
 return changes+(i<a.length||j<b.length?1:0)<=1;
}
function compatibleNames(a,b){
 if(a.full.length>=2&&b.full.length>=2&&a.full.at(-1)===b.full.at(-1)&&oneLetterApart(a.full[0],b.full[0])&&a.full.slice(1,-1).join('')===b.full.slice(1,-1).join(''))return true;
 if(a.complete===b.complete||a.compact===b.compact)return true;
 const subset=(short,long)=>{let n=0;for(const word of long)if(word===short[n])n++;return n===short.length;};
 if(subset(a.full,b.full)||subset(b.full,a.full))return true;
 // A spaced full name and an unspaced version can also accompany a surname with initials.
 return a.initials&&a.full.length===1&&b.compact.endsWith(a.compact)||b.initials&&b.full.length===1&&a.compact.endsWith(b.compact);
}

export function patientNamesMatch(a,b){const left=nameParts(a),right=nameParts(b);return left.full.length>0&&right.full.length>0&&compatibleNames(left,right);}
