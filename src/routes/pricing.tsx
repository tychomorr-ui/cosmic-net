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
      { name: "description", content: "Subscribe to cMAP MCP Access for $19/month. Connect ChatGPT, Claude, Codex, and Cursor to the sovereign cMAP mesh." },
      { property: "og:title", content: "Pricing — cMAP MCP Access" },
      { property: "og:description", content: "$19/month subscription to the cMAP MCP server for AI assistants." },
    ],
  }),
});

function PricingPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function startCheckout() {
    setError(null);
    if (!session) {
      navigate({ to: "/auth", search: { next: "/pricing" } });
      return;
    }
    if (!isPaymentsConfigured()) {
      setError("Payments are not configured for this build yet.");
      return;
    }
    setStarting(true);
    setCheckoutOpen(true);
  }

  const fetchClientSecret = async (): Promise<string> => {
    const env = getStripeEnvironment();
    const result = await createMcpCheckoutSession({
      data: {
        environment: env,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("No client secret");
    return result.clientSecret;
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-wide uppercase text-foreground">
        cMAP MCP Access
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Connect ChatGPT, Claude, Codex, Cursor, or any MCP client to the cMAP sovereign
        mesh. Read-only access to the OMNI-SAM AXIS blade registry, sovereign node fleet,
        and centralization inventory.
      </p>

      {!checkoutOpen ? (
        <section className="mt-10 grid gap-6">
          <div className="rounded-lg border border-border bg-card/40 p-8">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">$19</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Cancel any time. Managed via secure billing portal.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li>• OAuth 2.1 sign-in from ChatGPT, Claude, Codex, Cursor</li>
              <li>• <code className="font-mono">list_nodes</code>, <code className="font-mono">list_blades</code>, <code className="font-mono">centralization_inventory</code></li>
              <li>• Read-only; zero risk to your data or account</li>
              <li>• Every call is authenticated as your Supabase user</li>
            </ul>
            <button
              onClick={startCheckout}
              disabled={starting}
              className="mt-8 w-full rounded bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {session ? "Subscribe" : "Sign in to subscribe"}
            </button>
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            <p className="mt-4 text-xs text-muted-foreground">
              After you subscribe, connect this URL in your AI client's MCP settings:
              <br />
              <code className="mt-1 inline-block font-mono">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/mcp`
                  : "https://cosmictruth.lovable.app/mcp"}
              </code>
            </p>
          </div>
          <Link to="/" className="text-center text-xs text-muted-foreground hover:text-foreground">
            ← back to cMAP
          </Link>
        </section>
      ) : (
        <section className="mt-10">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
          <button
            onClick={() => setCheckoutOpen(false)}
            className="mt-4 text-xs text-muted-foreground underline"
          >
            cancel
          </button>
        </section>
      )}
    </main>
  );
}
