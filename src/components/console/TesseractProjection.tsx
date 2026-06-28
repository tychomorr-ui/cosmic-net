import { useEffect, useRef } from "react";

// Geometric projection of a 4-cube (tesseract). No metrics, no fake telemetry —
// just the canonical projection rotated slowly through a 4D plane.
// Counts (vertices/edges/faces/cells) are mathematical truths of the 4-cube.

const VERTICES_4D: Array<[number, number, number, number]> = (() => {
  const out: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 16; i++) {
    out.push([
      (i & 1) ? 1 : -1,
      (i & 2) ? 1 : -1,
      (i & 4) ? 1 : -1,
      (i & 8) ? 1 : -1,
    ]);
  }
  return out;
})();

const EDGES: Array<[number, number]> = (() => {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      // edge iff hamming distance == 1
      const x = i ^ j;
      if (x && (x & (x - 1)) === 0) out.push([i, j]);
    }
  }
  return out;
})();

export function TesseractProjection({ size = 360 }: { size?: number }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      tRef.current += dt * 0.25;
      const svg = svgRef.current;
      if (svg) draw(svg, tRef.current, size);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        height={size}
        className="block"
        aria-label="Tesseract projection"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-between px-3 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
        <span>vertices <span className="text-foreground">16</span></span>
        <span>edges <span className="text-foreground">32</span></span>
        <span>faces <span className="text-foreground">24</span></span>
        <span>cells <span className="text-foreground">8</span></span>
      </div>
    </div>
  );
}

function draw(svg: SVGSVGElement, t: number, size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const scale = size * 0.18;

  // rotate in XW and YZ planes
  const c1 = Math.cos(t), s1 = Math.sin(t);
  const c2 = Math.cos(t * 0.7), s2 = Math.sin(t * 0.7);

  const projected = VERTICES_4D.map(([x, y, z, w]) => {
    // XW rotation
    const x1 = x * c1 - w * s1;
    const w1 = x * s1 + w * c1;
    // YZ rotation
    const y1 = y * c2 - z * s2;
    const z1 = y * s2 + z * c2;
    // 4D -> 3D perspective on w
    const k4 = 1 / (2.4 - w1);
    const x3 = x1 * k4;
    const y3 = y1 * k4;
    const z3 = z1 * k4;
    // 3D -> 2D perspective on z
    const k3 = 1 / (2.4 - z3);
    return {
      x: cx + x3 * k3 * scale * 2.2,
      y: cy + y3 * k3 * scale * 2.2,
      depth: (z3 + w1) * 0.5,
    };
  });

  const ns = "http://www.w3.org/2000/svg";
  // clear
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // background ring
  const ring = document.createElementNS(ns, "circle");
  ring.setAttribute("cx", String(cx));
  ring.setAttribute("cy", String(cy));
  ring.setAttribute("r", String(size * 0.46));
  ring.setAttribute("fill", "none");
  ring.setAttribute("stroke", "oklch(0.28 0.02 270)");
  ring.setAttribute("stroke-width", "1");
  svg.appendChild(ring);

  for (const [a, b] of EDGES) {
    const pa = projected[a];
    const pb = projected[b];
    const d = (pa.depth + pb.depth) * 0.5;
    const op = 0.25 + Math.max(0, Math.min(1, (d + 1) / 2)) * 0.65;
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", pa.x.toFixed(2));
    line.setAttribute("y1", pa.y.toFixed(2));
    line.setAttribute("x2", pb.x.toFixed(2));
    line.setAttribute("y2", pb.y.toFixed(2));
    line.setAttribute("stroke", "oklch(0.78 0.14 85)");
    line.setAttribute("stroke-opacity", op.toFixed(3));
    line.setAttribute("stroke-width", "0.75");
    svg.appendChild(line);
  }

  for (const p of projected) {
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", p.x.toFixed(2));
    c.setAttribute("cy", p.y.toFixed(2));
    c.setAttribute("r", "2");
    c.setAttribute("fill", "oklch(0.92 0.01 90)");
    c.setAttribute("fill-opacity", String(0.5 + Math.max(0, Math.min(1, (p.depth + 1) / 2)) * 0.5));
    svg.appendChild(c);
  }
}
