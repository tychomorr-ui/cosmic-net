// @vitest-environment happy-dom
//
// Behavior contract for the global #proof= deep-link router:
//   1. Page-load with `#proof=<valid-sha>` opens the modal.
//   2. Mutating window.location.hash later opens/closes the modal
//      regardless of which route the shell is rendered under.
//   3. openProofHash / closeProofHash drive the modal two-way.
//   4. Closing the modal via onOpenChange clears the hash.
//   5. Invalid `#proof=` values do NOT open the modal and the bad
//      hash is stripped from the URL.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, cleanup } from "@testing-library/react";
import { ProofDeepLink, openProofHash, closeProofHash } from "./ProofDeepLink";

// Stub out the heavy modal — we only care about open/close + ctx.
const capturedOnOpenChange: { fn: ((open: boolean) => void) | null } = { fn: null };
vi.mock("@/components/audit/ProofDetailModal", () => ({
  ProofDetailModal: ({
    open,
    context,
    onOpenChange,
  }: {
    open: boolean;
    context: { sha256: string } | null;
    onOpenChange: (open: boolean) => void;
  }) => {
    capturedOnOpenChange.fn = onOpenChange;
    return open ? <div data-testid="modal" data-sha={context?.sha256 ?? ""} /> : null;
  },
}));

// Provenance lookup is irrelevant to the routing contract — return [].
vi.mock("@/lib/provenance", () => ({
  parseProvenance: () => [],
}));

// Capture toast errors without rendering sonner.
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

function setPath(path: string) {
  // Drive the URL the way a real navigation would, then notify listeners.
  history.replaceState(null, "", path);
  window.dispatchEvent(new Event("hashchange"));
}

beforeEach(() => {
  history.replaceState(null, "", "/");
  toastError.mockClear();
});

afterEach(() => {
  cleanup();
  history.replaceState(null, "", "/");
});

describe("ProofDeepLink", () => {
  it("opens the modal on page load when #proof= is present", () => {
    history.replaceState(null, "", `/#proof=${SHA_A}`);
    const { queryByTestId } = render(<ProofDeepLink />);
    expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_A);
  });

  it("renders nothing when there is no proof hash", () => {
    const { queryByTestId } = render(<ProofDeepLink />);
    expect(queryByTestId("modal")).toBeNull();
  });

  it("reacts to hashchange events from any route", () => {
    history.replaceState(null, "", "/ops");
    const { queryByTestId } = render(<ProofDeepLink />);
    expect(queryByTestId("modal")).toBeNull();

    act(() => setPath(`/ops#proof=${SHA_A}`));
    expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_A);

    // Switch SHA on the same route.
    act(() => setPath(`/ops#proof=${SHA_B}`));
    expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_B);

    // Navigate to a different route, keep the hash → stays open.
    act(() => setPath(`/status#proof=${SHA_B}`));
    expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_B);

    // Remove the hash → closes.
    act(() => setPath("/status"));
    expect(queryByTestId("modal")).toBeNull();
  });

  it("openProofHash opens and closeProofHash closes", () => {
    const { queryByTestId } = render(<ProofDeepLink />);
    expect(queryByTestId("modal")).toBeNull();

    act(() => openProofHash(SHA_A));
    expect(window.location.hash).toBe(`#proof=${SHA_A}`);
    expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_A);

    act(() => closeProofHash());
    expect(window.location.hash).toBe("");
    expect(queryByTestId("modal")).toBeNull();
  });

  it("ignores invalid proof hashes, fires a toast, and strips the bad value", () => {
    history.replaceState(null, "", "/#proof=not-a-sha");
    const { queryByTestId } = render(<ProofDeepLink />);
    expect(queryByTestId("modal")).toBeNull();
    expect(window.location.hash).toBe("");
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it("normalizes uppercase SHAs to lowercase", () => {
    const upper = "C".repeat(64);
    history.replaceState(null, "", `/#proof=${upper}`);
    const { queryByTestId } = render(<ProofDeepLink />);
    expect(queryByTestId("modal")?.dataset.sha).toBe("c".repeat(64));
  });

  // ─── Bidirectional sync ───────────────────────────────────────────────

  it("opens via openProofHash and closes via the modal's onOpenChange", () => {
    const { queryByTestId } = render(<ProofDeepLink />);

    act(() => openProofHash(SHA_A));
    expect(window.location.hash).toBe(`#proof=${SHA_A}`);
    expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_A);

    // Simulate Radix calling onOpenChange(false) on ESC / overlay click.
    act(() => capturedOnOpenChange.fn?.(false));
    expect(window.location.hash).toBe("");
    expect(queryByTestId("modal")).toBeNull();
  });

  it("manual hash edits open and close the modal", () => {
    const { queryByTestId } = render(<ProofDeepLink />);

    // Simulate a user editing the URL bar (paste a deep link).
    act(() => {
      history.replaceState(null, "", `/#proof=${SHA_A}`);
      window.dispatchEvent(new Event("hashchange"));
    });
    expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_A);

    // User manually clears the hash.
    act(() => {
      history.replaceState(null, "", "/");
      window.dispatchEvent(new Event("hashchange"));
    });
    expect(queryByTestId("modal")).toBeNull();
  });




  it("browser back/forward toggles the modal in sync with history", async () => {
    history.replaceState(null, "", "/ops");
    const { queryByTestId } = render(<ProofDeepLink />);
    expect(queryByTestId("modal")).toBeNull();

    // Push a proof state, then a clean state — same path, three entries.
    act(() => openProofHash(SHA_A));
    expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_A);

    act(() => closeProofHash()); // replaceState — no new entry
    act(() => openProofHash(SHA_B)); // pushState — new entry
    expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_B);

    // Back: should land on the cleared state (modal closed).
    await act(async () => {
      history.back();
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(window.location.hash).toBe("");
    expect(queryByTestId("modal")).toBeNull();

    // Forward: should restore the SHA_B proof state (modal reopens).
    await act(async () => {
      history.forward();
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(window.location.hash).toBe(`#proof=${SHA_B}`);
    expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_B);
  });

  // ─── Invalid #proof= coverage matrix ──────────────────────────────────
  //
  // For every malformed input we assert the same contract:
  //   - the modal stays closed
  //   - the bad hash is stripped from the URL
  //   - exactly one toast.error fires with title "Invalid proof link"
  //   - the toast description previews the offending raw value (truncated
  //     to 24 chars + ellipsis when longer)
  describe("invalid #proof= values", () => {
    const expectToastFor = (raw: string) => {
      expect(toastError).toHaveBeenCalledTimes(1);
      const [title, opts] = toastError.mock.calls[0] as [
        string,
        { description?: string } | undefined,
      ];
      expect(title).toBe("Invalid proof link");
      const preview = raw.length > 24 ? `${raw.slice(0, 24)}…` : raw;
      expect(opts?.description).toContain(`"${preview}"`);
      expect(opts?.description).toContain("not a 64-char SHA-256");
    };

    it.each([
      ["short hex (63 chars)", "a".repeat(63)],
      ["long hex (65 chars)", "a".repeat(65)],
      ["64 chars with non-hex characters", "g".repeat(64)],
      ["64 chars with punctuation", `${"a".repeat(63)}!`],
      ["arbitrary slug", "not-a-sha"],
      ["uppercase-but-too-short", "ABCDEF"],
    ])("rejects %s", (_label, raw) => {
      history.replaceState(null, "", `/#proof=${raw}`);
      const { queryByTestId } = render(<ProofDeepLink />);

      expect(queryByTestId("modal")).toBeNull();
      expect(window.location.hash).toBe("");
      expectToastFor(raw);
    });

    it("treats `#proof=` with an empty value as a no-op (modal stays closed)", () => {
      // Empty value is malformed but indistinguishable from "user cleared it";
      // the router should not open the modal and should not spam a toast.
      history.replaceState(null, "", "/#proof=");
      const { queryByTestId } = render(<ProofDeepLink />);
      expect(queryByTestId("modal")).toBeNull();
    });

    it("does not open the modal when #proof= key is absent entirely", () => {
      history.replaceState(null, "", "/#something-else=42");
      const { queryByTestId } = render(<ProofDeepLink />);
      expect(queryByTestId("modal")).toBeNull();
      // No invalid value was present, so no toast should fire.
      expect(toastError).not.toHaveBeenCalled();
      // Unrelated hash is preserved (only #proof= is managed).
      expect(window.location.hash).toBe("#something-else=42");
    });

    it("does not re-fire the toast for the same invalid value across hashchange events", () => {
      const { queryByTestId } = render(<ProofDeepLink />);

      act(() => setPath("/#proof=not-a-sha"));
      expect(queryByTestId("modal")).toBeNull();
      expect(toastError).toHaveBeenCalledTimes(1);

      // Re-emitting the same bad hash should not spam the user.
      act(() => setPath("/#proof=not-a-sha"));
      expect(toastError).toHaveBeenCalledTimes(1);
    });

    it("recovers cleanly when a valid hash follows an invalid one", () => {
      history.replaceState(null, "", "/#proof=bogus");
      const { queryByTestId } = render(<ProofDeepLink />);
      expect(queryByTestId("modal")).toBeNull();
      expect(toastError).toHaveBeenCalledTimes(1);

      act(() => setPath(`/#proof=${SHA_A}`));
      expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_A);
      // No additional error toast on the valid follow-up.
      expect(toastError).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Close + reopen contract ──────────────────────────────────────────
  //
  // Closing the modal must always clear `#proof=`, and every supported
  // close path (onOpenChange, closeProofHash, manual hash edit, browser
  // back) must leave the router in a state where opening a corrected
  // hash re-triggers the modal cleanly — no stale state, no missed event.
  describe("close + reopen", () => {
    it("clears #proof= when the modal closes via onOpenChange", () => {
      const { queryByTestId } = render(<ProofDeepLink />);
      act(() => openProofHash(SHA_A));
      expect(window.location.hash).toBe(`#proof=${SHA_A}`);

      act(() => capturedOnOpenChange.fn?.(false));
      expect(window.location.hash).toBe("");
      expect(queryByTestId("modal")).toBeNull();
    });

    it("reopens with the same SHA after closing via onOpenChange", () => {
      const { queryByTestId } = render(<ProofDeepLink />);
      act(() => openProofHash(SHA_A));
      act(() => capturedOnOpenChange.fn?.(false));
      expect(queryByTestId("modal")).toBeNull();

      // Re-clicking the same SHA must reopen — no debouncing on identity.
      act(() => openProofHash(SHA_A));
      expect(window.location.hash).toBe(`#proof=${SHA_A}`);
      expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_A);
    });

    it("opens a corrected hash after an invalid one was rejected", () => {
      history.replaceState(null, "", "/#proof=not-a-sha");
      const { queryByTestId } = render(<ProofDeepLink />);
      expect(queryByTestId("modal")).toBeNull();
      expect(window.location.hash).toBe("");
      expect(toastError).toHaveBeenCalledTimes(1);

      // User pastes the corrected link — modal opens, no extra toast.
      act(() => setPath(`/#proof=${SHA_A}`));
      expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_A);
      expect(toastError).toHaveBeenCalledTimes(1);
    });

    it("browser back from an open modal clears the hash and closes", async () => {
      history.replaceState(null, "", "/ops");
      const { queryByTestId } = render(<ProofDeepLink />);

      act(() => openProofHash(SHA_A));
      expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_A);

      await act(async () => {
        history.back();
        await new Promise((r) => setTimeout(r, 10));
      });
      expect(window.location.hash).toBe("");
      expect(queryByTestId("modal")).toBeNull();

      // After back-close, a fresh open still works cleanly.
      act(() => openProofHash(SHA_B));
      expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_B);
    });

    it("manual hash clear closes the modal and a re-set reopens it", () => {
      const { queryByTestId } = render(<ProofDeepLink />);
      act(() => openProofHash(SHA_A));
      expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_A);

      act(() => setPath("/"));
      expect(queryByTestId("modal")).toBeNull();

      act(() => setPath(`/#proof=${SHA_A}`));
      expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_A);
    });

    it("closeProofHash is idempotent when the hash is already empty", () => {
      const { queryByTestId } = render(<ProofDeepLink />);
      act(() => closeProofHash());
      act(() => closeProofHash());
      expect(window.location.hash).toBe("");
      expect(queryByTestId("modal")).toBeNull();

      // Router is still healthy — opening afterward works.
      act(() => openProofHash(SHA_A));
      expect(queryByTestId("modal")?.dataset.sha).toBe(SHA_A);
    });
  });
});



