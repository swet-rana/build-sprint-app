export function pageCountLabel(count){
 return Number.isSafeInteger(count)&&count>0?`, ${count} ${count===1?'page':'pages'}`:'';
}
