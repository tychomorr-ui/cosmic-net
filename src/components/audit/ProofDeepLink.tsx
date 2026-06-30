// Global #proof=<sha> deep-link router.
//
// Single source of truth for the Proof Detail modal:
//   - URL hash `#proof=<sha>` ↔ modal open state.
//   - `openProofHash(sha)` (called by the UI) pushes the hash; the listener
//     opens the modal in response.
//   - Closing the modal clears the hash (and vice versa: removing the hash
//     from the URL closes the modal).
//
// Mounted once in the root shell so deep links work on every route.

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { parseProvenance, type ProvenanceReceipt } from "@/lib/provenance";
import { ProofDetailModal, type ProofContext } from "@/components/audit/ProofDetailModal";

const VALID_RE = /proof=([a-f0-9]{64})(?:&|$)/i;
const PRESENT_RE = /(?:^|[#&])proof=([^&]*)/i;

type HashRead =
  | { kind: "none" }
  | { kind: "valid"; sha: string }
  | { kind: "invalid"; raw: string };

function readHashSha(): HashRead {
  if (typeof window === "undefined") return { kind: "none" };
  const hash = window.location.hash;
  const valid = hash.match(VALID_RE);
  if (valid) return { kind: "valid", sha: valid[1].toLowerCase() };
  const present = hash.match(PRESENT_RE);
  if (present) return { kind: "invalid", raw: present[1] };
  return { kind: "none" };
}

function writeHash(sha: string | null) {
  if (typeof window === "undefined") return;
  const base = window.location.pathname + window.location.search;
  const next = sha ? `${base}#proof=${sha}` : base;
  // Use pushState when opening (so back button closes), replaceState when clearing.
  if (sha) history.pushState(null, "", next);
  else history.replaceState(null, "", next);
  // pushState/replaceState don't fire hashchange — notify ourselves.
  window.dispatchEvent(new Event("nexinus:proofhash"));
}

/** Open the Proof Detail modal for the given SHA-256 by updating the URL hash. */
export function openProofHash(sha: string) {
  writeHash(sha.toLowerCase());
}

/** Close the modal by clearing the proof hash. */
export function closeProofHash() {
  writeHash(null);
}

function buildContext(sha: string, receipts: ProvenanceReceipt[]): ProofContext {
  const r = receipts.find((x) => x.hashes.includes(sha));
  if (r) {
    const docName = r.otsFiles[0]?.replace(/\.ots$/, "") || r.command || sha.slice(0, 12);
    return { sha256: sha, docName, subsystem: r.subsystem, ts: r.ts, otsFiles: r.otsFiles };
  }
  return { sha256: sha, docName: `Anchor ${sha.slice(0, 12)}…`, otsFiles: [] };
}

export function ProofDeepLink() {
  const [ctx, setCtx] = useState<ProofContext | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const receipts = parseProvenance();

    let lastInvalid = "";
    const sync = () => {
      const r = readHashSha();
      if (r.kind === "valid") {
        lastInvalid = "";
        setCtx(buildContext(r.sha, receipts));
        return;
      }
      if (r.kind === "invalid") {
        if (r.raw !== lastInvalid) {
          lastInvalid = r.raw;
          toast.error("Invalid proof link", {
            description: `"${r.raw.slice(0, 24)}${r.raw.length > 24 ? "…" : ""}" is not a 64-char SHA-256.`,
          });
        }
        setCtx(null);
        // Strip the bad hash so retries from the same URL re-trigger.
        history.replaceState(null, "", window.location.pathname + window.location.search);
        return;
      }
      lastInvalid = "";
      setCtx(null);
    };

    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    window.addEventListener("nexinus:proofhash", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
      window.removeEventListener("nexinus:proofhash", sync);
    };
  }, []);

  const onOpenChange = (open: boolean) => {
    if (!open) closeProofHash();
  };

  return <ProofDetailModal open={ctx !== null} onOpenChange={onOpenChange} context={ctx} />;
}
