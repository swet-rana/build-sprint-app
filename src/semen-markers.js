// Explicit semen aliases: specimen and assay method remain part of identity.
const compact=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const definitions=[
 ['volume','Semen volume',['SEMEN VOLUME','VOLUME']],
 ['concentration','Sperm concentration',['SPERM CONCENTRATION','SPERM COUNT PER ML','SPERM COUNT/ML','SPERM COUNT']],
 ['total-count','Total sperm count',['TOTAL SPERM COUNT','TOTAL SPERM NUMBER','TOTAL SPERM COUNT PER EJACULATE']],
 ['total-motility','Total sperm motility',['TOTAL MOTILITY','TOTAL SPERM MOTILITY']],
 ['progressive-motility','Progressive sperm motility',['PROGRESSIVE MOTILITY','PROGRESSIVE SPERM MOTILITY']],
 ['non-progressive-motility','Non-progressive sperm motility',['NON-PROGRESSIVE MOTILITY','NON PROGRESSIVE SPERM MOTILITY']],
 ['immotile','Immotile sperm',['IMMOTILE SPERM','IMMOTILE']],
 ['normal-forms','Normal sperm forms',['NORMAL FORMS','NORMAL MORPHOLOGY','SPERM MORPHOLOGY (NORMAL FORMS)']],
 ['vitality','Sperm vitality',['VITALITY','SPERM VITALITY','VIABILITY','SPERM VIABILITY']],
 ['dfi','Sperm DNA fragmentation index',['DNA FRAGMENTATION INDEX','SPERM DNA FRAGMENTATION INDEX','DFI']],
];
const aliases=new Map(definitions.flatMap(([id,name,names])=>names.map(alias=>[compact(alias),{id,name}])));
export function semenIdentity(name,unit,method=''){
 const identity=aliases.get(compact(name));if(!identity)return null;
 const normalizedUnit=String(unit??'').toLowerCase().replace(/\s/g,'');
 const allowed=identity.id==='volume'?normalizedUnit==='ml':identity.id==='concentration'?['million/ml','millions/ml','10^6/ml','x10^6/ml'].includes(normalizedUnit):identity.id==='total-count'?['million/ejaculate','millions/ejaculate','10^6/ejaculate','million','millions'].includes(normalizedUnit):normalizedUnit==='%';
 if(!allowed)throw Error(`Check ${identity.name}: the semen result unit is missing or unsupported.`);
 if(identity.id==='dfi'&&!String(method).trim())throw Error('DNA fragmentation results need a printed assay method before they can be compared.');
 return {key:`semen-${identity.id}${identity.id==='dfi'?'-'+compact(method):''}|${normalizedUnit}`,name:identity.name,rawName:String(name).trim(),specimen:'semen',method:String(method).trim()};
}
