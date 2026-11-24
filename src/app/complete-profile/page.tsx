import { redirect } from "next/navigation";
import { pendingEnrollment } from "@/lib/enrollment";
import { currentSession } from "@/lib/member-access";
import { MemberForm } from "@/components/member-form";
import { returnPath } from "@/lib/return-path";
export const metadata={title:"Complete your profile",robots:{index:false}};
export default async function CompleteProfile({searchParams}:{searchParams:Promise<{next?:string}>}){
  const session=await currentSession();
  const next=returnPath((await searchParams).next);
  if(session?.user.phone)redirect(next);
  const pending=session?null:await pendingEnrollment();
  if(!session && !pending)redirect("/login?profile=expired");
  return <div className="auth-wrap"><section className="auth-panel"><p className="sup">Member profile</p>
    <h1 className="display">Complete profile</h1><p>{session?.user.email ?? pending?.email}</p>
    <p>Confirm your full name and add a mobile number. Club admins can see these details when you send a query.</p>
    <MemberForm mode={session?"profile":"google"} name={session?.user.name ?? pending?.name ?? ""} next={next}/>
  </section></div>;
}

