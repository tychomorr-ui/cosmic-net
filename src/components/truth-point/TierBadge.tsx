import type { Tier } from "@/data/nodes";

const STYLES: Record<Tier, { label: string; cls: string }> = {
  measured: { label: "MEASURED", cls: "border-[color:var(--measured)] text-[color:var(--measured)]" },
  attested: { label: "ATTESTED · UNVERIFIED", cls: "border-[color:var(--attested)] text-[color:var(--attested)]" },
  doctrine: { label: "DOCTRINE · INTENT", cls: "border-[color:var(--doctrine)] text-[color:var(--doctrine)]" },
};

export function TierBadge({ tier, override }: { tier: Tier; override?: string }) {
  const s = STYLES[tier];
  return (
    <span className={`inline-flex items-center gap-2 border px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.18em] ${s.cls}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {override ?? s.label}
    </span>
  );
}
