export function PillarCard({
  number,
  title,
  body,
  standby = false,
}: {
  number: string;
  title: string;
  body: string[];
  standby?: boolean;
}) {
  return (
    <article className="flex flex-col border border-border bg-card/30 p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-gold">
          Pillar {number}
        </span>
        {standby && (
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
            Standby
          </span>
        )}
      </div>
      <h3 className="mt-3 font-display text-xl leading-snug text-foreground">{title}</h3>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
