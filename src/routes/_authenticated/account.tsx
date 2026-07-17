import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";

type Sub = {
  status: string;
  plan: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  environment: string;
};

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "Account — cMAP" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AccountPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      setEmail(userData.user?.email ?? null);

      if (isPaymentsConfigured()) {
        const env = getStripeEnvironment();
        const { data } = await supabase
          .from("subscriptions")
          .select("status, plan, price_id, current_period_end, cancel_at_period_end, environment")
          .eq("environment", env)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setSub(data as Sub | null);
      }
      setLoading(false);
    })();
  }, []);

  const isActive =
    !!sub &&
    (["active", "trialing"].includes(sub.status) ||
      (sub.status === "canceled" &&
        sub.current_period_end &&
        new Date(sub.current_period_end) > new Date()));

  async function openPortal() {
    setError(null);
    try {
      const env = getStripeEnvironment();
      const result = await createPortalSession({
        data: { environment: env, returnUrl: window.location.href },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { next: undefined } });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-wide uppercase text-foreground">
        Account
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{email}</p>

      <section className="mt-8 rounded-lg border border-border bg-card/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          cMAP MCP subscription
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : isActive ? (
          <div className="mt-4 space-y-3 text-sm">
            <p>
              Status: <span className="font-mono text-emerald-500">{sub!.status}</span>
              {sub!.cancel_at_period_end ? (
                <span className="ml-2 text-amber-500">(cancels at period end)</span>
              ) : null}
            </p>
            {sub!.current_period_end ? (
              <p className="text-muted-foreground">
                Renews / ends: {new Date(sub!.current_period_end).toLocaleString()}
              </p>
            ) : null}
            <button
              onClick={openPortal}
              className="mt-3 rounded border border-border bg-background px-4 py-2 text-sm hover:bg-accent"
            >
              Manage billing
            </button>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-muted-foreground">No active subscription.</p>
            <Link
              to="/pricing"
              className="inline-block rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Subscribe — $19/month
            </Link>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          Connect to ChatGPT / Claude
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          In your AI client's connectors, add a remote MCP server:
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-background/60 p-3 text-xs">
          {typeof window !== "undefined"
            ? `${window.location.origin}/mcp`
            : "https://cosmictruth.lovable.app/mcp"}
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          The client will walk you through OAuth. Sign in with the same account, approve, and the tools will appear.
        </p>
      </section>

      <button
        onClick={signOut}
        className="mt-8 text-xs text-muted-foreground underline hover:text-foreground"
      >
        Sign out
      </button>
    </main>
  );
}
