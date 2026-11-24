import { currentSession } from "@/lib/member-access";
import { failure, InputError, memberDetails, requestBody } from "@/lib/guards";
import { User } from "@/lib/models";
export async function POST(req:Request){
  try{
    const session=await currentSession();
    if(!session)throw new InputError("Sign in to complete your profile.",401);
    const details=memberDetails(await requestBody(req),true);
    await User.updateOne({_id:session.user.id},{$set:details},{runValidators:true});
    return Response.json({ok:true});
  }catch(error){return failure(error);}
}

