import { installModuleReload } from './module-reload.js';
import { mountProfile } from './profile.jsx';
import { mountHome, homeIcon } from './home.js';
import { animatedLogo } from './animated-logo.js';
import './animated-logo.css';
import { openReportViewer } from './report-viewer.js';
import './style.css';
import { mountUploads } from './uploads.js';
import { mountAnalysis } from './analysis.js';
import './glass.css';
import './typography.css';
import './summary-premium.css';
import './page-heading.css';
installModuleReload();
const markers=[
 {name:'White blood cells',short:'WBC',unit:'cells/µL',values:[7200,12400],range:[4000,11000],max:16000},
 {name:'C-reactive protein',short:'CRP',unit:'mg/L',values:[2.1,18.6],range:[0,5],max:25}
];
const fmt=n=>n.toLocaleString('en-IN');
const source=(i)=>`/reports/${i===0?'march':'september'}.html`;
function chart(m){let y=v=>126-v/m.max*104;return `<svg class="chart" viewBox="0 0 440 165" role="img" aria-label="${m.name}: ${fmt(m.values[0])} in March, ${fmt(m.values[1])} in September. Lab's reference range ${fmt(m.range[0])} to ${fmt(m.range[1])} ${m.unit}."><rect x="64" y="${y(m.range[1])}" width="326" height="${y(m.range[0])-y(m.range[1])}" fill="#e6f0f1"/><line x1="64" y1="${y(m.range[1])}" x2="390" y2="${y(m.range[1])}" stroke="#8baeb7" stroke-dasharray="4 4"/><text x="60" y="${y(m.range[1])+4}" text-anchor="end">${fmt(m.range[1])}</text><text x="60" y="${y(m.range[0])+4}" text-anchor="end">${fmt(m.range[0])}</text><path d="M 104 ${y(m.values[0])} L 346 ${y(m.values[1])}" fill="none" stroke="#176889" stroke-width="3"/>${m.values.map((v,i)=>`<circle cx="${i?346:104}" cy="${y(v)}" r="5" fill="#176889"/><text x="${i?346:104}" y="${y(v)-13}" text-anchor="middle" class="point-label">${fmt(v)}</text>`).join('')}<text x="104" y="155" text-anchor="middle">12 Mar 2025</text><text x="346" y="155" text-anchor="middle">18 Sep 2025</text></svg>`;}
document.querySelector('#app').innerHTML=`
<header class="topbar"><a class="brand" href="/" aria-label="HealthStats home">${animatedLogo()}</a>${import.meta.env.DEV?'<span class="sample-tag">Build preview</span>':''}</header>
<main><nav class="view-tabs" aria-label="Main navigation"><button type="button" id="home-tab" aria-pressed="true" aria-current="page">${homeIcon('home')}<span>Home</span></button><button type="button" id="reports-tab" aria-pressed="false">${homeIcon('reports')}<span>My Reports</span></button><button type="button" id="summary-tab" aria-pressed="false">${homeIcon('summary')}<span>Summary</span></button><button type="button" id="profile-tab" aria-pressed="false">${homeIcon('profile')}<span>Profile</span></button></nav><section class="intro"><div class="summary-title-with-art health-page-heading"><img class="summary-heading-art health-page-heading-art" src="/images/reports-summary.png" alt="" width="88" height="88" decoding="async"><div><h1 id="page-title">Bring your reports together.</h1><p id="page-description">Keep the originals ready for your next doctor visit.</p></div></div><button class="primary" id="print" hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z"/></svg>Print summary</button></section>
<div id="home-view"></div><div id="uploads-view" hidden></div><div id="summary-view" hidden></div><div id="profile-view" hidden></div><div id="sample-view" hidden><div class="demo-note"><strong>You’re viewing sample data.</strong> These fictional reports show how your summary will work. Upload your own reports in My reports. They are not used in this sample.</div>
<article class="summary"><div class="summary-heading"><div><h2>Blood report summary</h2><p>12 March – 18 September 2025</p></div><div class="report-count"><strong>2</strong> reports compared</div></div>
<div class="context"><div><span>Patient</span><strong>Sample patient</strong></div><div><span>Included tests</span><strong>WBC and CRP</strong></div><div><span>Source documents</span><strong>2 fictional blood reports</strong></div></div>
<div class="section-heading"><h3>Changes between reports</h3><span class="legend"><i></i> Lab's reference range</span></div>
<div class="markers">${markers.map(m=>`<section class="marker"><div class="marker-heading"><h4>${m.name} <span>${m.short}</span></h4><span>${m.unit}</span></div>${chart(m)}<div class="values">${m.values.map((v,i)=>`<div><span>${i?'18 Sep':'12 Mar'} 2025</span><p><strong>${fmt(v)}</strong> <span>${m.unit}</span></p><span>Reference: ${fmt(m.range[0])}–${fmt(m.range[1])}</span><a href="${source(i)}" target="_blank" rel="noopener">View original report<span class="sr-only"> for ${m.short}, ${i?'September':'March'}</span><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" aria-hidden="true"><path d="M6 3H3v10h10v-3M8 3h5v5M13 3 7 9"/></svg></a></div>`).join('')}</div><div class="change"><strong>Increased by ${fmt(m.values[1]-m.values[0])} ${m.unit}</strong><span>Latest value is above the range printed in the report.</span></div></section>`).join('')}</div>
<footer class="summary-footer"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-10v1"/></svg><p>This summary shows recorded values and measured changes. Your doctor interprets what they mean. Check the original reports for full context.</p></footer></article>
<section class="sources"><div><h3>The reports behind this summary</h3><p>Every value above links back to its source.</p></div><div class="source-list">${[0,1].map(i=>`<a href="${source(i)}" target="_blank" rel="noopener"><svg width="23" height="26" viewBox="0 0 24 28" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 2h10l6 6v18H4zM14 2v6h6M8 14h8M8 19h8"/></svg><span><strong>${i?'September':'March'} 2025 blood report</strong><small>Fictional sample · opens within HealthStats</small></span><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M6 3H3v10h10v-3M8 3h5v5M13 3 7 9"/></svg></a>`).join('')}</div></section></div><p class="page-footer">Prepare for a conversation with your doctor<br><a href="/privacy.html">Privacy policy</a> · <a href="/terms.html">Terms of use</a></p></main>`;
const printButton=document.querySelector('#print');
printButton.addEventListener('click',()=>window.print());
function placePrintButton(){
 const slot=currentView==='summary'?document.querySelector('#summary-view .summary-print-actions'):null;
 (slot||document.querySelector('.intro')).append(printButton);
 printButton.hidden=!(currentView==='sample'||currentView==='summary'&&summaryReady);
}

let currentView='home', summaryReady=false;
const home=mountHome(document.querySelector('#home-view'),()=>{
 switchView('reports');
 const uploadButton=document.querySelector('#show-upload');
 if(uploadButton.getAttribute('aria-expanded')!=='true')uploadButton.click();
 const fileInput=document.querySelector('#report-files');
 fileInput.focus({preventScroll:true});
 fileInput.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
},()=>{
 switchView('reports');
 const uploadButton=document.querySelector('#show-upload');
 if(uploadButton.getAttribute('aria-expanded')==='true')uploadButton.click();
 const reportsList=document.querySelector('#reports-list');
 reportsList.querySelector('[data-analysis-id]')?.focus({preventScroll:true});
 const selectionBar=document.querySelector('.reports-selection-bar');
 const scrollTarget=selectionBar&&!selectionBar.hidden&&!window.matchMedia('(max-width: 760px)').matches?selectionBar:reportsList;
 scrollTarget.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
},goToPrepareSummary);
const analysis=mountAnalysis(document.querySelector('#summary-view'),ready=>{
  summaryReady=ready;
  placePrintButton();
},{onAddReports:()=>switchView('reports'),onRemoveReport:id=>uploads.removeFromAnalysis(id)});
const uploads=mountUploads(document.querySelector('#uploads-view'),(reports,ids)=>analysis.updateReports(reports,ids),goToPrepareSummary);
function goToPrepareSummary(){
 switchView('summary');
 const prepareButton=document.querySelector('#prepare-summary');
 prepareButton.focus({preventScroll:true});
 prepareButton.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
}
function switchView(view) {
  currentView=view;
  const logo=document.querySelector('.brand .healthstats-logo');
  if(view==='home'&&!document.querySelector('.homepage-logo')) {
    logo.outerHTML='<picture class="homepage-logo"><source media="(prefers-reduced-motion: reduce)" srcset="/images/healthstats-logo-animated-still.png?v=clean-bars"><img class="healthstats-logo" src="/images/healthstats-logo-animated.gif?v=clean-bars" alt="HealthStats — Track. Compare. Move forward." width="1020" height="686"></picture>';
  } else if(view!=='home'&&document.querySelector('.homepage-logo')) {
    document.querySelector('.homepage-logo').outerHTML=animatedLogo();
  }
  document.querySelector('#home-begin').addEventListener('click',()=>switchView('reports'));
for(const name of ['home','reports','summary','profile']) {
    document.querySelector(`#${name==='reports'?'uploads':name}-view`).hidden=name!==view;
    const tab=document.querySelector(`#${name}-tab`);
    tab.setAttribute('aria-pressed',String(name===view));
    if(name===view)tab.setAttribute('aria-current','page');else tab.removeAttribute('aria-current');
  }
  placePrintButton();
  home.setActive(view==='home');
  document.querySelector('.intro').hidden=view==='profile'||view==='home';
  document.title=`HealthStats · ${{home:'Home',reports:'My Reports',summary:'Summary',profile:'Profile'}[view]||'HealthStats'}`;
  document.querySelector('#page-title').textContent=view==='reports'?'Bring your reports together.':view==='summary'?'My health summary':'Your Health Summary, ready for your doctor.';
  document.querySelector('#page-description').textContent=view==='sample'?'Two blood reports. One clear view of what changed.':view==='summary'?'Compares 2 or more similar medical reports.':'Keep the originals ready for your next doctor visit.';
}
document.querySelector('#home-begin').addEventListener('click',()=>switchView('reports'));
for(const name of ['home','reports','summary','profile']) document.querySelector(`#${name}-tab`).addEventListener('click',()=>switchView(name));

document.querySelector('#sample-view').addEventListener('click',event=>{
  const link=event.target.closest('a[href^="/reports/"]');if(!link)return;
  event.preventDefault();
  openReportViewer({name:'Original sample report',sampleUrl:link.getAttribute('href')});
});

mountProfile(document.querySelector('#profile-view'),()=>switchView('reports'));

document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();switchView('home');});
switchView(window.location.hash==='#profile'?'profile':'home');
