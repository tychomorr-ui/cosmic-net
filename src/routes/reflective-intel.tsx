import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BLADES, type Blade } from "@/data/blades";
import { NODES } from "@/data/nodes";
import { useProbeStatus } from "@/lib/probe-store";
import { loadEnvelopes, type Envelope } from "@/data/truth-ledger";

const BLADE = BLADES.find((b) => b.n === "03")!;

export const Route = createFileRoute("/reflective-intel")({
  head: () => ({
    meta: [
      { title: `${BLADE.name} · Blade ${BLADE.n}` },
      { name: "description", content: BLADE.tagline },
    ],
  }),
  component: ReflectiveIntel,
});

function ReflectiveIntel() {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  useEffect(() => {
    setEnvelopes(loadEnvelopes());
    const id = window.setInterval(() => setEnvelopes(loadEnvelopes()), 2000);
    return () => window.clearInterval(id);
  }, []);

  // Map route → most recent envelope (typically the STANCE_PENDING traversal log).
  const lastByRoute = new Map<string, Envelope>();
  for (const e of envelopes) {
    const m = e.next_move.match(/wire pre-condition for [^:]+: (.+)$/);
    const traverse = e.reflection.match(/blade (\d{2})/i);
    if (traverse) {
      // Find the blade by number
      const blade = BLADES.find((b) => b.n === traverse[1]);
      if (blade && !lastByRoute.has(blade.route)) lastByRoute.set(blade.route, e);
      void m;
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="space-y-3 border-b border-border pb-6">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
            OMNI-SAM AXIS · BLADE {BLADE.n}
          </div>
          <Link to="/" className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold">
            ← axis
          </Link>
        </div>
        <h1 className="font-display text-3xl tracking-[0.1em] text-foreground">
          <span className="text-gold">{BLADE.glyph}</span>&nbsp; {BLADE.name}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Per-blade mirror. Each row reflects the blade's declared status, its
          last operator traversal envelope from the Truth Ledger, and the
          current probe state of any node attached to it.
        </p>
      </header>

      <section>
        <table className="w-full border-collapse font-mono text-[0.72rem]">
          <thead>
            <tr className="border-b border-border text-left text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">blade</th>
              <th className="py-2 pr-3">status</th>
              <th className="py-2 pr-3">route</th>
              <th className="py-2 pr-3">last envelope</th>
              <th className="py-2">drift</th>
            </tr>
          </thead>
          <tbody>
            {BLADES.map((b) => {
              const env = lastByRoute.get(b.route);
              return (
                <tr key={b.n} className="border-b border-border/40">
                  <td className="py-2 pr-3 text-muted-foreground">{b.n}</td>
                  <td className="py-2 pr-3 text-foreground">
                    <Link to={b.route} className="hover:text-gold">
                      {b.glyph} {b.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3"><BladeStatusPill status={b.status} /></td>
                  <td className="py-2 pr-3 text-muted-foreground">{b.route}</td>
                  <td className="py-2 pr-3 text-foreground">
                    {env ? `${new Date(env.ts).toISOString().slice(11, 19)}Z · ${env.lane}` : "—"}
                  </td>
                  <td className="py-2 text-destructive">{env?.drift ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
          Node probe mirror
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NODES.map((n) => (
            <NodeMirror key={n.id} id={n.id} name={n.name} role={n.role} />
          ))}
        </div>
      </section>
    </div>
  );
}

function NodeMirror({ id, name, role }: { id: string; name: string; role: string }) {
  const s = useProbeStatus(id);
  const color =
    s.state === "measured" ? "text-gold border-gold/60"
    : s.state === "reachable" ? "text-foreground border-border"
    : s.state === "unreachable" ? "text-destructive border-destructive/60"
    : s.state === "probing" ? "text-muted-foreground border-border animate-pulse"
    : "text-muted-foreground border-border";
  return (
    <div className={`rounded border bg-card/40 p-3 ${color}`}>
      <div className="font-mono text-[0.7rem] uppercase tracking-[0.16em]">{name}</div>
      <div className="mt-1 text-[0.65rem] text-muted-foreground">{role}</div>
      <div className="mt-2 font-mono text-[0.68rem]">
        {s.state.toUpperCase()}
        {"detail" in s && s.detail ? ` · ${s.detail}` : ""}
      </div>
    </div>
  );
}

function BladeStatusPill({ status }: { status: Blade["status"] }) {
  const cls =
    status === "LIVE" ? "border-gold text-gold"
    : status === "AWAITING" ? "border-destructive/60 text-destructive"
    : "border-border text-muted-foreground";
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] ${cls}`}>
      {status}
    </span>
  );
}
