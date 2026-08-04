import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FEDERATION_PEERS } from "@/data/peers";
import { probePeers, type PeerProbe } from "@/utils/peers.functions";

const STATE_CLASS: Record<PeerProbe["state"], string> = {
  REACHABLE: "border-gold text-gold",
  DEGRADED: "border-amber-500/60 text-amber-400",
  DOWN: "border-destructive/60 text-destructive",
};

export function FederationPeers() {
  const fetchProbes = useServerFn(probePeers);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["federation-peers"],
    queryFn: () => fetchProbes(),
    refetchInterval: 60_000,
  });

  const byId = new Map((data ?? []).map((p) => [p.id, p]));

  return (
    <section className="rounded border border-border bg-card/40 p-4">
      <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
        federation peers — live probe
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        External systems that claim to interoperate with this site. Reachability
        is probed server-side every 60 seconds. Reachable is not coupled: a peer
        is only trusted once it serves an ARCHANGEL/v0 signed payload whose
        re-derived CID matches.
      </p>

      <div className="mt-4 space-y-3">
        {FEDERATION_PEERS.map((peer) => {
          const probe = byId.get(peer.id);
          const state = probe?.state;
          return (
            <div
              key={peer.id}
              className="rounded border border-border bg-background/40 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a
                  href={peer.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-mono text-sm text-foreground underline decoration-dotted underline-offset-4"
                >
                  {peer.label}
                </a>
                <span
                  className={`rounded border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] ${
                    state
                      ? STATE_CLASS[state]
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {isLoading
                    ? "probing…"
                    : isError
                      ? "probe failed"
                      : state === "REACHABLE"
                        ? `reachable · ${probe?.ms}ms`
                        : `${state?.toLowerCase()} · ${probe?.reason}`}
                </span>
              </div>

              <dl className="mt-2 space-y-1 text-[0.72rem] leading-relaxed">
                <div>
                  <dt className="inline text-muted-foreground">claim: </dt>
                  <dd className="inline text-foreground">{peer.claim}</dd>
                </div>
                <div>
                  <dt className="inline text-muted-foreground">signed: </dt>
                  <dd className="inline font-mono text-foreground">
                    {probe ? (probe.signed ? "yes" : "no") : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-muted-foreground">
                    blocker to coupling:{" "}
                  </dt>
                  <dd className="inline text-foreground">{peer.blocker}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
