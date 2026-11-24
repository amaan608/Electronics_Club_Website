import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/member-access";
import { MemberQuery } from "@/lib/community-models";
import { MemberForm } from "@/components/member-form";
import { PageHeading } from "@/components/page-heading";
export const metadata={title:"Member queries",robots:{index:false}};
export default async function Queries(){
  const session=await currentSession();
  if(session && !session.user.phone)redirect("/complete-profile?next=queries");
  const queries=session ? await MemberQuery.find({userId:session.user.id}).sort({createdAt:-1}).select("subject message reply repliedAt createdAt").lean() : [];
  return <div className="wrap inner-page"><PageHeading title="Queries" section="Queries" description="Ask the Electronics Club team a question and read their reply here."/>
    {session?<div className="query-grid"><section className="surface"><h2>Write a query</h2><p>Your name, email and mobile number are shared with club admins.</p><MemberForm mode="query"/></section>
    <section className="surface"><h2>Your queries</h2>{!queries.length && <p>Your submitted questions will appear here.</p>}{queries.map(q=><article className="query-item" key={String(q._id)}><span className="sup">{q.reply?"Answered":"Awaiting reply"}</span><h3>{q.subject}</h3><p>{q.message}</p>{q.reply && <blockquote><strong>Club reply</strong><p>{q.reply}</p></blockquote>}</article>)}</section></div>:
    <section className="surface guest-query"><h2>Member queries</h2><p>Sign in to send a private question to the club and track its reply.</p><Link className="button primary" href="/login?next=queries">Sign in to ask</Link></section>}
  </div>;
}

