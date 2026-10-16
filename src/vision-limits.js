export const SUMMARY_VISION_PAGES=100;
export const DAILY_VISION_PAGES=400;
const IST_OFFSET=19800000,DAY=86400000;
export function visionDay(now){return new Date(now+IST_OFFSET).toISOString().slice(0,10);}
export function nextVisionReset(now){return (Math.floor((now+IST_OFFSET)/DAY)+1)*DAY-IST_OFFSET;}
export function isDailyVisionLimit(reason=''){return /HealthStats has reached its app-wide daily limit of \d+ vision pages/.test(reason);}
export function dailyVisionMessage(retryAt){
 const date=new Date(retryAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
 return `HealthStats has reached its daily AI vision limit of ${DAILY_VISION_PAGES} pages. Reading resumes at 00:00 IST (India time) on ${date}.`;
}
