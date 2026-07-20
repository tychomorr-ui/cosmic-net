import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
  head: () => ({
    meta: [
      { title: "Developer Docs — cMAP MCP Server" },
      {
        name: "description",
        content:
          "Connect ChatGPT, Claude Desktop, Cursor, and VS Code to the cMAP MCP server. Tool reference and code snippets for verified provenance stamping.",
      },
      { property: "og:title", content: "Developer Docs — cMAP MCP Server" },
      {
        property: "og:description",
        content: "MCP connection guide + tool reference for verified provenance stamping.",
      },
    ],
  }),
});

const TOOLS = [
  {
    name: "provenance_record",
    tier: "Starter · Pro",
    desc: "Record a SHA-256 hash as a signed provenance stamp on the caller's account. Fast, no external calls.",
    input: `{ "sha256": "…64 hex chars…", "label": "optional label" }`,
  },
  {
    name: "provenance_ots_stamp",
    tier: "Starter · Pro",
    desc: "Submit a SHA-256 to public OpenTimestamps calendars for Bitcoin anchoring, then persist calendar receipts.",
    input: `{ "sha256": "…64 hex chars…", "label": "optional label" }`,
  },
  {
    name: "list_nodes",
    tier: "Starter · Pro",
    desc: "Enumerate cMAP sovereign nodes with signed-status coupling state.",
    input: `{}`,
  },
  {
    name: "list_blades",
    tier: "Starter · Pro",
    desc: "Enumerate OMNI-SAM AXIS blade registry entries.",
    input: `{}`,
  },
  {
    name: "centralization_inventory",
    tier: "Starter · Pro",
    desc: "Report centralization dependencies detected in the current build.",
    input: `{}`,
  },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 md:grid-cols-[8rem_1fr] md:items-baseline">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function DocsPage() {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://cosmictruth.lovable.app";
  const mcpUrl = `${origin}/mcp`;

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Developer Docs</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-wide uppercase text-foreground">
          cMAP MCP Server
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          A Model Context Protocol server for verified data provenance. Every tool call is
          authenticated as a real user via OAuth 2.1; every stamp is a signed receipt in Supabase.
        </p>

        <div className="mt-6 rounded-lg border border-border bg-card/40 p-4">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Server URL
          </div>
          <pre className="mt-1 overflow-x-auto rounded bg-background/60 p-3 font-mono text-xs">
            {mcpUrl}
          </pre>
          <div className="mt-3 flex gap-3 text-xs">
            <Link to="/pricing" className="underline hover:text-foreground">
              Get an API key →
            </Link>
            <Link to="/_authenticated/account" className="underline hover:text-foreground">
              Manage subscription →
            </Link>
          </div>
        </div>
      </header>

      <section className="mt-12">
        <h2 className="text-lg font-semibold uppercase tracking-wide text-foreground">
          Connect your AI client
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The server speaks MCP over Streamable HTTP with OAuth 2.1 discovery. Every listed client
          handles the OAuth handshake for you — sign in with the same email you used to subscribe.
        </p>

        <div className="mt-6 space-y-6">
          <article className="rounded-lg border border-border bg-card/40 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide">Claude Desktop</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Settings → Connectors → Add connector → Remote MCP.
            </p>
            <pre className="mt-3 overflow-x-auto rounded bg-background/60 p-3 font-mono text-xs">
              {`Name: cMAP
URL:  ${mcpUrl}`}
            </pre>
          </article>

          <article className="rounded-lg border border-border bg-card/40 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide">ChatGPT (Codex)</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Settings → Connectors → Custom connector.
            </p>
            <pre className="mt-3 overflow-x-auto rounded bg-background/60 p-3 font-mono text-xs">
              {`Name: cMAP
Transport: HTTP
URL: ${mcpUrl}`}
            </pre>
          </article>

          <article className="rounded-lg border border-border bg-card/40 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide">Cursor</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              <code className="font-mono text-xs">~/.cursor/mcp.json</code> (or workspace{" "}
              <code className="font-mono text-xs">.cursor/mcp.json</code>):
            </p>
            <pre className="mt-3 overflow-x-auto rounded bg-background/60 p-3 font-mono text-xs">
{`{
  "mcpServers": {
    "cmap": {
      "url": "${mcpUrl}"
    }
  }
}`}
            </pre>
          </article>

          <article className="rounded-lg border border-border bg-card/40 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide">VS Code (Copilot Chat)</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              <code className="font-mono text-xs">.vscode/mcp.json</code> in your workspace:
            </p>
            <pre className="mt-3 overflow-x-auto rounded bg-background/60 p-3 font-mono text-xs">
{`{
  "servers": {
    "cmap": {
      "type": "http",
      "url": "${mcpUrl}"
    }
  }
}`}
            </pre>
          </article>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold uppercase tracking-wide text-foreground">
          Tool reference
        </h2>
        <div className="mt-4 space-y-4">
          {TOOLS.map((t) => (
            <article
              key={t.name}
              className="rounded-lg border border-border bg-card/40 p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <code className="font-mono text-sm text-foreground">{t.name}</code>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t.tier}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
              <pre className="mt-3 overflow-x-auto rounded bg-background/60 p-3 font-mono text-xs">
                {t.input}
              </pre>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold uppercase tracking-wide text-foreground">
          Pro webhooks
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          On the Pro tier, every stamp fans out to your registered endpoints. Configure them in{" "}
          <Link to="/_authenticated/account" className="underline hover:text-foreground">
            Account → Webhooks
          </Link>
          . Delivery headers:
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-background/60 p-3 font-mono text-xs">
{`POST <your endpoint>
Content-Type: application/json
User-Agent: cMAP-Provenance-Webhook/1.0
X-CMAP-Event: stamp.recorded
X-CMAP-Timestamp: <unix seconds>
X-CMAP-Signature: <hex hmac_sha256(secret, body)>
X-CMAP-Signature-V1: t=<ts>,v1=<hex hmac_sha256(secret, ts + "." + body)>

{
  "event": "stamp.recorded",
  "delivered_at": "2026-07-20T00:00:00.000Z",
  "stamp": {
    "id": "…uuid…",
    "sha256": "…64 hex chars…",
    "label": "…",
    "kind": "record" | "ots",
    "status": "recorded" | "submitted" | "failed",
    "created_at": "…iso…"
  }
}`}
        </pre>
        <p className="mt-3 text-xs text-muted-foreground">
          Verify by recomputing <code className="font-mono">HMAC-SHA256(secret, raw_body)</code>{" "}
          and comparing to <code className="font-mono">X-CMAP-Signature</code> in constant time.
          Reject anything older than 5 minutes.
        </p>
      </section>

      <section className="mt-12 rounded-lg border border-primary/40 bg-primary/5 p-6">
        <h2 className="text-lg font-semibold uppercase tracking-wide text-foreground">
          Get an API key
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          There's no separate API key — OAuth handshake with your subscribed account is the key.
          Subscribe, then connect any client above.
        </p>
        <Link
          to="/pricing"
          className="mt-4 inline-block rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          See plans →
        </Link>
      </section>

      <Link
        to="/"
        className="mt-10 inline-block text-xs text-muted-foreground hover:text-foreground"
      >
        ← back to cMAP
      </Link>
    </main>
  );
}
