export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <div className="font-display text-base tracking-[0.2em] text-foreground">NEXINUS RI</div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Building a sovereign operational ecosystem focused on persistent awareness, adaptive intelligence,
            infrastructure continuity, and real-world systems integration.
          </p>
        </div>
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">Ecosystem</div>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            <li>XinUS MonarchOS</li>
            <li>Nebulous</li>
            <li>Archangel</li>
            <li>Travel Guardian</li>
          </ul>
        </div>
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">Programs</div>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            <li>Project Reclaim</li>
            <li>Project White Horse</li>
            <li>Investor Portal</li>
            <li>County Proposal</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-6 py-4 text-center text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
        © 2024 Nexinus RI Systems LLC · The Sovereign Ecosystem
      </div>
    </footer>
  );
}
