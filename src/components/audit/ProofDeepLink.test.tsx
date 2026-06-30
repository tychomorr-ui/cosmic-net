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

    // Assigning location.hash fires hashchange in real browsers and in happy-dom.
    act(() => {
      window.location.hash = `proof=${SHA_A}`;
    });
    const el = queryByTestId("modal");
    // eslint-disable-next-line no-console
    console.log("DBG manual:", el?.outerHTML, "hash=", window.location.hash);
    expect(el?.dataset.sha).toBe(SHA_A);

    act(() => {
      window.location.hash = "";
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
});

