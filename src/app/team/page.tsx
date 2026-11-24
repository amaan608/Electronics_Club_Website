import { PageHeading } from "@/components/page-heading";
import { ClubImage, initials } from "@/components/club-image";
import { CornerMarks } from "@/components/mark";
import { publishedTeam, teamPageSettings } from "@/lib/showcase";

export const metadata = { title: "Team" };
type Member = Awaited<ReturnType<typeof publishedTeam>>[number];

function MemberCard({ member, priority }: { member: Member; priority: boolean }) {
  return (
    <article className="catalog-card team-card">
      <div className="portrait">
        {member.image ? (
          <ClubImage src={member.image} alt={`Portrait of ${member.name}`} width={160} height={160} crop="c_fill,g_face" priority={priority} />
        ) : (
          <span className="portrait-initials" aria-hidden="true">{initials(member.name)}</span>
        )}
      </div>
      <div className="catalog-copy">
        <p className="sup">{member.role}</p>
        <h2>{member.name}</h2>
        {member.bio && <p>{member.bio}</p>}
      </div>
    </article>
  );
}
export default async function Team() {
  const [team, settings] = await Promise.all([
    publishedTeam().catch(() => null),
    teamPageSettings().catch(() => null),
  ]);
  const caption = settings?.groupCaption || "The Electronics Club team";
  // Word joiners keep "2026–27" on one line.
  const tenure = team?.find((m) => m.tenure)?.tenure?.replace(/[–-]/g, "⁠–⁠");
  return (
    <div className="wrap inner-page">
      <PageHeading
        section="Team"
        title="Our team"
        description={`The heads who run the club’s workshops, projects and events${tenure ? ` for the ${tenure} tenure` : ""}.`}
      />
      {settings?.groupPhoto && (
        <figure className="group-photo">
          <CornerMarks />
          {/* c_limit keeps the whole group in frame; Cloudinary only scales it down. */}
          <ClubImage src={settings.groupPhoto} alt={caption} width={1600} height={900} crop="c_limit" priority />
          <figcaption>{caption}</figcaption>
        </figure>
      )}
      {team === null ? (
        <p className="events-status" role="status">The team list is temporarily unavailable.</p>
      ) : team.length ? (
        <div className="catalog team-grid">
          {team.map((member, i) => (
            <MemberCard key={String(member._id)} member={member} priority={i < 4} />
          ))}
        </div>
      ) : (
        <p className="events-status">The team will be announced soon.</p>
      )}
    </div>
  );
}
