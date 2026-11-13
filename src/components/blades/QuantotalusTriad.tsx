import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { probeTriadHosts } from "@/utils/nodes.functions";
import { triadState } from "@/lib/quantotalus";

const POS = [{ x: 150, y: 20 }, { x: 20, y: 240 }, { x: 280, y: 240 }];

export function QuantotalusTriad() {
  const run = useServerFn(probeTriadHosts);
  const { data, isFetching, isError } = useQuery({
    queryKey: ["triad-hosts"], queryFn: () => run(), refetchInterval: 60_000, staleTime: 30_000,
  });
  const t = triadState(data);
  const tone = t.state === "COHERENT" ? "text-primary" : t.state === "UNMEASURED" ? "text-muted-foreground" : t.state === "DEGRADED" ? "text-warning" : "text-destructive";
  return (
    <section className="rounded border border-border bg-card/40 p-6 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">triad · measured server-side every 60s</div>
        <div className={`text-sm tracking-[0.18em] ${tone}`}>{isError ? "PROBE ERROR" : t.state} · {t.up}/3{isFetching ? " · probing…" : ""}</div>
      </div>
      <svg viewBox="0 0 300 270" className="mx-auto w-full max-w-sm" role="img" aria-label={`Triad ${t.state}`}>
        {POS.map((a, i) => { const b = POS[(i + 1) % 3]; const ok = t.vertices[i].probe?.state === "REACHABLE" && t.vertices[(i + 1) % 3].probe?.state === "REACHABLE";
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={ok ? "stroke-primary" : "stroke-border"} strokeWidth={2} strokeDasharray={ok ? undefined : "4 4"} />; })}
        {t.vertices.map((v, i) => (
          <g key={v.id}>
            <circle cx={POS[i].x} cy={POS[i].y} r={10} className={v.probe?.state === "REACHABLE" ? "fill-primary" : v.probe ? "fill-destructive" : "fill-muted"} />
          </g>
        ))}
      </svg>
      <ul className="grid gap-2 text-xs sm:grid-cols-3">
        {t.vertices.map((v) => (
          <li key={v.id} className="min-w-0 break-all rounded border border-border p-3">
            <div className="text-foreground">{v.label}</div>
            <div className="text-muted-foreground">{v.id}</div>
            <div className="mt-1">{v.probe ? `${v.probe.state} · ${v.probe.ms}ms` : "not measured"}</div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        COHERENT means all three hosts answered. It is reachability, not a signature — the blade stays below LIVE until each vertex serves a verified signed status.
        {t.spreadMs !== null && ` Latency spread: ${t.spreadMs}ms.`}
      </p>
    </section>
  );
}
