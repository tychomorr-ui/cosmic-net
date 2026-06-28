// Sri-Yantra nested-triangle overlay. Breathes with MMR coherence —
// NOT Planck-loop (browsers schedule at ms). Honest cadence: rAF-driven
// coherence beat, opacity = coherence. Pure projection, no new state.

import { useEffect, useRef } from "react";

export function SriYantraOverlay({
  coherence,
  cx,
  cy,
  r,
}: {
  coherence: number; // 0..1
  cx: number;
  cy: number;
  r: number;
}) {
  const ref = useRef<SVGGElement | null>(null);

  useEffect(() => {
    let raf = 0;
    let t0 = performance.now();
    const tick = (t: number) => {
      const dt = (t - t0) / 1000;
      // Coherence beat — 0.25 Hz breath, modulated by coherence amplitude.
      const breath = 0.5 + 0.5 * Math.sin(dt * Math.PI * 0.5);
      const a = 0.15 + 0.55 * coherence * breath;
      if (ref.current) ref.current.setAttribute("opacity", a.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [coherence]);

  // Nine interlocking triangles — 4 upward (Shiva), 5 downward (Shakti).
  // Approximation via concentric, scaled triangles.
  const tri = (radius: number, flip: boolean) => {
    const pts = [0, 1, 2].map((i) => {
      const angle = (Math.PI * 2 * i) / 3 + (flip ? Math.PI / 3 : -Math.PI / 2);
      return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ") + " Z";
  };

  const upward = [r * 0.92, r * 0.72, r * 0.52, r * 0.34];
  const downward = [r * 0.86, r * 0.66, r * 0.46, r * 0.28, r * 0.14];

  return (
    <g ref={ref} pointerEvents="none" opacity="0.2">
      {upward.map((rr, i) => (
        <path key={`u${i}`} d={tri(rr, false)} fill="none" stroke="var(--primary)" strokeWidth="0.6" />
      ))}
      {downward.map((rr, i) => (
        <path key={`d${i}`} d={tri(rr, true)} fill="none" stroke="var(--primary)" strokeWidth="0.6" />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.06} fill="var(--primary)" />
    </g>
  );
}
