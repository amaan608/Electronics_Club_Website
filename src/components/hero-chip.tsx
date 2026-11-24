"use client";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CornerMarks } from "./mark";

// ---------------------------------------------------------------------------
// Geometry: a 32-pin QFP drawn in a 640 × 460 board, eight pins per side.
// ---------------------------------------------------------------------------
const W = 640, H = 460, CX = W / 2, CY = H / 2, BODY = 92, PIN = 16, PITCH = 19;
type Kind = "gpio" | "power" | "ground" | "clock" | "reset" | "adc" | "bus";
type Pin = { id: string; kind: Kind; note: string; rect: [number, number, number, number]; trace: string; length: number; via: [number, number] };

const sides = [
  { out: [0, -1], along: [1, 0], edge: H / 2 - 18, names: ["VCC", "GND", "XTAL1", "XTAL2", "RESET", "VREF", "AVCC", "GND"] },
  { out: [1, 0], along: [0, 1], edge: W / 2 - 18, names: ["PA0", "PA1", "PA2", "PA3", "PA4", "PA5", "PA6", "PA7"] },
  { out: [0, 1], along: [-1, 0], edge: H / 2 - 18, names: ["SCK", "MOSI", "MISO", "CS", "PWM0", "PWM1", "VCC", "GND"] },
  { out: [-1, 0], along: [0, -1], edge: W / 2 - 18, names: ["RX", "TX", "SCL", "SDA", "ADC3", "ADC2", "ADC1", "ADC0"] },
] as const;

function kindOf(name: string): [Kind, string] {
  if (name.startsWith("PA")) return ["gpio", "General-purpose I/O. Click to drive it high."];
  if (name === "VCC" || name === "AVCC" || name === "VREF") return ["power", "3.3 V supply rail."];
  if (name === "GND") return ["ground", "Ground reference, 0 V."];
  if (name.startsWith("XTAL")) return ["clock", "Crystal oscillator, 16 MHz."];
  if (name === "RESET") return ["reset", "Active-low reset. Clears every output."];
  if (name.startsWith("ADC")) return ["adc", "Analog input. Reads your cursor position as a voltage."];
  return ["bus", "Serial bus line. Click to send a packet."];
}

const PINS: Pin[] = sides.flatMap(({ out, along, edge, names }, side) =>
  names.map((name, i) => {
    const off = (i - 3.5) * PITCH;
    const at = (o: number, a: number): [number, number] => [CX + out[0] * o + along[0] * a, CY + out[1] * o + along[1] * a];
    const [bx, by] = at(BODY, off);
    const [tx, ty] = at(BODY + PIN, off);
    // Straight out, then a 45° fan, then straight to a via near the board edge.
    const fan = Math.abs(off) * 0.75;
    const p2 = at(BODY + PIN + 20, off);
    const p3 = at(BODY + PIN + 20 + fan, off + Math.sign(off) * fan);
    const end = at(edge, off + Math.sign(off) * fan);
    const length = 20 + fan * Math.SQRT2 + (edge - (BODY + PIN + 20 + fan));
    const horizontal = out[0] !== 0;
    const rect: Pin["rect"] = horizontal
      ? [Math.min(bx, tx), by - 4, PIN, 8]
      : [bx - 4, Math.min(by, ty), 8, PIN];
    const [kind, note] = kindOf(name);
    return {
      id: `${name}-${side}-${i}`,
      kind, note, rect, length, via: end,
      trace: `M${tx} ${ty}L${p2[0]} ${p2[1]}L${p3[0]} ${p3[1]}L${end[0]} ${end[1]}`,
    };
  }),
);
const GPIO = PINS.filter((p) => p.kind === "gpio");
const label = (p: Pin) => p.id.split("-")[0];

type Pulse = { key: number; pin: string; kind: "out" | "in" };

export function HeroChip() {
  const figure = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: -999, y: -999, inside: false });
  const [levels, setLevels] = useState<boolean[]>(() => GPIO.map((_, i) => i === 2 || i === 3 || i === 5));
  const [hover, setHover] = useState<Pin | null>(null);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [log, setLog] = useState<string[]>(["> ec-32 ready. hover a pin or click the chip"]);
  const [running, setRunning] = useState(false);
  const [clock, setClock] = useState(false);
  const [adc, setAdc] = useState(1.65);
  const pulseId = useRef(0);
  const program = useRef<number | null>(null);
  const reduced = useRef(false);

  const write = useCallback((line: string) => setLog((l) => [...l.slice(-2), line]), []);
  const pulse = useCallback((pin: string, kind: Pulse["kind"] = "out") => {
    if (reduced.current) return;
    const key = ++pulseId.current;
    setPulses((p) => [...p.slice(-24), { key, pin, kind }]);
  }, []);

  const stop = useCallback(() => {
    if (program.current !== null) window.clearInterval(program.current);
    program.current = null;
    setRunning(false);
  }, []);
  const toggle = useCallback((index: number) => {
    stop();
    const on = !levels[index];
    setLevels((l) => l.map((v, i) => (i === index ? on : v)));
    write(`> PA${index} = ${on ? "HIGH" : "LOW"}`);
    if (on) pulse(GPIO[index].id);
  }, [levels, pulse, stop, write]);

  // "Flash" a counter program: PORTA counts up in binary and every set bit fires a pulse.
  const run = useCallback(() => {
    if (program.current !== null) { stop(); write("> program halted"); return; }
    write("> flash counter.hex … verified, 412 bytes");
    setRunning(true);
    let n = 0;
    program.current = window.setInterval(() => {
      n = (n + 1) % 256;
      setLevels(GPIO.map((_, i) => ((n >> i) & 1) === 1));
      pulse(GPIO[Math.log2(n & -n)].id); // the bit that just switched on
      if (n === 32) { stop(); write("> PORTA counted to 0x20. Click the chip to run again"); }
    }, 180);
  }, [pulse, stop, write]);

  function press(p: Pin) {
    const name = label(p);
    switch (p.kind) {
      case "gpio": toggle(GPIO.indexOf(p)); return;
      case "reset": stop(); setLevels(GPIO.map(() => false)); setClock(false); write("> RESET pulled low. Outputs cleared"); pulse(p.id, "in"); return;
      case "clock": write(clock ? "> oscillator stopped" : "> 16 MHz oscillator running"); setClock(!clock); return;
      case "power": write(`> ${name} measures 3.30 V`); pulse(p.id, "in"); return;
      case "ground": write("> GND measures 0.00 V. Everything is relative"); return;
      case "adc": write(`> ${name} reads ${adc.toFixed(2)} V (${Math.round((adc / 3.3) * 4095)} of 4095)`); pulse(p.id, "in"); return;
      default: write(`> ${name} sent 0x${Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase()} on the bus`); pulse(p.id); return;
    }
  }

  // Clock pins pulse continuously while the oscillator runs.
  useEffect(() => {
    if (!clock) return;
    const xtal = PINS.filter((p) => p.kind === "clock");
    const t = window.setInterval(() => xtal.forEach((p) => pulse(p.id)), 420);
    return () => window.clearInterval(t);
  }, [clock, pulse]);
  useEffect(() => () => stop(), [stop]);

  // Dot field: dots brighten near the cursor and near powered vias; a few sparks drift upward.
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = canvas.current, box = figure.current;
    if (!el || !box) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    let frame = 0, visible = true, w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = el.clientWidth; h = el.clientHeight;
      el.width = w * dpr; el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const sparks = Array.from({ length: 22 }, () => ({ x: Math.random(), y: Math.random(), v: 0.0006 + Math.random() * 0.0012, a: Math.random() }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const { x: px, y: py, inside } = pointer.current;
      const gap = 10;
      for (let y = gap / 2; y < h; y += gap) {
        for (let x = gap / 2; x < w; x += gap) {
          let glow = 0;
          if (inside) {
            const d = Math.hypot(x - px, y - py);
            if (d < 120) glow = 1 - d / 120;
          }
          ctx.fillStyle = glow > 0 ? `rgba(255,135,76,${0.18 + glow * 0.7})` : "rgba(70,70,70,0.55)";
          const r = 0.7 + glow * 1.1;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
      }
      for (const s of sparks) {
        if (!reduced.current) { s.y -= s.v; s.a += 0.02; if (s.y < -0.02) { s.y = 1.02; s.x = Math.random(); } }
        ctx.fillStyle = `rgba(255,150,95,${0.25 + 0.35 * Math.abs(Math.sin(s.a))})`;
        ctx.fillRect(s.x * w - 1, s.y * h - 1, 2, 2);
      }
      if (visible && !reduced.current) frame = requestAnimationFrame(draw);
    };
    draw();
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible) draw();
    });
    io.observe(box);
    const ro = new ResizeObserver(() => { resize(); if (reduced.current) draw(); });
    ro.observe(el);
    const redraw = () => reduced.current && draw();
    box.addEventListener("pointermove", redraw);
    return () => { cancelAnimationFrame(frame); io.disconnect(); ro.disconnect(); box.removeEventListener("pointermove", redraw); };
  }, []);

  function move(e: ReactPointerEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const field = canvas.current?.getBoundingClientRect();
    if (field) pointer.current = { x: e.clientX - field.left, y: e.clientY - field.top, inside: true };
    const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
    if (!reduced.current) {
      e.currentTarget.style.setProperty("--tilt-x", `${(-ny * 7).toFixed(2)}deg`);
      e.currentTarget.style.setProperty("--tilt-y", `${(nx * 9).toFixed(2)}deg`);
    }
    setAdc(Math.max(0, Math.min(3.3, (1 - (e.clientY - r.top) / r.height) * 3.3)));
  }
  function leave(e: ReactPointerEvent<HTMLElement>) {
    pointer.current.inside = false;
    e.currentTarget.style.setProperty("--tilt-x", "0deg");
    e.currentTarget.style.setProperty("--tilt-y", "0deg");
    setHover(null);
  }

  const byte = levels.reduce((n, on, i) => n | (on ? 1 << i : 0), 0);
  const high = new Set(GPIO.filter((_, i) => levels[i]).map((p) => p.id));
  const pinById = new Map(PINS.map((p) => [p.id, p]));

  return (
    <figure className="processor hero-chip" ref={figure} onPointerMove={move} onPointerLeave={leave}>
      <CornerMarks />
      <div className="figure-meta">
        <span>EC-32 · QFP-32 / TOP</span>
        <span className={running || clock ? "chip-state live" : "chip-state"}>{running ? "RUNNING" : clock ? "CLOCKED" : "IDLE"}</span>
      </div>
      <div className="chip-field">
        <canvas ref={canvas} className="dot-field" aria-hidden="true" />
        <svg viewBox={`0 0 ${W} ${H}`} className="chip-svg" aria-hidden="true">
          <g className="traces">
            {PINS.map((p) => (
              <g key={p.id} className={`trace ${high.has(p.id) ? "high" : ""} ${hover?.id === p.id ? "hot" : ""} k-${p.kind}`}>
                <path d={p.trace} />
                <circle cx={p.via[0]} cy={p.via[1]} r={4} />
              </g>
            ))}
            {pulses.map((pl) => {
              const p = pinById.get(pl.pin);
              if (!p) return null;
              return (
                <path key={pl.key} d={p.trace} className={`pulse ${pl.kind}`} style={{ ["--len" as string]: p.length }}
                  onAnimationEnd={() => setPulses((all) => all.filter((x) => x.key !== pl.key))} />
              );
            })}
          </g>
          <g className="chip-body" onClick={run} role="presentation">
            <rect x={CX - BODY} y={CY - BODY} width={BODY * 2} height={BODY * 2} rx={6} />
            <rect x={CX - BODY + 10} y={CY - BODY + 10} width={BODY * 2 - 20} height={BODY * 2 - 20} rx={3} className="die" />
            <circle cx={CX - BODY + 20} cy={CY - BODY + 20} r={4} className="pin-one" />
            <text x={CX} y={CY - 4} className="chip-name">EC-32</text>
            <text x={CX} y={CY + 22} className="chip-sub">IITG · 0x{byte.toString(16).padStart(2, "0").toUpperCase()}</text>
            <text x={CX} y={CY + 52} className="chip-hint">{running ? "click to halt" : "click to flash"}</text>
          </g>
          <g className="pins">
            {PINS.map((p) => (
              // The pin and its whole trace respond, so small screens still have a usable target.
              <g key={p.id} className="pin-hit" onPointerEnter={() => setHover(p)} onClick={() => press(p)}>
                <path d={p.trace} className="hit" />
                <circle cx={p.via[0]} cy={p.via[1]} r={11} className="hit" />
                <rect x={p.rect[0] - 3} y={p.rect[1] - 3} width={p.rect[2] + 6} height={p.rect[3] + 6} className="hit" />
                <rect x={p.rect[0]} y={p.rect[1]} width={p.rect[2]} height={p.rect[3]}
                  className={`pin k-${p.kind} ${high.has(p.id) ? "high" : ""} ${hover?.id === p.id ? "hot" : ""}`} />
              </g>
            ))}
          </g>
        </svg>
        <div className="chip-readout" aria-live="polite">
          {log.map((line, i) => <span key={i + line}>{line}</span>)}
        </div>
        {hover && (
          <div className="pin-tip" role="status">
            <strong>{label(hover)}</strong>
            <span>{hover.kind === "adc" ? `${adc.toFixed(2)} V · ` : ""}{hover.note}</span>
          </div>
        )}
      </div>
      <figcaption className="led-bank">
        <span className="bank-label">PORTA</span>
        <span className="leds" role="group" aria-label="PORTA outputs">
          {GPIO.map((_, i) => GPIO.length - 1 - i).map((i) => (
            <button key={i} type="button" className={levels[i] ? "led on" : "led"} aria-pressed={levels[i]}
              aria-label={`PA${i}`} title={`PA${i}`} onClick={() => toggle(i)}>
              <i />
              <small>{i}</small>
            </button>
          ))}
        </span>
        <code className="byte">0b{byte.toString(2).padStart(8, "0")}</code>
        <button type="button" className="run-button" onClick={run}>{running ? "Halt" : "Run demo"}</button>
      </figcaption>
    </figure>
  );
}
