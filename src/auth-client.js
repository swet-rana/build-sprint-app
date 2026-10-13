import {ConvexReactClient} from 'convex/react';
let client;
// Reuse the existing sign-in connection so limits follow a signed-in user across browsers.
export function authClient(){return client??=new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);}
