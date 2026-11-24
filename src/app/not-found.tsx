import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap inner-page">
      <p className="sup">404</p>
      <h1 className="display">Page not found</h1>
      <Link className="button" href="/">
        Return home
      </Link>
    </div>
  );
}
