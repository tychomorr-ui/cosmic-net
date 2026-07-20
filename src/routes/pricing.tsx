import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { getStripe, getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";
import { createMcpCheckoutSession } from "@/utils/payments.functions";

export const Route = createFileRoute("/pricing")({
  ssr: false,
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — cMAP MCP Access" },
      {
        name: "description",
        content:
          "Verified provenance for AI agents. Starter $19/mo for 1,000 stamps; Pro $99/mo unlimited + signed webhook delivery.",
      },
      { property: "og:title", content: "Pricing — cMAP MCP Access" },
      {
        property: "og:description",
        content: "Starter $19 or Pro $99 — provenance stamps and audit webhooks for MCP clients.",
      },
    ],
  }),
});

type Plan = {
  lookupKey: "cmap_starter_monthly" | "cmap_pro_monthly";
  name: string;
  price: string;
  tagline: string;
  features: string[];
  recommended?: boolean;
};

const PLANS: Plan[] = [
  {
    lookupKey: "cmap_starter_monthly",
    name: "Starter",
    price: "$19",
    tagline: "For individual builders and audit spot-checks.",
    features: [
      "1,000 provenance stamps / month",
      "OTS Bitcoin anchoring included",
      "OAuth from ChatGPT, Claude, Codex, Cursor",
      "MCP tools: list_nodes, list_blades, centralization_inventory, provenance_record, provenance_ots_stamp",
    ],
  },
  {
    lookupKey: "cmap_pro_monthly",
    name: "Pro",
    price: "$99",
    tagline: "For teams shipping AI agents that need a verified audit trail.",
    features: [
      "Unlimited provenance stamps",
      "HMAC-signed webhook delivery per stamp",
      "OTS Bitcoin anchoring included",
      "Multi-endpoint webhook fan-out with retry visibility",
      "Everything in Starter",
    ],
    recommended: true,
  },
];

function PricingPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  function startCheckout(plan: Plan) {
    setError(null);
    if (!session) {
      navigate({ to: "/auth", search: { next: "/pricing" } });
      return;
    }
    if (!isPaymentsConfigured()) {
      setError("Payments are not configured for this build yet.");
      return;
    }
    setCheckoutOpen(plan);
  }

  const fetchClientSecret = async (): Promise<string> => {
    if (!checkoutOpen) throw new Error("No plan selected");
    const env = getStripeEnvironment();
    const result = await createMcpCheckoutSession({
      data: {
        environment: env,
        lookupKey: checkoutOpen.lookupKey,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("No client secret");
    return result.clientSecret;
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Compliance & Provenance Engine
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-wide uppercase text-foreground">
          cMAP MCP Access
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Verify that your AI agent's decisions haven't been tampered with. Every stamp is a
          SHA-256 receipt on the caller's account; Pro tier anchors to Bitcoin via OpenTimestamps
          and fans out signed webhooks to your audit sink.
        </p>
      </header>

      {!checkoutOpen ? (
        <>
          <section className="mt-10 grid gap-6 md:grid-cols-2">
            {PLANS.map((plan) => (
              <div
                key={plan.lookupKey}
                className={`rounded-lg border bg-card/40 p-8 ${
                  plan.recommended ? "border-primary" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold uppercase tracking-wide text-foreground">
                    {plan.name}
                  </h2>
                  {plan.recommended ? (
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                      Recommended
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
                <ul className="mt-6 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <button
                  onClick={() => startCheckout(plan)}
                  className={`mt-8 w-full rounded px-4 py-3 text-sm font-medium ${
                    plan.recommended
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  {session ? `Subscribe — ${plan.price}/mo` : "Sign in to subscribe"}
                </button>
              </div>
            ))}
          </section>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          <p className="mt-8 text-xs text-muted-foreground">
            After you subscribe, connect this URL in your AI client's MCP settings:{" "}
            <code className="font-mono">
              {typeof window !== "undefined"
                ? `${window.location.origin}/mcp`
                : "https://cosmictruth.lovable.app/mcp"}
            </code>
            . For setup snippets see the{" "}
            <Link to="/docs" className="underline hover:text-foreground">
              developer docs
            </Link>
            .
          </p>
          <Link
            to="/"
            className="mt-6 inline-block text-xs text-muted-foreground hover:text-foreground"
          >
            ← back to cMAP
          </Link>
        </>
      ) : (
        <section className="mt-10">
          <p className="mb-4 text-sm text-muted-foreground">
            Subscribing to <strong>{checkoutOpen.name}</strong> — {checkoutOpen.price}/month.
          </p>
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
          <button
            onClick={() => setCheckoutOpen(null)}
            className="mt-4 text-xs text-muted-foreground underline"
          >
            cancel
          </button>
        </section>
      )}
    </main>
  );
}
