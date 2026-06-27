import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function UplinkStrip() {
  const [utc, setUtc] = useState(() => new Date().toISOString().slice(11, 19));
  useEffect(() => {
    const t = setInterval(() => setUtc(new Date().toISOString().slice(11, 19)), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-lg tracking-[0.2em] text-foreground">
          NEXINUS <span className="text-gold">◆</span> TERMINUS
        </Link>
        <nav className="hidden gap-6 text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground sm:flex">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-gold" }} className="hover:text-foreground">Witness</Link>
          <Link to="/truth-point" activeProps={{ className: "text-gold" }} className="hover:text-foreground">Truth Point</Link>
          <Link to="/truth-coin" activeProps={{ className: "text-gold" }} className="hover:text-foreground">Truth Coin</Link>
          <Link to="/ops" activeProps={{ className: "text-gold" }} className="hover:text-foreground">Ops</Link>
        </nav>
        <div className="flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="hidden sm:inline">UTC</span>
          <span className="text-foreground tabular-nums">{utc}</span>
          <span className="text-gold">◆</span>
          <span>Operator</span>
        </div>
      </div>
    </header>
  );
}
