import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  generateOperatorKeys,
  loadOperatorKeys,
  saveOperatorKeys,
  clearOperatorKeys,
  signEnrollment,
  fingerprint,
  type OperatorKeys,
} from "@/lib/sovereign-keys";
import { composeWgConfig, downloadText } from "@/lib/wg-config";
import { valueToCid } from "@/lib/cid";
import { loadFleet, upsertFleetNode, removeFleetNode, type FleetNode } from "@/data/fleet";

export const Route = createFileRoute("/gateway")({
  head: () => ({
    meta: [
      { title: "Gateway Registry · Nexinus Terminus" },
      {
        name: "description",
        content:
          "Sovereign control plane for the archangeld fleet. In-browser ed25519/x25519 keygen, signed enrollment, WireGuard config issuance.",
      },
      { property: "og:title", content: "Gateway Registry · Nexinus Terminus" },
      {
        property: "og:description",
        content: "Browser-side keygen and signed peer enrollment for the archangeld fleet.",
      },
    ],
  }),
  component: GatewayPage,
});

function GatewayPage() {
  const [keys, setKeys] = useState<OperatorKeys | null>(null);
  const [fleet, setFleet] = useState<FleetNode[]>([]);
  const [revealPriv, setRevealPriv] = useState(false);

  useEffect(() => {
    setKeys(loadOperatorKeys());
    setFleet(loadFleet());
  }, []);

  function onGenerate() {
    if (keys && !confirm("Operator keys exist. Replace them? Existing enrollments will not migrate.")) return;
    const k = generateOperatorKeys();
    saveOperatorKeys(k);
    setKeys(k);
    setRevealPriv(false);
  }

  function onClear() {
    if (!confirm("Wipe operator keys from this device? Irreversible.")) return;
    clearOperatorKeys();
    setKeys(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="border-b border-border pb-6">
        <div className="text-[0.7rem] uppercase tracking-[0.2em] text-gold">
          Gateway · Master Registry · Reference Contract
        </div>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          archangeld control plane
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          This page is the in-browser composer for the archangeld handshake. All key
          material is generated, stored, and signed on this device. The remote nodes
          remain agnostic executors — the wire format below is the only contract between
          this control plane and any conforming node-side daemon.
        </p>
      </header>

      <OperatorPanel
        keys={keys}
        onGenerate={onGenerate}
        onClear={onClear}
        revealPriv={revealPriv}
        toggleReveal={() => setRevealPriv((v) => !v)}
      />

      <EnrollPanel
        keys={keys}
        onEnrolled={(n) => setFleet(upsertFleetNode(n))}
      />

      <FleetPanel
        keys={keys}
        fleet={fleet}
        onRemove={(id) => setFleet(removeFleetNode(id))}
      />

      <ContractPanel />
    </div>
  );
}

function OperatorPanel({
  keys,
  onGenerate,
  onClear,
  revealPriv,
  toggleReveal,
}: {
  keys: OperatorKeys | null;
  onGenerate: () => void;
  onClear: () => void;
  revealPriv: boolean;
  toggleReveal: () => void;
}) {
  return (
    <section className="mt-8 border border-border bg-card/30 p-6">
      <div className="flex items-center justify-between">
        <div className="text-[0.7rem] uppercase tracking-[0.2em] text-gold">Operator Identity</div>
        <div className="flex gap-2">
          <button
            onClick={onGenerate}
            className="border border-gold px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-gold hover:bg-gold hover:text-background"
          >
            {keys ? "Rotate Keys" : "Generate Keys"}
          </button>
          {keys && (
            <button
              onClick={onClear}
              className="border border-destructive px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-destructive hover:bg-destructive hover:text-background"
            >
              Wipe
            </button>
          )}
        </div>
      </div>
      {!keys ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No operator keys on this device. Generate to mint a fresh ed25519 identity and
          x25519 WireGuard peer pair. Private material is held in this browser's
          localStorage only — never transmitted.
        </p>
      ) : (
        <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
          <Field label="ed25519 public key (operator)" value={keys.edPubHex} mono />
          <Field label="ed25519 fingerprint" value={fingerprint(keys.edPubHex)} mono />
          <Field label="x25519 public key (WireGuard)" value={keys.xPubBase64} mono />
          <Field label="created" value={new Date(keys.createdAt).toISOString()} mono />
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                ed25519 private key
              </span>
              <button
                onClick={toggleReveal}
                className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold"
              >
                {revealPriv ? "hide" : "reveal"}
              </button>
            </div>
            <div className="mt-1 break-all border border-border bg-background/60 p-2 font-mono text-[0.7rem]">
              {revealPriv ? keys.edPrivHex : "•".repeat(64)}
            </div>
          </div>
        </dl>
      )}
    </section>
  );
}

function EnrollPanel({
  keys,
  onEnrolled,
}: {
  keys: OperatorKeys | null;
  onEnrolled: (n: FleetNode) => void;
}) {
  const [nodeLabel, setNodeLabel] = useState("Tesseract-A");
  const [nodeId, setNodeId] = useState("tesseract-a");
  const [region, setRegion] = useState("Operator-held");
  const [endpoint, setEndpoint] = useState("tesseract-a.xinus.one:51820");
  const [statusUrl, setStatusUrl] = useState("https://tesseract-a.xinus.one/status");
  const [edPubHex, setEdPubHex] = useState("");
  const [serverXPub, setServerXPub] = useState("");
  const [assignedIp, setAssignedIp] = useState("10.42.0.42/32");
  const [dns, setDns] = useState("10.42.0.1");

  const [nonce, setNonce] = useState<string>("");
  const [sig, setSig] = useState<string>("");
  const [cid, setCid] = useState<string>("");

  function freshNonce() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    setNonce(Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
    setSig("");
    setCid("");
  }

  async function signAndIssue() {
    if (!keys || !nonce || !edPubHex || !serverXPub) return;
    const { sigHex, xPubHex } = signEnrollment(keys, nonce);
    setSig(sigHex);
    const enrollment = {
      v: "ARCHANGEL/v0",
      nonce,
      client_ed_pub: keys.edPubHex,
      client_x25519_pub: xPubHex,
      device_label: nodeLabel,
      sig_ed25519: sigHex,
    };
    setCid(await valueToCid(enrollment));
  }

  function issueConfAndRegister() {
    if (!keys) return;
    const conf = composeWgConfig({
      clientPrivBase64: keys.xPrivBase64,
      clientAddress: assignedIp,
      dns,
      serverPubBase64: serverXPub,
      serverEndpoint: endpoint,
    });
    downloadText(`${nodeId}.conf`, conf);
    onEnrolled({
      id: nodeId,
      label: nodeLabel,
      region,
      endpoint,
      statusUrl,
      edPubHex: edPubHex.trim().toLowerCase(),
      serverXPubBase64: serverXPub.trim(),
      enrolledAt: Date.now(),
    });
  }

  const ready = Boolean(keys && nonce && sig && edPubHex && serverXPub);

  return (
    <section className="mt-6 border border-border bg-card/30 p-6">
      <div className="text-[0.7rem] uppercase tracking-[0.2em] text-gold">
        Enroll Node · ARCHANGEL/v0 Handshake
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Generate a nonce, sign the canonical message with your ed25519 key, then issue
        the WireGuard config locally. Node-side <code className="text-gold">archangeld</code>
        verifies the signature against its allow-list before binding the peer.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <TextField label="Node ID (slug)" v={nodeId} set={setNodeId} />
        <TextField label="Node Label" v={nodeLabel} set={setNodeLabel} />
        <TextField label="Region" v={region} set={setRegion} />
        <TextField label="WG Endpoint (host:port)" v={endpoint} set={setEndpoint} />
        <TextField label="Status URL (signed /status)" v={statusUrl} set={setStatusUrl} />
        <TextField label="Assigned Address (CIDR)" v={assignedIp} set={setAssignedIp} />
        <TextField label="DNS (in-tunnel resolver)" v={dns} set={setDns} />
        <TextField
          label="Node ed25519 pubkey (hex, 64)"
          v={edPubHex}
          set={setEdPubHex}
          placeholder="paste from archangeld first boot"
        />
        <div className="sm:col-span-2">
          <TextField
            label="Node x25519 pubkey (base64, WireGuard)"
            v={serverXPub}
            set={setServerXPub}
            placeholder="paste `wg pubkey` output"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          onClick={freshNonce}
          disabled={!keys}
          className="border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-foreground hover:border-gold hover:text-gold disabled:opacity-40"
        >
          1 · Fresh Nonce
        </button>
        <button
          onClick={signAndIssue}
          disabled={!keys || !nonce}
          className="border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-foreground hover:border-gold hover:text-gold disabled:opacity-40"
        >
          2 · Sign Enrollment
        </button>
        <button
          onClick={issueConfAndRegister}
          disabled={!ready}
          className="border border-gold px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-gold hover:bg-gold hover:text-background disabled:opacity-40"
        >
          3 · Issue .conf + Register
        </button>
      </div>

      {(nonce || sig || cid) && (
        <dl className="mt-5 grid gap-2 text-xs">
          {nonce && <Field label="nonce" value={nonce} mono />}
          {sig && <Field label="ed25519 signature" value={sig} mono />}
          {cid && <Field label="enrollment receipt (CIDv1)" value={cid} mono />}
        </dl>
      )}
    </section>
  );
}

function FleetPanel({
  keys,
  fleet,
  onRemove,
}: {
  keys: OperatorKeys | null;
  fleet: FleetNode[];
  onRemove: (id: string) => void;
}) {
  return (
    <section className="mt-6 border border-border bg-card/30 p-6">
      <div className="flex items-center justify-between">
        <div className="text-[0.7rem] uppercase tracking-[0.2em] text-gold">
          Local Registry · {fleet.length} node{fleet.length === 1 ? "" : "s"}
        </div>
        {keys && fleet.length > 0 && (
          <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
            stored in this browser only
          </span>
        )}
      </div>
      {fleet.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No nodes registered on this device. Complete an enrollment above to add one.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {fleet.map((n) => (
            <li key={n.id} className="border border-border bg-background/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono text-xs text-foreground">{n.label}</div>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${n.label} from registry?`)) onRemove(n.id);
                  }}
                  className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive"
                >
                  remove
                </button>
              </div>
              <dl className="mt-2 grid gap-1 text-[0.7rem]">
                <Field label="endpoint" value={n.endpoint} mono />
                <Field label="status url" value={n.statusUrl} mono />
                <Field label="ed25519 fp" value={fingerprint(n.edPubHex)} mono />
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ContractPanel() {
  const spec = `POST {node}/archangel/enroll
Content-Type: application/json

{
  "v": "ARCHANGEL/v0",
  "nonce": "<32B hex from GET /archangel/challenge>",
  "client_ed_pub": "<hex>",
  "client_x25519_pub": "<hex>",
  "device_label": "<string>",
  "sig_ed25519": "<ed25519(\\"ARCHANGEL/v0\\\\n\\" + nonce + \\"\\\\n\\" + client_x25519_pub)>"
}

→ 200 {
  "assigned_ip": "10.42.0.42/32",
  "server_x25519_pub": "<base64>",
  "server_endpoint": "host:port",
  "dns": "10.42.0.1",
  "cidv1_receipt": "<bafy...>"
}`;
  return (
    <section className="mt-6 border border-border bg-background/60 p-6">
      <div className="text-[0.7rem] uppercase tracking-[0.2em] text-gold">
        Wire Format · Reference Contract
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Any node implementing this contract is conforming. The Go reference daemon ships
        in <code className="text-gold">node-daemon/</code> at the repo root.
      </p>
      <pre className="mt-3 overflow-auto border border-border bg-background p-3 font-mono text-[0.7rem] leading-relaxed text-foreground/85">
        {spec}
      </pre>
    </section>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border border-border bg-background/60 p-2">
      <dt className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-all ${mono ? "font-mono text-[0.7rem]" : "text-xs"} text-foreground`}>
        {value}
      </dd>
    </div>
  );
}

function TextField({
  label,
  v,
  set,
  placeholder,
}: {
  label: string;
  v: string;
  set: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <input
        value={v}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-border bg-background/60 px-2 py-1 font-mono text-[0.72rem] text-foreground outline-none focus:border-gold"
      />
    </label>
  );
}
