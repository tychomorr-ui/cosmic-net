import { useEffect, useRef } from "react";

// Sovereign Alcheorithmic Mist — particles drift through a 4D-projected lattice,
// constellations form between near neighbors. The Kether Gate substrate.
export function NebulaBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 90;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00018,
      vy: (Math.random() - 0.5) * 0.00018,
      r: Math.random() * 1.6 + 0.4,
      phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;

    const tick = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);

      const g1 = ctx.createRadialGradient(w * 0.2, h * 0.3, 0, w * 0.2, h * 0.3, Math.max(w, h) * 0.55);
      g1.addColorStop(0, "rgba(57, 255, 136, 0.10)");
      g1.addColorStop(1, "rgba(57, 255, 136, 0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(w * 0.85, h * 0.75, 0, w * 0.85, h * 0.75, Math.max(w, h) * 0.5);
      g2.addColorStop(0, "rgba(95, 209, 255, 0.06)");
      g2.addColorStop(1, "rgba(95, 209, 255, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;
      }

      ctx.lineWidth = 0.5;
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = (particles[i].x - particles[j].x) * w;
          const dy = (particles[i].y - particles[j].y) * h;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 140) {
            const a = (1 - d / 140) * 0.22;
            ctx.strokeStyle = `rgba(57, 255, 136, ${a})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x * w, particles[i].y * h);
            ctx.lineTo(particles[j].x * w, particles[j].y * h);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        const pulse = 0.6 + 0.4 * Math.sin(t * 0.02 + p.phase);
        ctx.fillStyle = `rgba(57, 255, 136, ${0.45 * pulse})`;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none opacity-70"
    />
  );
}
