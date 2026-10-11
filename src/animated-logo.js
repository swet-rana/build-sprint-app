// Keep the original wordmark and tagline. Smooth vector shapes preserve the
// icon's proportions without the bitmap's rough edges and patched dot areas.
export function animatedLogo() {
 const artwork='/images/healthstats-logo-lavender.png';
 const image=`<image href="${artwork}" width="1530" height="1028"/>`;
 return `<svg class="healthstats-logo animated-logo" viewBox="0 0 1530 1028" width="500" height="336" role="img" aria-label="HealthStats — Track. Compare. Move forward.">
 <defs>
  <clipPath id="logo-lettering"><rect y="620" width="1530" height="408"/></clipPath>
  <linearGradient id="logo-red" x2="1" y2="1"><stop stop-color="#FF9B9B"/><stop offset="1" stop-color="#D93445"/></linearGradient>
  <linearGradient id="logo-green" x2="1" y2="1"><stop stop-color="#90DEAC"/><stop offset="1" stop-color="#239B58"/></linearGradient>
  <linearGradient id="logo-bar" x1="0" y1="0" x2=".77" y2="1"><stop stop-color="#746BD8"/><stop offset=".35" stop-color="#493FC5"/><stop offset="1" stop-color="#4036BD"/></linearGradient>
  <linearGradient id="logo-purple" x2=".8" y2="1"><stop stop-color="#7971DC"/><stop offset=".48" stop-color="#463CC2"/><stop offset="1" stop-color="#3F35B9"/></linearGradient>
 </defs>
 <g clip-path="url(#logo-lettering)">${image}</g>
 <line class="logo-connector" x1="519.68" y1="327.5" x2="1004.32" y2="327.5" stroke="#4439C2" stroke-width="30" stroke-linecap="round"/>
 <rect x="478" y="84" width="130" height="494" rx="65" fill="url(#logo-bar)"/>
 <rect x="920" y="84" width="130" height="494" rx="65" fill="url(#logo-bar)"/>
 <circle class="logo-dot logo-dot-first" cx="542" cy="429" r="47" fill="url(#logo-red)"/>
 <circle class="logo-dot logo-dot-second" cx="758" cy="324" r="57" fill="url(#logo-purple)"/>
 <circle class="logo-dot logo-dot-third" cx="982" cy="226" r="47" fill="url(#logo-green)"/>
 </svg>`;
}
