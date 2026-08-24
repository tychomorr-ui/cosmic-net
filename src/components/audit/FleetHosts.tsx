import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { NODES } from "@/data/nodes";
import { probeNodeHosts } from "@/utils/nodes.functions";

export function FleetHosts() {
  const run = useServerFn(probeNodeHosts);
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["node-hosts"],
    queryFn: () => run(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  const byId = new Map((data ?? []).map((p) => [p.id, p]));
  const hosts = NODES.filter((n) => n.host);
  // Count only hosts currently in the roster, so a stale probe id can never
  // inflate the reachable tally.
  const up = hosts.filter((n) => byId.get(n.id)?.state === "REACHABLE").length;

  return (
    <section className="border border-border bg-card/30 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
            Operator fleet · live host reachability
          </div>
          <h3 className="mt-2 font-display text-lg text-foreground">
            Five operator-owned instances, probed server-side
          </h3>
        </div>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          {isLoading ? "probing…" : `${up} / ${hosts.length} reachable`}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Each host is contacted directly from the server every 60 seconds — no
        opaque browser requests, no cached claims. REACHABLE means the machine
        answered. LIVE still requires an ARCHANGEL/v0 signed status.
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {hosts.map((n) => {
          const p = byId.get(n.id);
          const tone =
            !p || isLoading
              ? "border-border text-muted-foreground"
              : p.state === "REACHABLE"
                ? "border-[color:var(--measured)]/40 text-[color:var(--measured)]"
                : "border-destructive/40 text-destructive";
          return (
            <li key={n.id} className={`border bg-background/60 p-3 ${tone}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-foreground">{n.name}</span>
                <span className="text-[0.6rem] uppercase tracking-[0.18em]">
                  {isLoading
                    ? "probing…"
                    : isError
                      ? "probe failed"
                      : p
                        ? p.state === "REACHABLE"
                          ? `reachable · ${p.ms}ms`
                          : `down · ${p.reason}`
                        : "—"}
                </span>
              </div>
              <div className="mt-1 font-mono text-[0.65rem] text-muted-foreground break-all">
                {n.host} · {n.region}
              </div>
              <div className="mt-1 font-mono text-[0.65rem] text-muted-foreground">
                {n.spec}
              </div>
              <div className="mt-1 font-mono text-[0.65rem]">
                {p?.via ? `answered via ${p.via}` : "no answer recorded"}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
