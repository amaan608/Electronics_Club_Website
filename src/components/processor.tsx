import Image from "next/image";
import { CornerMarks } from "./mark";

export function Processor() {
  return (
    <figure className="processor">
      <CornerMarks />
      <div className="figure-meta">
        <span>HARDWARE VIEW</span>
        <span>QFP / TOP</span>
      </div>
      <div className="chip-field">
        <div className="crosshair horizontal" />
        <div className="crosshair vertical" />
        <Image
          src="/art/processor.png"
          width={755}
          height={740}
          alt="Dot-matrix illustration of a square microcontroller with pins on all four sides"
          priority
        />
        <span className="callout power">VCC</span>
        <span className="callout ground">GND</span>
      </div>
      <figcaption>
        <span>MICROCONTROLLER</span>
        <span className="signal-bars" aria-hidden="true">
          ▁▂▃▅▇▅▃▂▁
        </span>
      </figcaption>
    </figure>
  );
}
