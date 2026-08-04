import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FederationPeers } from "@/components/audit/FederationPeers";

export const Route = createFileRoute("/mesh")({
  head: () => ({
    meta: [
      { title: "Nebulous Mesh · Sovereign Internet Overlay" },
      {
        name: "description",
        content:
          "WireGuard sovereign overlay: exit node, laptop peer, phone peer. Encrypted routing plane above any physical carrier.",
      },
      { property: "og:title", content: "Nebulous Mesh · Sovereign Internet Overlay" },
      {
        property: "og:description",
        content:
          "Encrypted routing plane above the carrier. WireGuard peers, private DNS, signed health telemetry.",
      },
    ],
  }),
  component: MeshPage,
});

type NodeRole = "exit" | "peer";
type Node = {
  id: string;
  role: NodeRole;
  label: string;
  endpoint: string;
  internal: string;
  region: string;
};

const NODES: Node[] = [
  {
    id: "terminus-tesseractus",
    role: "exit",
    label: "TERMINUS-TESSERACTUS",
    endpoint: "204.168.210.161:51820",
    internal: "10.9.0.1/24",
    region: "Helsinki · Hetzner",
  },
  {
    id: "laptop",
    role: "peer",
    label: "LAPTOP",
    endpoint: "dynamic",
    internal: "10.9.0.2/32",
    region: "roaming",
  },
  {
    id: "phone",
    role: "peer",
    label: "PHONE",
    endpoint: "dynamic",
    internal: "10.9.0.3/32",
    region: "roaming",
  },
];

const TRUTH = [
  "A device still needs a physical carrier: Wi-Fi, Ethernet, cellular, satellite, LoRa, or a reachable peer.",
  "The sovereign layer is the encrypted routing/control plane above that carrier — not a replacement for it.",
  "Integrity target 99.4% is claimed ONLY after measured uptime, packet, DNS, and route telemetry prove it.",
];

const ARCHITECTURE = [
  ["Public gateway", "Hetzner / Manus / VPS with static IPs"],
  ["Device clients", "Laptop + phone WireGuard profiles"],
  ["Routing", "AllowedIPs 0.0.0.0/0, ::/0 — full-tunnel"],
  ["NAT", "iptables/nftables masquerade on exit node"],
  ["DNS", "Private resolver first · Quad9 / Cloudflare fallback"],
  ["Health", "handshake age · packet counters · DNS success · route probe · exit-IP verify"],
];

function MeshPage() {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(id: string, text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1200);
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-12">
      <header className="space-y-3 border-b border-border pb-6">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
            NEBULOUS MESH · CYCLE 002
          </div>
          <Link
            to="/"
            className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold"
          >
            ← axis
          </Link>
        </div>
        <h1 className="font-display text-3xl tracking-[0.1em] text-foreground">
          <span className="text-gold">◇</span>&nbsp; Sovereign Internet Overlay
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Encrypted routing plane above any physical carrier. WireGuard peers
          converge on an exit node with full-tunnel routing, NAT masquerade,
          and private DNS. Health is signed and measured, not asserted.
        </p>
      </header>

      <section className="space-y-3">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
          truth constraint
        </div>
        <ul className="space-y-2">
          {TRUTH.map((t, i) => (
            <li
              key={i}
              className="rounded border border-border bg-card/40 p-3 font-mono text-[0.78rem] text-foreground"
            >
              <span className="text-gold">◦</span> {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
          topology
        </div>
        <div className="grid gap-2">
          {NODES.map((n) => (
            <div
              key={n.id}
              className={`rounded border bg-card/40 p-4 ${
                n.role === "exit" ? "border-gold/70" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-mono text-[0.78rem] uppercase tracking-[0.16em] text-foreground">
                  {n.label}{" "}
                  <span className="text-muted-foreground">· {n.region}</span>
                </div>
                <div
                  className={`font-mono text-[0.65rem] uppercase tracking-[0.2em] ${
                    n.role === "exit" ? "text-gold" : "text-muted-foreground"
                  }`}
                >
                  {n.role === "exit" ? "gateway / exit" : "peer"}
                </div>
              </div>
              <div className="mt-2 grid gap-1 font-mono text-[0.65rem] text-muted-foreground sm:grid-cols-2">
                <span>
                  endpoint:{" "}
                  <span className="text-foreground">{n.endpoint}</span>
                </span>
                <span>
                  internal:{" "}
                  <span className="text-foreground">{n.internal}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
          architecture
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {ARCHITECTURE.map(([k, v]) => (
            <div
              key={k}
              className="rounded border border-border bg-card/40 p-3 font-mono text-[0.72rem]"
            >
              <div className="uppercase tracking-[0.18em] text-gold">{k}</div>
              <div className="mt-1 text-foreground">{v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
          deployment · exit node
        </div>
        <CodeBlock
          id="setup"
          copied={copied}
          onCopy={copy}
          code={`chmod +x setup-exit-node.sh
sudo ./setup-exit-node.sh
# installs wireguard + iptables
# enables IPv4 forwarding
# applies NAT masquerade on wg0
# starts wg-quick@wg0`}
        />
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
          client
        </div>
        <CodeBlock
          id="client"
          copied={copied}
          onCopy={copy}
          code={`# laptop
wg-quick up ./wg0-laptop.conf

# phone (QR)
qrencode -t ansiutf8 < wg0-phone.conf`}
        />
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
          verify
        </div>
        <CodeBlock
          id="verify"
          copied={copied}
          onCopy={copy}
          code={`chmod +x health-check.sh
./health-check.sh
# asserts: external IP == 204.168.210.161
# asserts: DNS resolves through tunnel
# reports: handshake age + packet counters`}
        />
      </section>

      <section className="space-y-3">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
          accepted commands
        </div>
        <div className="rounded border border-border bg-card/40 p-4 font-mono text-[0.72rem] text-foreground">
          sam.mesh-cycle · sam.mesh · sam.nebulous · sam.internet ·
          sam.sovereign-internet · sam.nebula
        </div>
      </section>

      <FederationPeers />


      <section className="rounded border border-border bg-card/40 p-4">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
          what this is not — yet
        </div>
        <p className="mt-2 text-sm text-foreground">
          This overlay does not create internet from nothing. To claim
          carrier-independent connectivity, add radio, satellite, or community
          mesh backhaul at the physical layer. Everything above assumes a
          reachable carrier underneath.
        </p>
      </section>
    </div>
  );
}

function CodeBlock({
  id,
  code,
  copied,
  onCopy,
}: {
  id: string;
  code: string;
  copied: string | null;
  onCopy: (id: string, text: string) => void;
}) {
  return (
    <div className="relative rounded border border-border bg-card/40">
      <button
        onClick={() => onCopy(id, code)}
        className="absolute right-2 top-2 rounded border border-gold px-2 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-gold transition hover:bg-gold/10"
      >
        {copied === id ? "copied" : "copy"}
      </button>
      <pre className="overflow-x-auto p-4 pr-20 font-mono text-[0.72rem] leading-relaxed text-foreground">
        {code}
      </pre>
    </div>
  );
}
