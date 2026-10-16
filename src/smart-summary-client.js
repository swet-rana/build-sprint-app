import {authClient} from './auth-client.js';
import {api} from '../convex/_generated/api';
export async function requestSmartSummary(summaryKey){
 const sessionKey=localStorage.getItem('health-history-upload-session');
 if(!summaryKey||!sessionKey||!import.meta.env.VITE_CONVEX_URL)return {available:false};
 try{return await authClient().action(api.smartSummary.write,{sessionKey,summaryKey});}catch{return {available:false};}
}
