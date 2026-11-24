"use client";
import { useEffect, useRef, useState } from "react";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const GLYPHS = "01<>/#=+*%$&ABCDEFX";

// Decodes text from random glyphs on load, like a display settling. The final text is server-rendered.
export function ScrambleText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (reducedMotion()) return;
    let frame = 0, start = 0;
    const total = 26 + text.length * 2;
    const tick = (time: number) => {
      if (!start) start = time;
      const step = Math.floor((time - start - delay) / 28);
      if (step < 0) { frame = requestAnimationFrame(tick); return; }
      setShown(text.split("").map((ch, i) => (ch === " " || step > 10 + i * 2 ? ch : GLYPHS[(i * 7 + step * 3) % GLYPHS.length])).join(""));
      if (step < total) frame = requestAnimationFrame(tick);
      else setShown(text);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, delay]);
  return <span aria-label={text}><span aria-hidden="true">{shown}</span></span>;
}

// Adds .is-in to [data-reveal] elements as they scroll into view. Content stays visible without JavaScript.
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion() || !("IntersectionObserver" in window)) return;
    root.classList.add("reveal-ready");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => { io.disconnect(); root.classList.remove("reveal-ready"); };
  }, []);
  return null;
}

// Counts up to a value the first time it becomes visible.
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || value === 0) return;
    // The real value stays on screen until the count starts, so it is never stuck at zero.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    let frame = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setN(0);
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 1100);
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);
  return <span ref={ref}>{n}</span>;
}
