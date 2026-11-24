import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { ClubImage } from "@/components/club-image";
import { publishedProjects } from "@/lib/showcase";

export const metadata = { title: "Projects" };
export default async function Projects() {
  const projects = await publishedProjects().catch(() => null);
  return (
    <div className="wrap inner-page">
      <PageHeading
        section="Projects"
        title="Projects"
        description="Hardware builds from the club’s workbench, from signal processing to motion control."
      />
      {projects === null ? (
        <p className="events-status" role="status">Projects are temporarily unavailable.</p>
      ) : !projects.length ? (
        <p className="events-status">Projects will appear here soon.</p>
      ) : (
        <div className="catalog">
          {projects.map((p, i) => (
            <article className="catalog-card" key={p.slug}>
              <div className="project-image">
                {p.image ? (
                  <ClubImage src={p.image} width={720} height={478} alt={`Photo of the ${p.title.toLowerCase()} project`} priority={i < 3} />
                ) : (
                  <span className="portrait-initials" aria-hidden="true">{p.title.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="catalog-copy">
                {p.category && <p className="sup">{p.category}</p>}
                <h2>{p.title}</h2>
                <p>{p.description}</p>
                <Link className="text-link" href={`/projects/${p.slug}`}>
                  Project details
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
