import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";

export const me = query({
  args:{}, returns:v.union(v.null(),v.object({name:v.string(),email:v.string()})),
  handler:async ctx=>{
    const id=await getAuthUserId(ctx);
    if(!id)return null;
    const user=await ctx.db.get("users",id);
    return user?{name:user.name??"",email:user.email??""}:null;
  },
});
