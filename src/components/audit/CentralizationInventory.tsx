// Pass 2 surface — Centralization Inventory panel.

import {
  CENTRALIZATION_INVENTORY,
  inventoryTally,
  type Centralized,
} from "@/lib/centralization-inventory";

const TONE: Record<Centralized["removable"], string> = {
  yes: "border-[color:var(--measured)] text-[color:var(--measured)]",
  "opt-in": "border-gold text-gold",
  "operator-choice": "border-border text-muted-foreground",
  no: "border-destructive text-destructive",
};

export function CentralizationInventory() {
  const t = inventoryTally();
  return (
    <section className="space-y-3 border border-border bg-card/30 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
          Centralization Inventory · what would have to move
        </div>
        <div className="font-mono text-[0.65rem] text-muted-foreground">
          removable {t.yes} · opt-in {t["opt-in"]} · operator {t["operator-choice"]} · hard {t.no}
        </div>
      </header>
      <p className="text-xs text-muted-foreground">
        The running browser app's non-sovereign dependencies, named honestly.
        Source: <code className="px-1 font-mono">src/lib/centralization-inventory.ts</code>.
      </p>
      <ul className="divide-y divide-border">
        {CENTRALIZATION_INVENTORY.map((r) => (
          <li key={r.id} className="grid gap-1 py-2 sm:grid-cols-[1fr_2fr_auto]">
            <div>
              <div className="font-mono text-[0.72rem] text-foreground">{r.host}</div>
              <div className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
                {r.category}
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[0.78rem] text-foreground/90">{r.purpose}</div>
              <div className="text-[0.7rem] text-muted-foreground">{r.sovereignty_path}</div>
            </div>
            <span
              className={`h-fit shrink-0 border px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.18em] ${TONE[r.removable]}`}
            >
              {r.removable}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
