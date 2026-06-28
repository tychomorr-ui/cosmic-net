export function StancePanel() {
  return (
    <aside className="rounded border border-border bg-card/40 p-5">
      <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">STANCE</div>
      <ul className="mt-3 space-y-1.5 font-mono text-[0.72rem] text-foreground/85">
        <li>▸ zero third-party telemetry</li>
        <li>▸ zero vendor middleware</li>
        <li>▸ local-first · sovereign-node</li>
        <li>▸ real data or honest standby</li>
      </ul>

      <div className="mt-5 text-[0.7rem] uppercase tracking-[0.22em] text-gold">PAM</div>
      <p className="mt-2 text-[0.72rem] text-muted-foreground">
        in-browser WebGPU runtime · no packets leave during inference
      </p>

      <div className="mt-5 text-[0.7rem] uppercase tracking-[0.22em] text-gold">SAA</div>
      <p className="mt-2 text-[0.72rem] text-muted-foreground">
        sovereign-node proxy · <span className="text-foreground">/api/saa/{"{stripe|paypal|chain|cashapp}"}</span> · secrets node-side
      </p>
    </aside>
  );
}

export function ManifestationQueue() {
  return (
    <aside className="rounded border border-border bg-card/40 p-5">
      <div className="flex items-baseline justify-between">
        <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
          manifestation queue
        </div>
        <span className="rounded border border-border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
          STANDBY
        </span>
      </div>
      <p className="mt-3 text-[0.72rem] text-muted-foreground">
        Forge job tracker. Queue populates when the Sovereign Forge starts
        emitting job records. No synthetic entries.
      </p>
    </aside>
  );
}
