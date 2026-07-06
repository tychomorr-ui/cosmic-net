import { createFileRoute, Link } from "@tanstack/react-router";
import { DoctrineHero } from "@/components/truth-coin/DoctrineHero";
import { AwaitingTile } from "@/components/truth-coin/AwaitingTile";
import { DignityModel } from "@/components/truth-coin/DignityModel";
import { RealizationPath } from "@/components/truth-coin/RealizationPath";
import { Manifesto } from "@/components/truth-coin/Manifesto";
import { ContractReceipt } from "@/components/truth-coin/ContractReceipt";
import { ALLOCATIONS } from "@/data/truth-coin";

export const Route = createFileRoute("/truth-coin")({
  head: () => ({
    meta: [
      { title: "Truth Coin · TRC · Doctrine" },
      { name: "description", content: "The Truth Coin doctrine: pre-issuance, Bitcoin-anchored provenance, sovereign dignity-credit model — not legal tender, not investment advice." },
      { property: "og:title", content: "Truth Coin · TRC · Doctrine" },
      { property: "og:description", content: "Pre-issuance doctrine. Bitcoin-anchored. The highest investment is the rise of the bottom 2%." },
    ],
  }),
  component: TruthCoin,
});

function TruthCoin() {
  return (
    <div className="mx-auto max-w-6xl space-y-12 px-6 py-14">
      <DoctrineHero />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AwaitingTile label="TRC in circulation" sub="No tokens minted" />
        <AwaitingTile label="Recipients active"  sub="No allocations" />
        <AwaitingTile label="Issued · last 24h"  sub="No issuance event" />
        <AwaitingTile label="Crystal anchored"   sub="Substrate pending" />
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <CopyBlock title="Bottom 2% investment"
          body="Truth Coin is designed to be issued directly to the bottom 2% — paying them to better themselves and the planet. The highest form of investment is in the rise of those who were never given a floor." />
        <CopyBlock title="Chokonomics — rise through fire"
          body="Under pressure most economies choke. Truth Coin is designed to compress pressure into ascension. Fire is not the enemy — it is the forge. Compression refines." />
        <CopyBlock title="Trillion Crystal Tech"
          body="Crystalline substrates carry truth without decay. Trillion Crystal Tech is the intended future infrastructure layer: storage, computation, and resonance unified in lattice form." />
        <CopyBlock title="End of fossil fuels"
          body="Reject gas engines. Utility over aesthetics. Ugly will get us out. The Cybertruck mentality: form follows function follows planet." />
      </section>

      <section className="border border-primary/40 bg-background/40 p-6">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-primary">SUBSTRATE BRIDGE · TRC ↔ DOU ↔ TRS</div>
        <h2 className="mt-2 font-display text-2xl text-foreground">Truth Chain carries Digital Ore</h2>
        <p className="mt-2 max-w-3xl text-sm text-foreground/85">
          Truth Coin is the redistribution arc. <strong>Digital Ore</strong> is the operator's claim on intellectual byproduct.
          <strong> Truth Substrate</strong> is the sovereign reading of the underlying chain's substrate. Together they form one
          continuity: refined ore → attested substrate → issued truth. The Truth Chain links them — every link is a CID-anchored
          witness, not a custodial entry.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Link to="/digital-ore" className="block border border-border bg-card/40 p-4 hover:border-primary">
            <div className="text-[0.6rem] uppercase tracking-[0.2em] text-primary">⛬ Digital Ore</div>
            <div className="mt-1 text-sm text-foreground">Refine byproduct → DOU</div>
            <div className="mt-1 text-[0.65rem] text-muted-foreground">FNV-1a · local ledger · truth mirror</div>
          </Link>
          <Link to="/sudo-coin" className="block border border-border bg-card/40 p-4 hover:border-primary">
            <div className="text-[0.6rem] uppercase tracking-[0.2em] text-primary">◈ Truth Substrate</div>
            <div className="mt-1 text-sm text-foreground">Bitcoin substrate · attested</div>
            <div className="mt-1 text-[0.65rem] text-muted-foreground">work × pressure × density × supply^¼</div>
          </Link>
          <Link to="/seventh-dimension" className="block border border-border bg-card/40 p-4 hover:border-primary">
            <div className="text-[0.6rem] uppercase tracking-[0.2em] text-primary">◬ 7TH DIMENSION</div>
            <div className="mt-1 text-sm text-foreground">Unification surface</div>
            <div className="mt-1 text-[0.65rem] text-muted-foreground">ore + substrate + resonance, one axis</div>
          </Link>
        </div>
      </section>


      <DignityModel />

      <section>
        <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">Allocation intent · categories</div>
        <h2 className="mt-2 font-display text-2xl text-foreground">Where the coin is intended to flow</h2>
        <p className="mt-2 text-sm text-muted-foreground">Percentages are withheld until the genesis distribution is ratified.</p>
        <div className="mt-5 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {ALLOCATIONS.map((a) => (
            <div key={a.label} className="bg-card/40 p-5">
              <div className="text-[0.65rem] uppercase tracking-[0.2em] text-gold">{a.label}</div>
              <div className="mt-1 font-display text-2xl text-muted-foreground">—</div>
              <div className="mt-1 text-xs text-foreground/80">{a.note}</div>
            </div>
          ))}
        </div>
      </section>

      <RealizationPath />
      <ContractReceipt />
      <Manifesto />

      <section className="border border-dashed border-border bg-card/20 p-8 text-center">
        <div className="text-[0.7rem] uppercase tracking-[0.2em] text-gold">Sovereign ledger</div>
        <h2 className="mt-2 font-display text-2xl text-foreground">No issuances recorded</h2>
        <p className="mt-2 text-sm text-muted-foreground">The ledger writes its first entry the moment the chain opens.</p>
      </section>
    </div>
  );
}

function CopyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-border bg-card/40 p-6">
      <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">{title}</div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/85">{body}</p>
    </div>
  );
}
