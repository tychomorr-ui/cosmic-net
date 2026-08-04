import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { federationInbox } from "@/utils/federation.functions";

export function FederationInbox() {
  const fetchInbox = useServerFn(federationInbox);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["federation-inbox"],
    queryFn: () => fetchInbox(),
    refetchInterval: 60_000,
  });

  return (
    <section className="rounded border border-border bg-card/40 p-4">
      <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
        inbound federation events — quarantine
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        External gateways may POST signed events to{" "}
        <code className="font-mono text-gold">/api/public/hooks/nexinus</code>. The
        shared secret authenticates the <em>sender</em>, not the <em>claim</em>.
        Every accepted event is held QUARANTINED and never enters the ledger, the
        Golden Truth manifest, or any mint path.
      </p>

      <div className="mt-3 flex flex-wrap gap-2 font-mono text-[0.6rem] uppercase tracking-[0.2em]">
        <span
          className={`rounded border px-2 py-0.5 ${
            data?.secretConfigured
              ? "border-gold text-gold"
              : "border-destructive/60 text-destructive"
          }`}
        >
          secret {data?.secretConfigured ? "configured" : "not configured"}
        </span>
        <span className="rounded border border-border px-2 py-0.5 text-muted-foreground">
          coupled peers {data?.registry.filter((r) => r.coupled).length ?? 0}
        </span>
      </div>

      {isLoading && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">loading…</p>
      )}
      {isError && (
        <p className="mt-3 font-mono text-xs text-destructive">
          inbox read failed
        </p>
      )}

      {data && data.registry.length > 0 && (
        <ul className="mt-4 space-y-2">
          {data.registry.map((r) => (
            <li
              key={r.node_id}
              className="rounded border border-border bg-background/40 p-2 font-mono text-[0.7rem]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-foreground">{r.node_id}</span>
                <span
                  className={
                    r.coupled ? "text-gold" : "text-muted-foreground"
                  }
                >
                  {r.coupled ? "COUPLED" : "CLAIMANT"}
                </span>
              </div>
              <div className="mt-1 break-all text-muted-foreground">
                {r.webhook_url}
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && (
        <div className="mt-4">
          {data.events.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">
              no inbound events received
            </p>
          ) : (
            <ul className="space-y-2">
              {data.events.map((e) => (
                <li
                  key={e.event_id}
                  className="rounded border border-border bg-background/40 p-2 font-mono text-[0.7rem]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-foreground">{e.event_type}</span>
                    <span className="text-amber-400">{e.state}</span>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {new Date(e.received_at).toISOString()}
                    {e.node_id ? ` · ${e.node_id}` : ""}
                  </div>
                  {e.reason && (
                    <div className="mt-1 break-all text-muted-foreground">
                      {e.reason}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
