export function PartnerBand() {
  return (
    <section className="mt-16 border border-border bg-card/40 p-8 sm:p-12">
      <div className="text-[0.7rem] uppercase tracking-[0.2em] text-gold">
        Partner with Project Reclaim
      </div>
      <h2 className="mt-3 font-display text-3xl leading-tight text-foreground">
        Is Your County Ready to Reclaim?
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Project Reclaim is designed for county partnership. We handle the operational complexity —
        crews, equipment, reporting, and infrastructure. You bring the land and the vision.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled
          className="cursor-not-allowed border border-border bg-background px-5 py-3 text-[0.72rem] uppercase tracking-[0.2em] text-muted-foreground"
          title="Intake endpoint standby — awaiting operator URL"
        >
          Submit County Proposal · Standby
        </button>
        <button
          type="button"
          disabled
          className="cursor-not-allowed border border-border bg-background px-5 py-3 text-[0.72rem] uppercase tracking-[0.2em] text-muted-foreground"
          title="Investor channel standby — awaiting operator URL"
        >
          Investor Information · Standby
        </button>
      </div>
      <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
        Both channels remain standby until a sovereign intake URL is wired.
      </p>
    </section>
  );
}
