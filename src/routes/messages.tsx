import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CHANNEL_NAME, MAX_ATTEMPTS, MAX_BODY, backoffMs, buildEnvelope, generateKeypair,
  loadConfig, loadInbox, loadOutbox, saveConfig, saveInbox, saveOutbox, verifyEnvelope,
  type MsgEnvelope, type MsgRecord, type MsgState, type PeerConfig,
} from "@/lib/messaging";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages — signed two-peer transport · cMAP" },
      { name: "description", content: "Ed25519-signed, CID-addressed messages between two peers over BroadcastChannel or an operator-configured HTTP overlay." },
      { property: "og:title", content: "Messages — signed two-peer transport · cMAP" },
      { property: "og:description", content: "Signed, CID-addressed two-peer messaging. Local-first, IndexedDB queue, no third-party services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MessagesPage,
});

const BADGE: Record<MsgState, string> = {
  draft: "border-border text-muted-foreground",
  signed: "border-border text-foreground",
  "sent-local": "border-primary/60 text-primary",
  "sent-overlay": "border-primary/60 text-primary",
  "queued-retry": "border-accent text-accent-foreground",
  delivered: "border-gold/60 text-gold",
  acked: "border-gold text-gold",
  rejected: "border-destructive/60 text-destructive",
  failed: "border-destructive/60 text-destructive",
};

function Badge({ state }: { state: MsgState }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] ${BADGE[state]}`}>
      {state}
    </span>
  );
}

const now = () => new Date().toISOString();

function MessagesPage() {
  const [cfg, setCfg] = useState<PeerConfig | null>(null);
  const [outbox, setOutbox] = useState<MsgRecord[]>([]);
  const [inbox, setInbox] = useState<MsgRecord[]>([]);
  const [rejected, setRejected] = useState<{ id: string; reason: string; at: string }[]>([]);
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [lastOverlayOk, setLastOverlayOk] = useState<number | null>(null);

  const cfgRef = useRef<PeerConfig | null>(null);
  cfgRef.current = cfg;
  const chanRef = useRef<BroadcastChannel | null>(null);
  const sentHere = useRef(new Set<string>());
  const inflight = useRef(new Set<string>());
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  // Serialized read-modify-write against IndexedDB (fresh read each time so
  // other tabs' writes are not clobbered).
  const mutOut = useCallback((fn: (r: MsgRecord[]) => MsgRecord[]) => {
    const p = chain.current.then(async () => {
      const next = fn(await loadOutbox());
      await saveOutbox(next);
      setOutbox(next);
      chanRef.current?.postMessage({ kind: "sync" });
    });
    chain.current = p.catch(() => {});
    return p;
  }, []);
  const mutIn = useCallback((fn: (r: MsgRecord[]) => MsgRecord[]) => {
    const p = chain.current.then(async () => {
      const next = fn(await loadInbox());
      await saveInbox(next);
      setInbox(next);
      chanRef.current?.postMessage({ kind: "sync" });
    });
    chain.current = p.catch(() => {});
    return p;
  }, []);
  const patchOut = useCallback(
    (id: string, patch: Partial<MsgRecord>) =>
      mutOut((r) => r.map((m) => (m.env.msg_id === id ? { ...m, ...patch } : m))),
    [mutOut],
  );

  // ---------- boot ----------
  useEffect(() => {
    void (async () => {
      setCfg(await loadConfig());
      setOutbox(await loadOutbox());
      setInbox(await loadInbox());
    })();
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // ---------- Mode A: BroadcastChannel ----------
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(CHANNEL_NAME);
    chanRef.current = ch;
    ch.onmessage = async (ev) => {
      const data = ev.data as { kind: string; env?: MsgEnvelope };
      if (data.kind === "sync") {
        setOutbox(await loadOutbox());
        setInbox(await loadInbox());
        return;
      }
      if (data.kind !== "env" || !data.env) return;
      const env = data.env;
      if (sentHere.current.has(env.msg_id)) return;
      const v = await verifyEnvelope(env);

      if (env.type === "ack") {
        if (!env.in_reply_to || !sentHere.current.has(env.in_reply_to)) return;
        if (!v.ok) {
          setRejected((r) => [{ id: env.msg_id, reason: `ack ${v.reason}`, at: now() }, ...r]);
          return;
        }
        const t = now();
        await mutOut((r) =>
          r.map((m) =>
            m.env.msg_id === env.in_reply_to
              ? { ...m, state: "acked", delivered_at: m.delivered_at ?? t, acked_at: t, sig_valid: true }
              : m,
          ),
        );
        return;
      }

      if (!v.ok) {
        setRejected((r) => [{ id: env.msg_id, reason: v.reason ?? "verification failed", at: now() }, ...r]);
        return;
      }
      await mutIn((r) =>
        r.some((m) => m.env.msg_id === env.msg_id)
          ? r
          : [{ env, state: "delivered", transport: "local", sig_valid: true, delivered_at: now(), attempts: 0, read: false }, ...r],
      );
      const c = cfgRef.current;
      if (c?.my_private_key) {
        const ack = await buildEnvelope(c, {
          recipient: env.sender_peer_id, body: "", type: "ack", in_reply_to: env.msg_id, prev_cid: null,
        });
        sentHere.current.add(ack.msg_id);
        ch.postMessage({ kind: "env", env: ack });
      }
    };
    return () => {
      ch.close();
      chanRef.current = null;
    };
  }, [mutIn, mutOut]);

  // ---------- Mode B: HTTP overlay ----------
  const deliverOverlay = useCallback(
    async (rec: MsgRecord) => {
      const c = cfgRef.current;
      if (!c?.peer_address || inflight.current.has(rec.env.msg_id)) return;
      inflight.current.add(rec.env.msg_id);
      try {
        const res = await fetch(c.peer_address, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(rec.env),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setLastOverlayOk(Date.now());
        const sentAt = now();
        let ack: MsgEnvelope | null = null;
        try { ack = (await res.json()) as MsgEnvelope; } catch { ack = null; }
        if (ack && ack.type === "ack" && ack.in_reply_to === rec.env.msg_id) {
          const v = await verifyEnvelope(ack, c.peer_public_key || undefined);
          if (v.ok) {
            await patchOut(rec.env.msg_id, { state: "acked", sent_at: sentAt, delivered_at: sentAt, acked_at: now(), attempts: rec.attempts + 1 });
            return;
          }
          await patchOut(rec.env.msg_id, { state: "sent-overlay", sent_at: sentAt, reason: `ack rejected: ${v.reason}`, attempts: rec.attempts + 1 });
          return;
        }
        await patchOut(rec.env.msg_id, { state: "sent-overlay", sent_at: sentAt, reason: "200 without a valid ack", attempts: rec.attempts + 1 });
      } catch (err) {
        const attempts = rec.attempts + 1;
        await patchOut(
          rec.env.msg_id,
          attempts >= MAX_ATTEMPTS
            ? { state: "failed", attempts, reason: (err as Error).message, next_retry_at: undefined }
            : { state: "queued-retry", attempts, reason: (err as Error).message, next_retry_at: Date.now() + backoffMs(attempts) },
        );
      } finally {
        inflight.current.delete(rec.env.msg_id);
      }
    },
    [patchOut],
  );

  // Durable queue ticker: resume signed / queued-retry, downgrade stale sent-overlay.
  useEffect(() => {
    if (!cfg) return;
    const tick = async () => {
      const c = cfgRef.current;
      if (!c?.peer_address) return;
      const list = await loadOutbox();
      const t = Date.now();
      for (const m of list) {
        if (m.transport !== "overlay") continue;
        if (m.state === "signed" || (m.state === "queued-retry" && (m.next_retry_at ?? 0) <= t)) {
          void deliverOverlay(m);
        } else if (m.state === "sent-overlay" && m.sent_at && t - Date.parse(m.sent_at) > 60_000) {
          await patchOut(m.env.msg_id, { state: "queued-retry", next_retry_at: t, reason: "no ack within 60s" });
        }
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 5_000);
    return () => window.clearInterval(id);
  }, [cfg, deliverOverlay, patchOut]);

  // ---------- actions ----------
  const updateCfg = (patch: Partial<PeerConfig>) => setCfg((c) => (c ? { ...c, ...patch } : c));

  const onGenerate = async () => {
    if (!cfg) return;
    const kp = generateKeypair();
    const next = { ...cfg, my_public_key: kp.pub, my_private_key: kp.priv };
    setCfg(next);
    await saveConfig(next);
    toast.success("Keypair generated and stored in IndexedDB");
  };
  const onSaveCfg = async () => {
    if (!cfg) return;
    if (cfg.peer_public_key && !/^[0-9a-fA-F]{64}$/.test(cfg.peer_public_key)) {
      toast.error("Peer public key must be 64 hex chars");
      return;
    }
    await saveConfig(cfg);
    toast.success("Peer config saved");
  };
  const onExport = async () => {
    if (!cfg?.my_public_key) return;
    await navigator.clipboard.writeText(cfg.my_public_key);
    toast.success("Public key copied");
  };

  const onSend = async () => {
    if (!cfg) return;
    try {
      const prev = outbox.find((m) => m.env.sender_peer_id === cfg.my_peer_id && m.env.type !== "ack");
      const env = await buildEnvelope(cfg, {
        recipient: recipient.trim() || "local-peer",
        body,
        type: "message",
        prev_cid: prev?.env.cid ?? null,
      });
      sentHere.current.add(env.msg_id);
      const overlay = !!cfg.peer_address;
      const rec: MsgRecord = { env, state: "signed", transport: overlay ? "overlay" : "local", sig_valid: true, attempts: 0 };
      await mutOut((r) => [rec, ...r]);
      chanRef.current?.postMessage({ kind: "env", env });
      if (overlay) {
        void deliverOverlay(rec);
      } else {
        await patchOut(env.msg_id, { state: "sent-local", sent_at: now() });
      }
      setBody("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const retryNow = async (m: MsgRecord) => {
    await patchOut(m.env.msg_id, { state: "queued-retry", attempts: 0, next_retry_at: Date.now() });
    void deliverOverlay({ ...m, attempts: 0 });
  };
  const cancel = (m: MsgRecord) => patchOut(m.env.msg_id, { state: "failed", reason: "cancelled by operator", next_retry_at: undefined });

  // ---------- status ----------
  const counts = useMemo(() => {
    const queued = outbox.filter((m) => m.state === "queued-retry" || m.state === "signed").length;
    const sent = outbox.filter((m) => m.state === "sent-local" || m.state === "sent-overlay").length;
    const acked = outbox.filter((m) => m.state === "acked").length;
    return { queued, sent, acked, received: inbox.length, unread: inbox.filter((m) => !m.read).length };
  }, [outbox, inbox]);

  const peerConfigured = !!cfg?.peer_address;
  const overlayStatus = !peerConfigured || !online
    ? "OFFLINE"
    : lastOverlayOk && Date.now() - lastOverlayOk < 10 * 60_000 ? "ACTIVE" : "STANDBY";
  const bcActive = typeof BroadcastChannel !== "undefined";
  const mixedContent =
    peerConfigured && typeof window !== "undefined" && window.location.protocol === "https:" && cfg!.peer_address.startsWith("http:");

  const sendBlock = !cfg
    ? "loading config"
    : !cfg.my_private_key
      ? "generate a keypair first"
      : !body.trim()
        ? "message body is empty"
        : body.length > MAX_BODY
          ? `body exceeds ${MAX_BODY} chars`
          : null;

  const sel = [...outbox, ...inbox].find((m) => m.env.msg_id === selected) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <header className="rounded border border-border bg-card/40 p-4 font-mono text-xs">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">messages · two-peer signed transport</div>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          <div>Mode: <span className="text-gold">{peerConfigured ? "OVERLAY" : "LOCAL"}</span></div>
          <div>My peer: <span className="text-foreground">{cfg?.my_peer_id ?? "—"}</span></div>
          <div>Configured peer: <span className="text-foreground">{cfg?.peer_address || "none"}</span></div>
          <div>Outbox: {counts.queued} queued · {counts.sent} sent · {counts.acked} acked</div>
          <div>Inbox: {counts.received} received · {counts.unread} unread</div>
          <div>
            Transport: BroadcastChannel: <span className={bcActive ? "text-gold" : "text-destructive"}>{bcActive ? "ACTIVE" : "UNSUPPORTED"}</span>
            {" · "}Overlay: <span className={overlayStatus === "ACTIVE" ? "text-gold" : "text-muted-foreground"}>{overlayStatus}</span>
          </div>
        </div>
        {!peerConfigured && <p className="mt-2 text-muted-foreground">no peer configured — local mode only</p>}
        {mixedContent && (
          <p className="mt-2 text-destructive">
            This page is served over HTTPS; browsers block POSTs to plain http:// peers. Use an https:// peer address or run the app locally.
          </p>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* LEFT: compose + outbox */}
        <section className="space-y-4">
          <div className="rounded border border-border bg-card/40 p-4">
            <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">compose</div>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="recipient_peer_id"
              className="mt-2 w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="message body"
              className="mt-2 w-full rounded border border-border bg-background px-2 py-1 text-sm"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[0.65rem] text-muted-foreground">{body.length}/{MAX_BODY}{sendBlock ? ` · ${sendBlock}` : ""}</span>
              <button
                onClick={onSend}
                disabled={!!sendBlock}
                title={sendBlock ?? "Sign, address and send"}
                className="rounded border border-gold px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-gold disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>

          <div className="rounded border border-border bg-card/40 p-4">
            <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">outbox</div>
            {outbox.length === 0 ? (
              <p className="mt-2 font-mono text-xs text-muted-foreground">no messages sent</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {outbox.map((m) => (
                  <li key={m.env.msg_id} className="rounded border border-border bg-background/40 p-2 text-xs">
                    <button className="w-full text-left" onClick={() => setSelected(m.env.msg_id)}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-muted-foreground">→ {m.env.recipient_peer_id} · {m.transport}</span>
                        <Badge state={m.state} />
                      </div>
                      <div className="mt-1 line-clamp-2 break-words">{m.env.body}</div>
                      {m.reason && <div className="mt-1 font-mono text-[0.65rem] text-muted-foreground">{m.reason}</div>}
                    </button>
                    {m.transport === "overlay" && (m.state === "failed" || m.state === "queued-retry") && (
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => retryNow(m)} className="rounded border border-border px-2 py-0.5 font-mono text-[0.6rem] uppercase">retry now</button>
                        {m.state === "queued-retry" && (
                          <button onClick={() => cancel(m)} className="rounded border border-border px-2 py-0.5 font-mono text-[0.6rem] uppercase">cancel</button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* RIGHT: inbox + peer config */}
        <section className="space-y-4">
          <div className="rounded border border-border bg-card/40 p-4">
            <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">inbox</div>
            {rejected.length > 0 && (
              <ul className="mt-2 space-y-1">
                {rejected.slice(0, 5).map((r) => (
                  <li key={r.id + r.at} className="flex items-center justify-between gap-2 rounded border border-destructive/60 p-1.5 font-mono text-[0.65rem] text-destructive">
                    <span className="truncate">{r.id.slice(0, 8)} · {r.reason}</span>
                    <Badge state="rejected" />
                  </li>
                ))}
              </ul>
            )}
            {inbox.length === 0 ? (
              <p className="mt-2 font-mono text-xs text-muted-foreground">no messages received</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {inbox.map((m) => (
                  <li key={m.env.msg_id}>
                    <button
                      className="w-full rounded border border-border bg-background/40 p-2 text-left text-xs"
                      onClick={() => {
                        setSelected(m.env.msg_id);
                        if (!m.read) void mutIn((r) => r.map((x) => (x.env.msg_id === m.env.msg_id ? { ...x, read: true } : x)));
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-muted-foreground">{m.read ? "" : "● "}← {m.env.sender_peer_id}</span>
                        <Badge state={m.state} />
                      </div>
                      <div className="mt-1 line-clamp-2 break-words">{m.env.body}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 font-mono text-[0.65rem] text-muted-foreground">
              Overlay receive requires an external listener; see setup guide. This app runs on a serverless runtime and cannot accept inbound connections — only other open tabs on this device receive via BroadcastChannel.
            </p>
          </div>

          <div className="rounded border border-border bg-card/40 p-4 text-xs">
            <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">peer config</div>
            {cfg && (
              <div className="mt-2 space-y-2">
                <label className="block">my_peer_id
                  <input value={cfg.my_peer_id} onChange={(e) => updateCfg({ my_peer_id: e.target.value })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1 font-mono" />
                </label>
                <div>my_public_key
                  <div className="mt-1 break-all rounded border border-border bg-background/40 px-2 py-1 font-mono text-gold">{cfg.my_public_key || "none — generate a keypair"}</div>
                </div>
                <label className="block">peer_address
                  <input value={cfg.peer_address} onChange={(e) => updateCfg({ peer_address: e.target.value.trim() })} placeholder="http://10.9.0.3:7777/inbox" className="mt-1 w-full rounded border border-border bg-background px-2 py-1 font-mono" />
                </label>
                <label className="block">peer_public_key
                  <input value={cfg.peer_public_key} onChange={(e) => updateCfg({ peer_public_key: e.target.value.trim() })} placeholder="ed25519 hex (64 chars)" className="mt-1 w-full rounded border border-border bg-background px-2 py-1 font-mono" />
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={onGenerate} className="rounded border border-gold px-2 py-1 font-mono text-[0.65rem] uppercase text-gold">
                    {cfg.my_public_key ? "Regenerate keypair" : "Generate my keypair"}
                  </button>
                  <button onClick={onExport} disabled={!cfg.my_public_key} title={cfg.my_public_key ? "" : "no keypair yet"} className="rounded border border-border px-2 py-1 font-mono text-[0.65rem] uppercase disabled:opacity-40">Export my public key</button>
                  <button onClick={onSaveCfg} className="rounded border border-border px-2 py-1 font-mono text-[0.65rem] uppercase">Save peer config</button>
                </div>
                <p className="text-[0.65rem] text-muted-foreground">All key material stays in this browser's IndexedDB. This is a two-peer transport, not a mesh.</p>
              </div>
            )}
          </div>

          {sel && (
            <div className="rounded border border-gold/40 bg-card/40 p-4 font-mono text-[0.7rem]">
              <div className="flex items-center justify-between">
                <span className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">receipt</span>
                <button onClick={() => setSelected(null)} className="text-muted-foreground">close</button>
              </div>
              <dl className="mt-2 space-y-1 break-all">
                <div>msg_id: {sel.env.msg_id}</div>
                <div className="flex items-start gap-2">
                  <span>cid: <span className="text-gold">{sel.env.cid}</span></span>
                  <button onClick={() => void navigator.clipboard.writeText(sel.env.cid).then(() => toast.success("CID copied"))} className="shrink-0 rounded border border-border px-1">copy</button>
                </div>
                <div>prev_cid: {sel.env.prev_cid ?? "null"}</div>
                <div>sig: {sel.sig_valid === null ? "unchecked" : sel.sig_valid ? "valid" : "invalid"}</div>
                <div>created: {sel.env.created_at}</div>
                <div>sent: {sel.sent_at ?? "—"}</div>
                <div>delivered: {sel.delivered_at ?? "—"}</div>
                <div>acked: {sel.acked_at ?? "— (no verified ack)"}</div>
                <div>transport: {sel.transport}</div>
                <div>state: <Badge state={sel.state} /></div>
              </dl>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
