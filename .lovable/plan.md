# Monetize the cMAP MCP server

Turn the current public `/mcp` into a subscription-gated service. Callers (ChatGPT, Claude, Codex, Cursor) sign in via Supabase OAuth, and each tool call checks for an active Stripe subscription before returning data.

## Architecture

```text
ChatGPT / Claude
      │  OAuth 2.1 (Supabase)
      ▼
 /mcp (mcp-js)  ──►  tool handler
      │                 │
      │                 ├─ verify bearer (mcp-js)   ◄─ Supabase auth server
      │                 ├─ load subscription row    ◄─ public.subscriptions
      │                 └─ if active → data
      │                    else      → "upgrade at /pricing"
      ▼
 /pricing (app)  ──►  Stripe Checkout  ──►  webhook  ──►  public.subscriptions
```

## Steps

1. **Enable Lovable Cloud** — required for user accounts + subscription table.
2. **Enable Supabase OAuth server** (`supabase--configure_oauth_server`) and add the consent route at `src/routes/[.]lovable.oauth.consent.tsx`.
3. **Auth UI** — add `/auth` (email + Google), a `_authenticated` layout, and an account page.
4. **Subscriptions table** — `public.subscriptions` (user_id, stripe_customer_id, stripe_sub_id, status, current_period_end, plan). RLS: user can read own row; only service role writes.
5. **Stripe (seamless)** — `enable_stripe_payments`, create one monthly plan (e.g. cMAP MCP Access $19/mo), add `/pricing` page with Checkout button, add `/api/public/webhooks/stripe` to upsert `subscriptions` on `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
6. **Switch MCP to OAuth** — flip `defineMcp` from public to `auth.oauth.issuer(...)` using the direct `https://<project-ref>.supabase.co/auth/v1` issuer built from `VITE_SUPABASE_PROJECT_ID`.
7. **Subscription gate in every tool** — shared helper `requireActiveSubscription(ctx)` that reads `context.getUserId()`, queries `subscriptions` with the admin client, and returns an `isError` MCP result pointing at `/pricing` when inactive. Wrap `list_nodes`, `list_blades`, `centralization_inventory`.
8. **Landing changes** — `/mcp` overview page: what it is, pricing, "Connect to Claude/ChatGPT" instructions, sign-in CTA.
9. **Regenerate MCP manifest** and verify build.

## Technical notes

- MCP has no built-in per-call metering. OpenAI/Anthropic are not the payers — each end user connects their own ChatGPT/Claude to the server, and their Supabase identity is what we bill.
- Stripe fees apply per Stripe's published rates; subscription tier and price are yours to set.
- Rate limits (optional, later): add a `mcp_call_log` table and count per user per minute in the gate.
- Free preview (optional): let the gate return a small subset when no subscription is present, so LLMs can discover the service before paying.

## What I need from you before building

- **Price + plan name** (e.g. "cMAP MCP Access — $19/month"). I'll default to $19/mo if you don't specify.
- **Free tier or hard paywall?** Default: hard paywall — every tool call requires an active subscription.
- **Confirm Google sign-in** in addition to email/password (recommended for ChatGPT/Claude UX).

Reply with the price and free-tier choice and I'll build the whole chain.
