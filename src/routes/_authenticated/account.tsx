import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createPortalSession } from "@/utils/payments.functions";
import {
  createWebhook,
  deleteWebhook,
  listWebhooks,
} from "@/utils/webhooks.functions";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";

type Sub = {
  status: string;
  plan: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  environment: string;
};

type Hook = {
  id: string;
  url: string;
  active: boolean;
  last_status: number | null;
  last_error: string | null;
  last_delivery_at: string | null;
  created_at: string;
};

const PRO_PRICE_IDS = new Set(["cmap_pro_monthly", "cmap_pro_yearly"]);

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

  const [hooks, setHooks] = useState<Hook[]>([]);
  const [hooksLoading, setHooksLoading] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [creatingHook, setCreatingHook] = useState(false);
  const [freshSecret, setFreshSecret] = useState<{ id: string; secret: string } | null>(null);
  const [hookError, setHookError] = useState<string | null>(null);

  const isPro = !!sub && !!sub.price_id && PRO_PRICE_IDS.has(sub.price_id);

  const refreshHooks = useCallback(async () => {
    setHooksLoading(true);
    setHookError(null);
    const res = await listWebhooks();
    if ("error" in res) setHookError(res.error ?? null);
    else setHooks(res.webhooks as Hook[]);
    setHooksLoading(false);
  }, []);

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

  useEffect(() => {
    if (isPro) void refreshHooks();
  }, [isPro, refreshHooks]);

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

  async function addHook() {
    setHookError(null);
    setFreshSecret(null);
    setCreatingHook(true);
    try {
      const res = await createWebhook({ data: { url: newUrl.trim() } });
      if ("error" in res) throw new Error(res.error);
      setFreshSecret({ id: (res.webhook as any).id, secret: res.secret });
      setNewUrl("");
      await refreshHooks();
    } catch (e) {
      setHookError((e as Error).message);
    } finally {
      setCreatingHook(false);
    }
  }

  async function removeHook(id: string) {
    setHookError(null);
    try {
      const res = await deleteWebhook({ data: { id } });
      if ("error" in res) throw new Error(res.error);
      if (freshSecret?.id === id) setFreshSecret(null);
      await refreshHooks();
    } catch (e) {
      setHookError((e as Error).message);
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
              <span className="ml-2 rounded bg-background/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest">
                {isPro ? "Pro" : "Starter"}
              </span>
              {sub!.cancel_at_period_end ? (
                <span className="ml-2 text-amber-500">(cancels at period end)</span>
              ) : null}
            </p>
            {sub!.current_period_end ? (
              <p className="text-muted-foreground">
                Renews / ends: {new Date(sub!.current_period_end).toLocaleString()}
              </p>
            ) : null}
            <div className="flex gap-3">
              <button
                onClick={openPortal}
                className="mt-3 rounded border border-border bg-background px-4 py-2 text-sm hover:bg-accent"
              >
                Manage billing
              </button>
              {!isPro ? (
                <Link
                  to="/pricing"
                  className="mt-3 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Upgrade to Pro
                </Link>
              ) : null}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-muted-foreground">No active subscription.</p>
            <Link
              to="/pricing"
              className="inline-block rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              See plans
            </Link>
          </div>
        )}
      </section>

      {isPro ? (
        <section className="mt-6 rounded-lg border border-border bg-card/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            Webhook endpoints
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every stamp you record is POSTed to each active endpoint with an{" "}
            <code className="font-mono text-xs">X-CMAP-Signature</code> HMAC-SHA256 header.
            See <Link to="/docs" className="underline">docs</Link> for verification.
          </p>

          <div className="mt-4 flex gap-2">
            <input
              type="url"
              placeholder="https://your-service.example.com/hooks/cmap"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={addHook}
              disabled={creatingHook || !newUrl.trim().startsWith("https://")}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {creatingHook ? "Adding…" : "Add"}
            </button>
          </div>

          {freshSecret ? (
            <div className="mt-4 rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
              <p className="font-semibold uppercase tracking-widest text-emerald-500">
                Signing secret — shown once
              </p>
              <pre className="mt-2 overflow-x-auto font-mono">{freshSecret.secret}</pre>
              <p className="mt-2 text-muted-foreground">
                Store this in your receiving service. It won't be shown again.
              </p>
            </div>
          ) : null}

          {hookError ? (
            <p className="mt-3 text-sm text-destructive">{hookError}</p>
          ) : null}

          <ul className="mt-6 space-y-3">
            {hooksLoading ? (
              <li className="text-sm text-muted-foreground">Loading…</li>
            ) : hooks.length === 0 ? (
              <li className="text-sm text-muted-foreground">No endpoints yet.</li>
            ) : (
              hooks.map((h) => (
                <li
                  key={h.id}
                  className="rounded border border-border bg-background/40 p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs">{h.url}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {h.last_delivery_at
                          ? `Last delivery: ${new Date(h.last_delivery_at).toLocaleString()} · `
                          : "No deliveries yet · "}
                        {h.last_status ? (
                          <span
                            className={
                              h.last_status >= 200 && h.last_status < 300
                                ? "text-emerald-500"
                                : "text-amber-500"
                            }
                          >
                            HTTP {h.last_status}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">idle</span>
                        )}
                        {h.last_error ? (
                          <span className="ml-2 text-destructive">{h.last_error}</span>
                        ) : null}
                      </p>
                    </div>
                    <button
                      onClick={() => removeHook(h.id)}
                      className="rounded border border-border bg-background px-2 py-1 text-[11px] hover:bg-accent"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

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
          Full setup instructions live in the{" "}
          <Link to="/docs" className="underline hover:text-foreground">
            developer docs
          </Link>
          .
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
