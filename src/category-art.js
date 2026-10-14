export const CATEGORY_ART={heart:'heart-cholesterol',liver:'liver',kidney:'kidney',sugar:'blood-sugar',thyroid:'thyroid',blood:'blood-counts',inflammation:'inflammation',iron:'iron',vitamins:'vitamins',bone:'bone-minerals',electrolytes:'electrolytes',hormones:'reproductive-hormones',fertility:'fertility',longevity:'longevity',digestion:'pancreas-digestion',clotting:'blood-clotting',allergy:'allergy-markers',other:'other-tests'};
export const SMALL_CATEGORY_ART={inflammation:88,electrolytes:96,hormones:88};
export function categoryIllustration(category){
 const name=CATEGORY_ART[category];if(!name)return '';
 const small=SMALL_CATEGORY_ART[category];
 const image=`<img class="health-category-art" src="/images/categories/${name}.webp" alt="" width="76" height="76" loading="lazy" decoding="async">`;
 return small?`<picture><source media="(max-width:760px)" srcset="/images/categories/${name}-${small}.webp">${image}</picture>`:image;
}
