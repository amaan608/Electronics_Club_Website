import Image from "next/image";
import Link from "next/link";
import { CornerMarks } from "./mark";

export function EventArtwork() {
  return (
    <div
      className="event-art"
      role="img"
      aria-label="Embedded 101, national edition. LED poster lettering with a development board."
    >
      <CornerMarks />
      <div className="event-art-head">
        <span>EMBEDDED SYSTEMS</span>
        <span>NATIONAL EDITION</span>
      </div>
      <Image
        src="/art/embedded-wordmark.png"
        width={1280}
        height={470}
        alt=""
        className="event-wordmark"
      />
      <Image
        src="/art/development-board.png"
        width={538}
        height={382}
        alt=""
        className="board"
      />
      <span className="art-baseline">EXPANDING THE ADDRESS SPACE.</span>
    </div>
  );
}
export function EventCard() {
  return (
    <article className="event-card">
      <EventArtwork />
      <div className="event-copy">
        <p className="sup">
          <span className="square" />
          COURSE + COMPETITION
        </p>
        <h3>Embedded 101</h3>
        <p>
          Explore embedded systems from your first simulation to a working
          hardware build.
        </p>
        <div className="tags">
          <span>Online</span>
          <span>Teams of three</span>
          <span>Free entry</span>
        </div>
        <div className="card-actions">
          <Link className="button primary" href="/events/embedded-101/register">
            Register now
          </Link>
          <Link className="text-link" href="/events/embedded-101">
            View event details
          </Link>
        </div>
      </div>
    </article>
  );
}
