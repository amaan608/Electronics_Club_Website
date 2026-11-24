import "server-only";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { enrollmentCookie, finishEnrollment } from "./enrollment";
import { InputError } from "./guards";
import { z } from "zod";

export const profilePlugin = {
  id:"club-profile",
  endpoints:{
    completeGoogleProfile:createAuthEndpoint("/complete-profile",{
      method:"POST",body:z.object({name:z.string(),confirmName:z.string(),phone:z.string()}),
    },async ctx=>{
      let id:string;
      try { id=await finishEnrollment(ctx.getCookie(enrollmentCookie) ?? undefined,ctx.body); }
      catch(error){
        if(error instanceof InputError)throw new APIError(
          error.status===401?"UNAUTHORIZED":error.status===409?"CONFLICT":"BAD_REQUEST",
          {message:error.message},
        );
        throw error;
      }
      const user=await ctx.context.internalAdapter.findUserById(id);
      if(!user)throw new Error("Could not load completed membership.");
      const session=await ctx.context.internalAdapter.createSession(id);
      await setSessionCookie(ctx,{user,session});
      ctx.setCookie(enrollmentCookie,"",{path:"/",maxAge:0});
      return ctx.json({ok:true});
    }),
  }
};

