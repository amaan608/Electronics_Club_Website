import { notFound } from "next/navigation";
import Link from "next/link";
import { ClubImage, ProjectPlaceholder } from "@/components/club-image";
import { eventSlug } from "@/lib/community-models";
import { publishedProject } from "@/lib/showcase";

async function load(params: PageProps<"/projects/[slug]">["params"]) {
  const { slug } = await params;
  return eventSlug.test(slug) ? publishedProject(slug) : null;
}
export async function generateMetadata({ params }: PageProps<"/projects/[slug]">) {
  const project = await load(params).catch(() => null);
  return { title: project?.title ?? "Project", description: project?.description };
}
export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const p = await load(params);
  if (!p) notFound();
  return (
    <div className="wrap inner-page">
      <div className="crumb">
        <Link href="/projects">Projects</Link>
        <span>/</span>
        {p.title}
      </div>
      <div className="detail-grid">
        <div>
          {p.category && <p className="sup">{p.category}</p>}
          <h1 className="display">{p.title}</h1>
          <p className="lede">{p.description}</p>
        </div>
        <div className="project-image">
          {p.image ? (
            <ClubImage src={p.image} alt={`Photo of the ${p.title.toLowerCase()} project`} width={720} height={478} priority />
          ) : (
            <ProjectPlaceholder category={p.category} title={p.title} />
          )}
        </div>
      </div>
      {(p.detail || p.hardware || p.stage) && <>
        <h2 className="block-title">Build notes</h2>
        <dl className="datasheet">
          {p.detail && <div><dt>Operation</dt><dd className="prose">{p.detail}</dd></div>}
          {p.hardware && <div><dt>Hardware</dt><dd>{p.hardware}</dd></div>}
          {p.stage && <div><dt>Stage</dt><dd>{p.stage}</dd></div>}
        </dl>
      </>}
    </div>
  );
}
