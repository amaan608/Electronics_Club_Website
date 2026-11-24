import Link from "next/link";
export function PageHeading({
  title,
  description,
  section,
}: {
  title: string;
  description: string;
  section: string;
}) {
  return (
    <div className="page-heading">
      <div className="crumb">
        <Link href="/">Home</Link>
        <span>/</span>
        {section}
      </div>
      <h1 className="display">{title}</h1>
      <p>{description}</p>
    </div>
  );
}
