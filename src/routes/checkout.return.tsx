import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/checkout/return")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: ReturnPage,
  head: () => ({
    meta: [
      { title: "Payment received — cMAP" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function ReturnPage() {
  const { session_id } = Route.useSearch();
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold uppercase tracking-wide text-foreground">
        Subscription active
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {session_id
          ? "Your cMAP MCP subscription is confirmed. Connect the MCP server in ChatGPT or Claude to start using the tools."
          : "Payment status unknown. Check your account page."}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/account" className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">
          Go to account
        </Link>
        <Link to="/" className="rounded border border-border px-4 py-2 text-sm">
          Home
        </Link>
      </div>
    </main>
  );
}
