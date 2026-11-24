import { currentSession } from "@/lib/member-access";
import { failure, InputError, rateLimit, requestBody } from "@/lib/guards";
import { MemberQuery } from "@/lib/community-models";

export async function POST(req:Request){
  try{
    const session=await currentSession();
    if(!session)throw new InputError("Sign in to send a query.",401);
    const {user}=session;
    if(!user.phone || !user.emailVerified)throw new InputError("Complete your member profile before sending a query.",403);
    const data=await requestBody(req);
    const subject=typeof data.subject==="string"?data.subject.trim():"";
    const message=typeof data.message==="string"?data.message.trim():"";
    if(!subject || subject.length>120 || !message || message.length>2000)throw new InputError("Enter a subject (up to 120 characters) and a question (up to 2,000 characters).");
    await rateLimit("queries:"+user.id,10,900);
    await MemberQuery.create({userId:user.id,name:user.name,email:user.email,phone:user.phone,subject,message});
    return Response.json({ok:true},{status:201});
  }catch(error){return failure(error);}
}

