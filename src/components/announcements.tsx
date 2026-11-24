import { Announcement } from "@/lib/community-models";
import { database } from "@/lib/db";

async function published(){
  if(!process.env.MONGODB_URI)return [];
  await database();
  return Announcement.find({published:true}).sort({createdAt:-1,_id:-1}).select("title message createdAt").lean();
}
export async function Announcements(){
  const items=await published().catch(()=>null);
  return <section id="announcements" className="notice-board" aria-labelledby="notice-title">
    <div className="notice-heading"><span className="notice-icon" aria-hidden="true">≋</span><h2 id="notice-title">Announcements</h2></div>
    {!items ? <p role="status">Updates are temporarily unavailable.</p> : items.length ? <div className="notice-list">{items.map(item=><article key={String(item._id)}><time dateTime={item.createdAt.toISOString()}>{item.createdAt.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"})}</time><h3>{item.title}</h3><p>{item.message}</p></article>)}</div> : <div className="notice-empty"><h3>No announcements yet</h3><p>Workshop dates and updates from the club will appear here.</p></div>}
  </section>;
}

