import { createFileRoute } from "@tanstack/react-router";
import { NODES } from "@/data/nodes";
import { NodeCard } from "@/components/truth-point/NodeCard";
import { TallyStrip } from "@/components/truth-point/TallyStrip";
import { SecondWitness } from "@/components/truth-point/SecondWitness";
import { ProvenanceList } from "@/components/truth-point/ProvenanceList";

export const Route = createFileRoute("/truth-point")({
  head: () => ({
    meta: [
      { title: "Truth Point · Nexinus Verification Matrix" },
      { name: "description", content: "A node-by-node verification matrix: measured, attested, or doctrine. Live browser probes against the sovereign fleet." },
      { property: "og:title", content: "Truth Point · Nexinus Verification Matrix" },
      { property: "og:description", content: "MEASURED is not ATTESTED is not DOCTRINE. Direct browser probes against the sovereign fleet." },
    ],
  }),
  component: TruthPoint,
});

function TruthPoint() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <header className="max-w-3xl">
        <div className="text-[0.7rem] uppercase tracking-[0.2em] text-gold">Truth Point</div>
        <h1 className="mt-2 font-display text-4xl leading-tight text-foreground">The verification matrix.</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Each node is labeled by what we can prove from your browser, right now.
          <strong className="ml-1 text-[color:var(--measured)]">MEASURED</strong> means a probe answered.
          <strong className="ml-1 text-[color:var(--attested)]">ATTESTED · UNVERIFIED</strong> means the operator claims it but this page can't confirm.
          <strong className="ml-1 text-[color:var(--doctrine)]">DOCTRINE · INTENT</strong> means there is no running service yet — only a description of what is meant to be.
        </p>
      </header>

      <div className="mt-8">
        <TallyStrip />
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {NODES.map((n) => (
          <NodeCard key={n.id} node={n} />
        ))}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <SecondWitness />
        <ProvenanceList />
      </div>
    </div>
  );
}
