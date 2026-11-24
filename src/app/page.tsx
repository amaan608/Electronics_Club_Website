import Link from "next/link";
import { HeroChip } from "@/components/hero-chip";
import { EventCard } from "@/components/event-card";
import { Announcements } from "@/components/announcements";
import { Domains, Loop, Stats, TeamStrip, Ticker } from "@/components/landing";
import { RevealObserver, ScrambleText } from "@/components/motion";
import { database } from "@/lib/db";
import { ClubEvent, Project, TeamMember } from "@/lib/community-models";

async function homeData() {
  if (!process.env.MONGODB_URI) return null;
  await database();
  const [team, projects, events] = await Promise.all([
    TeamMember.find({ published: true }).sort({ order: 1, createdAt: 1 }).select("name role image").lean(),
    Project.countDocuments({ published: true }),
    ClubEvent.countDocuments({ published: true }),
  ]);
  return { team, projects, events };
}

export default async function Home() {
  const data = await homeData().catch(() => null);
  return (
    <div className="wrap">
      <RevealObserver />
      <section className="hero">
        <div className="hero-copy">
          <p className="sup">
            <span className="square" />
            STUDENT TECHNICAL CLUB · IIT GUWAHATI
          </p>
          <h1 className="display">
            <ScrambleText text="Electronics" />
            <br />
            <ScrambleText text="Club" delay={180} />
            <span className="cursor" aria-hidden="true" />
          </h1>
          <p className="hero-description">
            A community of builders at IIT Guwahati exploring circuits, embedded
            systems, and the hardware that brings ideas to life.
          </p>
          <div className="actions">
            <Link href="/events/embedded-101/register" className="button primary">
              Register for Embedded 101
            </Link>
            <Link href="/projects" className="button">
              Our projects
            </Link>
          </div>
          <p className="hero-hint" aria-hidden="true">
            <span>↗</span> The chip is live. Point at a pin, tap it, or click the chip to flash firmware.
          </p>
        </div>
        <HeroChip />
      </section>
      <Ticker />
      <div className="club-desk">
        <section className="home-section featured" data-reveal>
          <div className="section-head">
            <div>
              <p className="sup">
                <span className="slash">//</span> CLUB ACTIVITIES
              </p>
              <h2>Featured event</h2>
            </div>
            <Link className="text-link" href="/events">
              All events
            </Link>
          </div>
          <EventCard />
        </section>
        <Announcements />
      </div>
      {data && (
        <Stats
          items={[
            { label: "Heads this tenure", value: data.team.length, href: "/team" },
            { label: "Domains", value: 4 },
            { label: "Projects on the bench", value: data.projects, href: "/projects" },
            { label: "Events", value: data.events, href: "/events" },
          ]}
        />
      )}
      <Domains />
      <Loop />
      {data && <TeamStrip team={data.team} />}
      <section className="home-section discover" data-reveal>
        <div>
          <p className="sup">
            <span className="slash">//</span> THE CLUB
          </p>
          <h2>Inside the club</h2>
        </div>
        <Link href="/projects">
          <strong>Project archive</strong>
          <span>Explore the circuits and systems on our workbench.</span>
        </Link>
        <Link href="/team">
          <strong>Meet the team</strong>
          <span>Get to know the people behind the club.</span>
        </Link>
        <Link href="/queries"><strong>Ask the club</strong><span>Send a private query and read the team’s reply.</span></Link>
      </section>
    </div>
  );
}
