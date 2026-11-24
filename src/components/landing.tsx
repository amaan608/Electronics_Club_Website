import Link from "next/link";
import type { ReactNode } from "react";
import { CountUp } from "./motion";
import { ClubImage, initials } from "./club-image";

const topics = ["Circuits", "Embedded systems", "Signal processing", "IoT", "PCB design", "Robotics", "Analog", "Digital logic", "Workshops", "Hackathons"];

export function Ticker() {
  const row = topics.map((t) => <span key={t}>{t}<i aria-hidden="true">◆</i></span>);
  return (
    <div className="ticker" aria-label={topics.join(", ")}>
      <div className="ticker-track" aria-hidden="true">
        <div>{row}</div>
        <div>{row}</div>
      </div>
    </div>
  );
}

export function Stats({ items }: { items: { label: string; value: number; href?: string }[] }) {
  return (
    <section className="stats-band" aria-label="The club in numbers" data-reveal>
      {items.map((s) => {
        const body = <>
          <strong><CountUp value={s.value} /></strong>
          <span>{s.label}</span>
        </>;
        return s.href ? <Link key={s.label} href={s.href}>{body}</Link> : <div key={s.label}>{body}</div>;
      })}
    </section>
  );
}

// Each domain draws its own signal: sine, square, packets and a spectrum.
const waves: Record<string, ReactNode> = {
  analog: <path d="M0 30 Q 12.5 0 25 30 T 50 30 T 75 30 T 100 30 T 125 30 T 150 30 T 175 30 T 200 30" />,
  digital: <path d="M0 46 H18 V14 H43 V46 H68 V14 H93 V46 H118 V14 H143 V46 H168 V14 H193 V46 H200" />,
  embedded: <path d="M0 30 H24 V12 H30 V48 H36 V12 H42 V30 H84 V12 H90 V48 H96 V30 H138 V12 H144 V48 H150 V12 H156 V30 H200" />,
  signal: <g>{[10, 22, 34, 18, 44, 28, 40, 16, 30, 12, 24, 8].map((h, i) => <rect key={i} x={6 + i * 16} y={54 - h} width={9} height={h} />)}</g>,
};
const domains = [
  { key: "analog", name: "Analog", text: "Op-amps, filters and power stages: the physics before the ones and zeros." },
  { key: "digital", name: "Digital", text: "Logic, FPGAs and timing: building machines out of edges and states." },
  { key: "embedded", name: "Embedded & IoT", text: "Microcontrollers, firmware and sensors talking to the network." },
  { key: "signal", name: "Signal processing", text: "Sampling, transforms and filters that turn noise into information." },
];
export function Domains() {
  return (
    <section className="home-section domains" aria-labelledby="domains-title">
      <div className="section-head" data-reveal>
        <div>
          <p className="sup"><span className="slash">//</span> WHAT WE BUILD</p>
          <h2 id="domains-title">Four domains, one workbench</h2>
        </div>
        <Link className="text-link" href="/projects">See the projects</Link>
      </div>
      <div className="domain-grid">
        {domains.map((d, i) => (
          <article key={d.key} className="domain-card" data-reveal style={{ transitionDelay: `${i * 80}ms` }} tabIndex={0}>
            <svg viewBox="0 0 200 60" className={`wave w-${d.key}`} aria-hidden="true" preserveAspectRatio="none">{waves[d.key]}</svg>
            <span className="domain-index">0{i + 1}</span>
            <h3>{d.name}</h3>
            <p>{d.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const loop = [
  { word: "Learn", text: "Workshops and courses that start from your first LED and go all the way to RTOS." },
  { word: "Build", text: "Club projects with real hardware, real deadlines and seniors who have broken it before." },
  { word: "Compete", text: "Hackathons and national contests like Embedded 101, in teams that ship." },
];
export function Loop() {
  return (
    <section className="home-section loop" aria-labelledby="loop-title">
      <p className="sup" data-reveal><span className="slash">//</span> HOW IT WORKS</p>
      <h2 id="loop-title" className="sr-only">Learn, build, compete</h2>
      <ol>
        {loop.map((step, i) => (
          <li key={step.word} data-reveal style={{ transitionDelay: `${i * 120}ms` }}>
            <span className="loop-n">0{i + 1}</span>
            <strong className="display">{step.word}</strong>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

type Head = { _id: unknown; name: string; role: string; image?: string | null };
export function TeamStrip({ team }: { team: Head[] }) {
  if (!team.length) return null;
  return (
    <section className="home-section team-strip" aria-labelledby="heads-title">
      <div className="section-head" data-reveal>
        <div>
          <p className="sup"><span className="slash">//</span> THE PEOPLE</p>
          <h2 id="heads-title">Meet the heads</h2>
        </div>
        <Link className="text-link" href="/team">Full team</Link>
      </div>
      <ul className="heads" data-reveal>
        {team.map((m) => (
          <li key={String(m._id)}>
            <Link href="/team" className="head">
              <span className="head-photo">
                {m.image ? <ClubImage src={m.image} alt="" width={88} height={88} crop="c_fill,g_face" /> : initials(m.name)}
              </span>
              <span className="head-name">{m.name}</span>
              <span className="head-role">{m.role}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
