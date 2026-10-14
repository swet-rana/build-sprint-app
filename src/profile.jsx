import {imageUrl} from './image-assets.js';
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useConvexAuth, useQuery} from 'convex/react';
import {ConvexAuthProvider, useAuthActions} from '@convex-dev/auth/react';
import {api} from '../convex/_generated/api';
import './profile.css';
import {authClient} from './auth-client.js';

function Profile({continueWithoutAccount}) {
  const {isLoading,isAuthenticated}=useConvexAuth();
  const {signIn,signOut}=useAuthActions();
  const user=useQuery(api.profiles.me,isAuthenticated?{}:'skip');
  const [flow,setFlow]=useState('signUp'),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  async function submit(event){
    event.preventDefault();if(busy)return;
    const form=event.currentTarget, data=new FormData(form);
    if(flow==='signUp' && data.get('password')!==data.get('confirmPassword')){setNotice('Passwords do not match.');return;}
    data.delete('confirmPassword');data.set('flow',flow);
    data.set('email',String(data.get('email')).trim().toLowerCase());
    setBusy(true);setNotice('');
    try{await signIn('password',data);form.reset();}
    catch(error){
      const text=String(error.message||'');
      setNotice(/JWT_PRIVATE_KEY|JWKS|Could not find|not configured/i.test(text)?'Account access is not ready yet. Please try again later.':flow==='signIn'?'Could not sign in. Check your email and password and try again.':'Could not create your account. If you already have an account, choose Sign in.');
    }finally{setBusy(false);}
  }
  async function googleSignIn(){
    if(busy)return;
    setBusy(true);setNotice('');
    try{await signIn('google',{redirectTo:'/#profile'});}
    catch{setNotice('Google sign-in is not available right now. Please try again later or use email and password.');}
    finally{setBusy(false);}
  }
  async function logOut(){setBusy(true);setNotice('');try{await signOut();}catch{setNotice('Could not sign out. Please try again.');}finally{setBusy(false);}}
  return <section className="profile-card" aria-labelledby="profile-title">
    <div className="profile-title-with-art"><img className="profile-heading-art" src={imageUrl('/images/profile-card.png')} alt="" width="88" height="88" loading="lazy" decoding="async" /><h1 id="profile-title">My profile</h1></div>
    {isLoading?<p role="status">Loading your profile…</p>:isAuthenticated?<>
      <p>You’re signed in{user?.name?` as ${user.name}`:''}.</p>
      {user?<dl className="profile-details"><dt>Name</dt><dd>{user.name||'Not added'}</dd><dt>Email</dt><dd>{user.email}</dd></dl>:<p role="status">Loading account details…</p>}
      <p>Your uploaded reports currently stay tied to this browser.</p>
      <button type="button" className="primary profile-submit" disabled={busy} onClick={logOut}>{busy?'Signing out…':'Sign out'}</button>
    </>:<>
      <p>Create an account or sign in when you choose. You can keep using HealthStats without one.</p>
      <div className="profile-actions" aria-label="Account options">
        <button type="button" aria-pressed={flow==='signUp'} disabled={busy} onClick={()=>{setFlow('signUp');setNotice('');}}>Sign up</button>
        <button type="button" aria-pressed={flow==='signIn'} disabled={busy} onClick={()=>{setFlow('signIn');setNotice('');}}>Sign in</button>
      </div>
      <button type="button" className="profile-google" disabled={busy} onClick={googleSignIn}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>
        Continue with Google
      </button>
      <p className="profile-email-divider">or use your email and password</p>
      <form className="profile-form" key={flow} onSubmit={submit}>
        {flow==='signUp'&&<label>Name<input name="name" autoComplete="name" maxLength={100} required disabled={busy}/></label>}
        <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required disabled={busy}/></label>
        <label>Password<input name="password" type="password" autoComplete={flow==='signUp'?'new-password':'current-password'} minLength={flow==='signUp'?8:undefined} required disabled={busy}/></label>
        {flow==='signUp'&&<><p className="password-help">Use at least 8 characters.</p><label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required disabled={busy}/></label></>}
        <button type="submit" className="primary profile-submit" disabled={busy}>{busy?'Please wait…':flow==='signUp'?'Create account':'Sign in'}</button>
      </form>
      <p>Your reports remain available in this browser whether you sign in or continue without an account.</p>
    </>}
    <p className="profile-status" role="status">{notice}</p>
    <button type="button" className="profile-continue" onClick={continueWithoutAccount}>{isAuthenticated?'Go to My reports':'Continue without an account'}</button>
  </section>;
}
export function mountProfile(root,continueWithoutAccount){
  const client=authClient();
  createRoot(root).render(<ConvexAuthProvider client={client}><Profile continueWithoutAccount={continueWithoutAccount}/></ConvexAuthProvider>);
}
