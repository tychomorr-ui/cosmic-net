// Navigation guard for OMNI-SAM blades.
// AWAITING blades cannot navigate silently — clicks transition to
// STANCE_PENDING and append a Warrior-lane envelope to the Truth Ledger.

import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Blade } from "@/data/blades";
import { appendEnvelope } from "@/data/truth-ledger";

export function useBladeNav() {
  const navigate = useNavigate();

  return useCallback(
    async (blade: Blade, ev?: { preventDefault?: () => void }) => {
      if (blade.status === "AWAITING") {
        ev?.preventDefault?.();
        try {
          await appendEnvelope({
            lane: "Warrior",
            request: `traverse → ${blade.route} (${blade.name})`,
            reflection: `[stance] blade ${blade.n} AWAITING · ${blade.awaiting ?? "no pre-conditions met"}`,
            truths: ["unledgered"],
            next_move: `wire pre-condition for ${blade.name}: ${blade.awaiting ?? "define liveness contract"}`,
            drift: "STANCE_PENDING",
          });
        } catch (e) {
          // Ledger refused (chain break) — still no silent failure: surface in console.
          // eslint-disable-next-line no-console
          console.warn("[blade-nav] ledger append refused", e);
        }
        return { traversed: false as const };
      }
      navigate({ to: blade.route as "/" });
      return { traversed: true as const };
    },
    [navigate],
  );
}
