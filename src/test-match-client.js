import {authClient} from './auth-client.js';
import {api} from '../convex/_generated/api';
export function testMatching(reportIds){
 const sessionKey=localStorage.getItem('health-history-upload-session');if(!import.meta.env.VITE_CONVEX_URL||!sessionKey)return null;
 const client=authClient();return async entries=>{try{return await client.action(api.testMatching.match,{sessionKey,reportIds,entries});}catch(error){return entries.map(entry=>({...entry,status:'failed',error:typeof error.data==='string'?error.data:'Name matching unavailable; original results retained.'}));}};
}
