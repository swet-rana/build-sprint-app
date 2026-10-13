const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const compact=value=>clean(value).toUpperCase().replace(/[^A-Z0-9]/g,'');
export const unitIdentity=unit=>{const normalized=clean(unit).toLowerCase().replace(/[µμ]/g,'u').replace(/\s/g,'');return /^(?:x|×)?10(?:³|\^3)\/ul$/.test(normalized)?'10^3/ul':normalized;};
// Explicit aliases only. Units and testing conditions remain part of identity.
const definitions=[
 ['mcv','MCV',['MCV','MEAN CORPUSCULAR VOLUME(MCV)']],
 ['mch','MCH',['MCH','MEAN CORPUSCULAR HEMOGLOBIN(MCH)']],
 ['mchc','MCHC',['MCHC','MEAN CORP.HEMO.CONC(MCHC)']],
 ['mpv','MPV',['MPV','MEAN PLATELET VOLUME(MPV)']],
 ['pdw','PDW',['PDW','PLATELET DISTRIBUTION WIDTH(PDW)']],
 ['lymphocytes','LYMPHOCYTES',['LYMPHOCYTES','LYMPHOCYTE PERCENTAGE']],
 ['neutrophils-absolute','Absolute neutrophil count',['ABSOLUTE NEUTROPHIL COUNT','NEUTROPHILS - ABSOLUTE COUNT']],
 ['lymphocytes-absolute','Absolute lymphocyte count',['ABSOLUTE LYMPHOCYTE COUNT','LYMPHOCYTES - ABSOLUTE COUNT']],
 ['monocytes-absolute','Absolute monocyte count',['ABSOLUTE MONOCYTE COUNT','MONOCYTES - ABSOLUTE COUNT']],
 ['eosinophils-absolute','Absolute eosinophil count',['ABSOLUTE EOSINOPHIL COUNT','EOSINOPHILS - ABSOLUTE COUNT']],
 ['basophils-absolute','Absolute basophil count',['ABSOLUTE BASOPHIL COUNT','BASOPHILS - ABSOLUTE COUNT']],
 ['haemoglobin','Haemoglobin',['HAEMOGLOBIN','HEMOGLOBIN','HB','HGB']],
 ['wbc','White blood cells',['WBC','WBC COUNT','WHITE BLOOD CELL COUNT','WHITE BLOOD CELLS','TOTAL LEUCOCYTE COUNT','TOTAL LEUCOCYTE COUNT (TLC)','TOTAL LEUKOCYTE COUNT','TOTAL LEUCOCYTES COUNT','TLC']],
 ['esr','ESR',['ESR','ERYTHROCYTE SEDIMENTATION RATE']],
 ['hba1c','HbA1c',['HBA1C','HbA1c - (HPLC - NGSP Certified)','HBA1C, GLYCATED HEMOGLOBIN','GLYCATED HEMOGLOBIN','GLYCOSYLATED HEMOGLOBIN (HBA1C)']],
 ['tsh','TSH',['TSH','TSH (Ultrasensitive/4thGen)','TSH (Ultrasensitive)','THYROID STIMULATING HORMONE','THYROID STIMULATING HORMONE (TSH)','THYROID STIMULATING HORMONE - ULTRA','THYROID STIMULATING HORMONE - ULTRA SENSITIVE']],
 ['t3','Total T3',['T3, TOTAL','TOTAL T3','TRI-IODOTHYRONINE (T3, TOTAL)','TOTAL TRIIODOTHYRONINE (T3)']],
 ['t4','Total T4',['T4, TOTAL','TOTAL T4','THYROXINE (T4, TOTAL)','TOTAL THYROXINE (T4)']],
 ['vitamin-d','Vitamin D',['VITAMIN D','VITAMIN D (25-OH)','VITAMIN D (25 - OH VITAMIN D)','25-HYDROXY VITAMIN D (D2+D3)','25-OH VITAMIN D']],
 ['vitamin-b12','Vitamin B12',['VITAMIN B12','VITAMIN B-12']],
 ['crp','C-reactive protein',['CRP','C-REACTIVE PROTEIN','C-REACTIVE PROTEIN (QUANTITATIVE)','C-REACTIVE PROTEIN CRP (QUANTITATIVE)']],
 ['cholesterol-total','Total cholesterol',['TOTAL CHOLESTEROL','CHOLESTEROL - TOTAL','CHOLESTEROL, TOTAL']],
 ['cholesterol-hdl','HDL cholesterol',['HDL CHOLESTEROL','CHOLESTEROL - HDL','HDL-C']],
 ['cholesterol-ldl','LDL cholesterol',['LDL CHOLESTEROL','CHOLESTEROL - LDL','LDL-C']],
 ['cholesterol-vldl','VLDL cholesterol',['VLDL CHOLESTEROL','CHOLESTEROL - VLDL','VLDL-C']],
 ['cholesterol-non-hdl','Non-HDL cholesterol',['NON-HDL CHOLESTEROL','NON HDL CHOLESTEROL']],
 ['cholesterol-hdl-ratio','Total cholesterol / HDL ratio',['CHOL / HDL RATIO','CHOLESTEROL : HDL CHOLESTEROL','TOTAL CHOLESTEROL / HDL CHOLESTEROL RATIO','TC/HDL RATIO']],
 ['ldl-hdl-ratio','LDL / HDL ratio',['LDL : HDL CHOLESTEROL','LDL/HDL RATIO']],
 ['glucose-fasting','Fasting glucose',['GLUCOSE - FASTING','GLUCOSE, FASTING','FASTING BLOOD GLUCOSE','FASTING BLOOD SUGAR','FBS']],
 ['glucose-random','Random glucose',['GLUCOSE - RANDOM','GLUCOSE, RANDOM','RANDOM BLOOD GLUCOSE','RANDOM BLOOD SUGAR','RBS']],
 ['pcv','Haematocrit (PCV)',['PCV','HCT','HAEMATOCRIT','HEMATOCRIT','HEMATOCRIT(PCV)','PACKED CELL VOLUME']],
 ['rbc','Red blood cell count',['RBC','RBC COUNT','RED BLOOD CELL COUNT']],
 ['alt','ALT (SGPT)',['ALT','SGPT','ALT/SGPT','ALANINE AMINOTRANSFERASE','ALANINE AMINOTRANSFERASE (ALT/SGPT)','ALANINE TRANSAMINASE (SGPT)']],
 ['ast','AST (SGOT)',['AST','SGOT','AST/SGOT','ASPARTATE AMINOTRANSFERASE','ASPARTATE AMINOTRANSFERASE (AST/SGOT)','ASPARTATE AMINOTRANSFERASE (SGOT)','ASPARTATE TRANSAMINASE (SGOT)']],
 ['alp','Alkaline phosphatase',['ALP','ALKALINE PHOSPHATASE']],
 ['ggt','GGT',['GGT','GAMMA GLUTAMYL TRANSFERASE','GAMMA GLUTAMYL TRANSPEPTIDASE','GAMMA GLUTAMYL TRANSFERASE (GGT)']],
 ['bun','Blood urea nitrogen',['BUN','BLOOD UREA NITROGEN','BLOOD UREA NITROGEN (BUN)']],
 ['iron','Iron',['IRON','IRON SERUM','SERUM IRON']],
 ['tibc','Total iron-binding capacity',['TIBC','TOTAL IRON BINDING CAPACITY','TOTAL IRON BINDING CAPACITY (TIBC)']],
 ['uibc','Unsaturated iron-binding capacity',['UIBC','UNSATURATED IRON BINDING CAPACITY','UNSATURATED IRON BINDING CAPACITY (UIBC)']],
 ['fsh','FSH',['FSH','FOLLICLE STIMULATING HORMONE','FOLLICLE STIMULATING HORMONE (FSH)']],
 ['lh','LH',['LH','LUTEINIZING HORMONE','LUTEINIZING HORMONE (LH)']],
];
const aliases=new Map(definitions.flatMap(([id,name,names])=>names.map(alias=>[compact(alias),{id,name}])));
export function testIdentity(name,unit){
 const rawName=clean(name);
 const base=rawName.replace(/\s*,?\s*(SERUM|WHOLE BLOOD[ -]EDTA|NAF PLASMA|SODIUM FLUORIDE PLASMA(?:\s*\(R\))?)\s*$/i,'').trim();
 const token=compact(base);
 let identity=aliases.get(token);
 if(['RDW','RDWCV','REDCELLDISTRIBUTIONWIDTHRDWCV'].includes(token)&&unitIdentity(unit)==='%')identity={id:'rdw-cv',name:'RDW-CV'};
 const matchingUnit=!clean(unit)&&identity?.id.endsWith('-ratio')?'ratio':unitIdentity(unit);
 return {key:`${identity?.id??token}|${matchingUnit}`,name:identity?.name??base.toUpperCase(),rawName};
}
