// Global #proof=<sha> deep-link handler. Mounted in the root shell so any
// route — even "/" — opens the Proof Detail modal when the URL hash carries
// a 64-char SHA-256. Looks up the receipt from the local ops ledger; if no
// matching receipt is found, opens with a minimal context so the anchor
// (if recorded) and CIDs still render honestly.

import { useEffect, useState } from "react";
import { parseProvenance, type ProvenanceReceipt } from "@/lib/provenance";
import { ProofDetailModal, type ProofContext } from "@/components/audit/ProofDetailModal";

function buildContext(sha: string, receipts: ProvenanceReceipt[]): ProofContext {
  const r = receipts.find((x) => x.hashes.includes(sha));
  if (r) {
    const docName = r.otsFiles[0]?.replace(/\.ots$/, "") || r.command || sha.slice(0, 12);
    return {
      sha256: sha,
      docName,
      subsystem: r.subsystem,
      ts: r.ts,
      otsFiles: r.otsFiles,
    };
  }
  return {
    sha256: sha,
    docName: `Anchor ${sha.slice(0, 12)}…`,
    otsFiles: [],
  };
}

export function ProofDeepLink() {
  const [ctx, setCtx] = useState<ProofContext | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const receipts = parseProvenance();

    const sync = () => {
      const m = window.location.hash.match(/proof=([a-f0-9]{64})/i);
      if (!m) {
        setCtx(null);
        return;
      }
      setCtx(buildContext(m[1].toLowerCase(), receipts));
    };

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const close = (open: boolean) => {
    if (open) return;
    setCtx(null);
    if (typeof window !== "undefined" && window.location.hash.includes("proof=")) {
      // Clear the hash without scrolling.
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  return <ProofDetailModal open={ctx !== null} onOpenChange={close} context={ctx} />;
}
