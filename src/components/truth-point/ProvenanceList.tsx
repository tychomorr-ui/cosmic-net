const COMMITS = [
  {
    file: "setup.sh",
    sha: "cd9aeb7",
    url: "https://github.com/tychomorr-ui/nexinus-bootstrap",
    note: "Bootstrap installer for the sovereign fleet base image.",
  },
  {
    file: "monarch-health.sh",
    sha: "b866bd0",
    url: "https://github.com/tychomorr-ui/nexinus-bootstrap",
    note: "Health-probe script published alongside the Monarch endpoint.",
  },
];

export function ProvenanceList() {
  return (
    <section className="border border-border bg-card/30 p-6">
      <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">Provenance · public commits</div>
      <h3 className="mt-2 font-display text-lg text-foreground">Repository receipts</h3>
      <ul className="mt-4 divide-y divide-border">
        {COMMITS.map((c) => (
          <li key={c.file} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div>
              <a href={c.url} target="_blank" rel="noreferrer" className="font-mono text-foreground hover:text-gold">
                {c.file}
              </a>
              <div className="text-xs text-muted-foreground">{c.note}</div>
            </div>
            <code className="font-mono text-xs text-gold">{c.sha}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}
