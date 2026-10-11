// Keep the original bitmap for the bars, wordmark, tagline and middle dot.
// Only the connecting line and the two requested dot colours are drawn anew.
export function animatedLogo() {
 const artwork='/images/healthstats-logo-lavender.png';
 const image=`<image href="${artwork}" width="1530" height="1028"/>`;
 return `<svg class="healthstats-logo animated-logo" viewBox="0 0 1530 1028" width="500" height="336" role="img" aria-label="HealthStats — Track. Compare. Move forward.">
 <defs>
  <clipPath id="logo-lettering"><rect y="620" width="1530" height="408"/></clipPath>
  <clipPath id="logo-bars"><rect x="474" y="80" width="137" height="501"/><rect x="917" y="80" width="136" height="501"/></clipPath>
  <mask id="logo-without-dots"><rect width="1530" height="1028" fill="white"/><circle cx="542" cy="429" r="49" fill="black"/><circle cx="982" cy="226" r="49" fill="black"/></mask>
  <clipPath id="logo-left-fill"><circle cx="542" cy="429" r="50"/></clipPath>
  <clipPath id="logo-right-fill"><circle cx="982" cy="226" r="50"/></clipPath>
  <clipPath id="logo-middle-dot"><circle cx="758" cy="324" r="59"/></clipPath>
  <linearGradient id="logo-red" x2="1" y2="1"><stop stop-color="#FF9B9B"/><stop offset="1" stop-color="#D93445"/></linearGradient>
  <linearGradient id="logo-green" x2="1" y2="1"><stop stop-color="#90DEAC"/><stop offset="1" stop-color="#239B58"/></linearGradient>
 </defs>
 <g clip-path="url(#logo-lettering)">${image}</g>
 <line class="logo-connector" x1="519.68" y1="327.5" x2="1004.32" y2="327.5" stroke="#4439C2" stroke-width="30" stroke-linecap="round"/>
 <g clip-path="url(#logo-bars)" mask="url(#logo-without-dots)">${image}</g>
 <g clip-path="url(#logo-left-fill)"><g transform="translate(0 190)">${image}</g></g>
 <g clip-path="url(#logo-right-fill)"><g transform="translate(0 -190)">${image}</g></g>
 <circle class="logo-dot logo-dot-first" cx="542" cy="429" r="47" fill="url(#logo-red)"/>
 <g class="logo-dot logo-dot-second" clip-path="url(#logo-middle-dot)">${image}</g>
 <circle class="logo-dot logo-dot-third" cx="982" cy="226" r="47" fill="url(#logo-green)"/>
 </svg>`;
}
