import Link from "next/link";
import { Mark } from "./mark";
const social=[
  ["Instagram","https://www.instagram.com/electronicsclubiitg/"],
  ["LinkedIn","https://www.linkedin.com/company/electronicsclubiitg/"],
  ["YouTube","https://www.youtube.com/channel/UClPWjFXGdtjKYjZvulnUViw"],
];
export function Footer(){
  return <footer className="club-footer"><div className="wrap">
    <div className="footer-grid"><div><Link className="brand" href="/"><Mark/><span>Electronics Club<small>IIT GUWAHATI</small></span></Link><p>Indian Institute of Technology Guwahati<br/>Assam, India</p></div>
      <nav aria-label="Footer navigation"><h2>Explore</h2><Link href="/events">Events</Link><Link href="/projects">Projects</Link><Link href="/team">Team</Link></nav>
      <nav aria-label="Member links"><h2>Members</h2><Link href="/queries">Club queries</Link><Link href="/account">My account</Link><Link href="/#announcements">Announcements</Link></nav>
      <nav aria-label="Club social media"><h2>Follow the club</h2>{social.map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer">{label}</a>)}</nav>
    </div><div className="footer-base"><span>Electronics Club · IIT Guwahati</span><a href="#top">Back to top ↑</a></div>
  </div></footer>;
}
