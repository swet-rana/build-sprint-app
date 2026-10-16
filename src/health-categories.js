// Common Indian lab-panel groupings, not diagnoses or a national classification.
// Sources and scope are documented in references/health-categories.md.
export const HEALTH_CATEGORIES = [
 {id:'heart',label:'Heart & cholesterol',description:'Cholesterol, triglycerides and related blood markers'},
 {id:'liver',label:'Liver',description:'Liver enzymes, bilirubin and blood proteins'},
 {id:'kidney',label:'Kidney',description:'Creatinine, filtration, urea and related markers'},
 {id:'sugar',label:'Blood sugar',description:'Glucose, HbA1c and insulin'},
 {id:'thyroid',label:'Thyroid',description:'TSH, T3 and T4'},
 {id:'blood',label:'Blood counts',description:'Haemoglobin, blood cells and platelets'},
 {id:'inflammation',label:'Infection & inflammation',description:'CRP, ESR and white-cell markers; not proof of infection'},
 {id:'iron',label:'Iron',description:'Iron, ferritin and iron-binding tests'},
 {id:'vitamins',label:'Vitamins',description:'Vitamin D, B12 and other measured vitamins'},
 {id:'bone',label:'Bone & minerals',description:'Calcium, phosphorus, vitamin D and related markers'},
 {id:'electrolytes',label:'Electrolytes',description:'Sodium, potassium, chloride and mineral balance'},
 {id:'hormones',label:'Reproductive hormones',description:'Prolactin, FSH, LH and related hormones'},
 {id:'fertility',label:'Fertility',description:'AMH, FSH, LH, estradiol, progesterone, testosterone, prolactin, inhibin B, TSH and semen measurements',note:'Blood hormones and semen measurements are shown separately. Cycle timing, age, medicines and clinical history affect interpretation. AMH is not a pregnancy-chance test. Semen results vary with collection conditions. DNA fragmentation methods remain separate. Ultrasound and physical trackers are not read by this summary.'},
 {id:'longevity',label:'Longevity',description:'Cholesterol, ApoB, Lp(a), glucose, HbA1c, kidney markers and hs-CRP',note:'Recorded markers relevant to long-term heart, metabolic and kidney health. This grouping does not estimate lifespan or biological age, and is not a recommended testing package.'},
 {id:'digestion',label:'Pancreas & digestion',description:'Amylase and lipase'},
 {id:'clotting',label:'Blood clotting',description:'PT, INR, APTT and related clotting tests'},
 {id:'allergy',label:'Allergy markers',description:'IgE and eosinophils; not an allergy diagnosis'},
 {id:'other',label:'Other tests',description:'Tests without a confirmed category mapping'},
];
export function categoriesForTest(marker){
 const id=String(marker.key??'').split('|')[0].toLowerCase();
 const name=[marker.name,marker.rawName,...(marker.observations??[]).filter(Boolean).map(m=>m.rawName)].filter(Boolean).join(' ').toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(/^(?:urine|stool)-/.test(id))return ['other'];
 if(id.startsWith('semen-'))return ['fertility'];
 const categories=new Set();
 const add=(category,match)=>{if(match)categories.add(category);};
 add('heart',/CHOLESTEROL|CHOLHDL|LDLHDL|TRIGLYCERIDE|APOLIPOPROTEIN|LIPOPROTEIN|TROPONIN|NTPROBNP/.test(name));
 add('liver',/BILIRUBIN|ALANINEAMINO|ASPARTATEAMINO|SGPT|SGOT|GAMMAGLUTAMYL|GGT|ALKALINEPHOSPHATASE|PROTEINTOTAL|TOTALPROTEIN|GLOBULIN|AGRATIO/.test(name)||(/ALBUMIN/.test(name)&&!/URIN|MICROALBUMIN/.test(name)));
 add('kidney',/CREATININE|GLOMERULAR|EGFR|UREA|URICACID|CYSTATIN|MICROALBUMIN/.test(name));
 add('sugar',id==='hba1c'||/GLUCOSE|HBA1C|INSULIN|CPEPTIDE|FRUCTOSAMINE/.test(name));
 add('thyroid',['tsh','t3','t4'].includes(id)||/THYROID|THYROXINE|TRIIODOTHYRONINE|FREET3|FREET4/.test(name));
 const white=id==='wbc'||/LEUCOCYTE|LEUKOCYTE|CORRECTEDTLC|NEUTROPHIL|LYMPHOCYTE|MONOCYTE|EOSINOPHIL|BASOPHIL/.test(name);
 add('blood',id==='haemoglobin'||white||/^rbccount$/i.test(id)||/^(?:RBC|RBC_COUNT|PCV|HCT|MCV|MCH|MCHC|RDW|MPV|PDW)$/i.test(id)||/HEMATOCRIT|HAEMATOCRIT|PLATELET|RED(?:BLOOD)?CELL|RDW/.test(name));
 add('inflammation',white||['esr','crp'].includes(id)||/CREACTIVEPROTEIN|SEDIMENTATIONRATE|PROCALCITONIN|HBSAG|ANTIHCV|HIV|DENGUE|MALARIA|WIDAL/.test(name));
 add('iron',/IRON|FERRITIN|TRANSFERRIN|TIBC|UIBC/.test(name));
 add('vitamins',/VITAMIN|FOLATE|FOLICACID/.test(name));
 add('bone',id==='vitamin-d'||/CALCIUM|PHOSPHORUS|PHOSPHATE|PARATHYROID|PTH|ALKALINEPHOSPHATASE/.test(name));
 const electrolyte=/SODIUM|POTASSIUM|CHLORIDE|BICARBONATE|MAGNESIUM|CALCIUM|PHOSPHORUS/.test(name);
 add('electrolytes',electrolyte);add('kidney',electrolyte);
 add('hormones',/PROLACTIN|INHIBINB|FOLLICLESTIMULATING|LUTEINIZING|TESTOSTERONE|ESTRADIOL|OESTRADIOL|ESTROGEN|PROGESTERONE|ANTIMULLERIAN|AMH|BETAHCG/.test(name)||['fsh','lh'].includes(id));
 const fertilityHormone=/^(?:AMH|FSH|LH|TSH)$/.test(name)||['amh','fsh','lh','tsh'].includes(id)||/ANTIM[UÜ]LLERIAN|FOLLICLESTIMULATING|LUTEINI[ZS]ING|ESTRADIOL|OESTRADIOL|PROGESTERONE|TESTOSTERONE|PROLACTIN|INHIBINB|THYROIDSTIMULATING/.test(name);
 add('fertility',fertilityHormone);
 const lipids=/CHOLESTEROL|TRIGLYCERIDE|APOLIPOPROTEINB|APOB/.test(name)||(!/APOLIPOPROTEIN/.test(name)&&/LIPOPROTEINA/.test(name))||/^(?:LDL|HDL|NONHDL|LPA)$/.test(name);
 const glycaemia=id==='hba1c'||/GLUCOSE|HBA1C|GLYCATEDH[AE]*MOGLOBIN|GLYCOSYLATEDH[AE]*MOGLOBIN/.test(name);
 const kidneyFunction=/EGFR|GLOMERULAR|CYSTATINC/.test(name)||(/CREATININE/.test(name)&&!/URIN|RATIO/.test(name));
 const highSensitivityCrp=/HSCRP|CRPHS|HIGHSENSITIVITY.*(?:CRP|CREACTIVEPROTEIN)|(?:CRP|CREACTIVEPROTEIN).*HIGHSENSITIVITY/.test(name);
 add('longevity',lipids||glycaemia||kidneyFunction||highSensitivityCrp);
 add('digestion',/AMYLASE|LIPASE/.test(name));
 add('clotting',/PROTHROMBIN|THROMBOPLASTIN|FIBRINOGEN|DDIMER/.test(name)||['pt','inr','aptt'].includes(id));
 add('allergy',/EOSINOPHIL|IMMUNOGLOBULINE|TOTALIGE|SPECIFICIGE/.test(name)||id==='ige');
 return categories.size?[...categories]:['other'];
}
export function testInCategory(marker,category){return category==='all'||categoriesForTest(marker).includes(category);}
