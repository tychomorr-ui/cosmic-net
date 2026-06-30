import { type ReactNode, memo, useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTickerEvents } from "@/lib/probe-store";
import {
  LayoutGrid,
  Hammer,
  Eye,
  Network,
  Banknote,
  Crosshair,
  TerminalSquare,
  Compass,
  Crown,
  Gem,
  Sparkles,
  Triangle,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { NebulaBackdrop } from "./NebulaBackdrop";

type NavItem = {
  name: string;
  path: string;
  icon: LucideIcon;
  sigil: string;
  code: string;
};

const NAV: NavItem[] = [
  { name: "Alpha Dashboard",  path: "/",                icon: LayoutGrid,     sigil: "⊕", code: "ALPHA" },
  { name: "Reflective Intel", path: "/reflective-intel",icon: Eye,            sigil: "◉", code: "MIRROR" },
  { name: "Network NEBULA",   path: "/nebula",          icon: Network,        sigil: "✺", code: "NEBULA" },
  { name: "TERMINUS",         path: "/ops",             icon: TerminalSquare, sigil: "▣", code: "TERMI" },
  { name: "SAM Command",      path: "/sam-command",     icon: Compass,        sigil: "✧", code: "OMNI" },
  { name: "PAM Monarch",      path: "/pam",             icon: Crown,          sigil: "♕", code: "PAM" },
  { name: "Digital Ore",      path: "/digital-ore",     icon: Gem,            sigil: "⛬", code: "ORE" },
  { name: "Truth Substrate",  path: "/sudo-coin",       icon: Sparkles,       sigil: "◈", code: "TRS" },
  { name: "QUANTOTALUS",      path: "/quantotalus",     icon: Triangle,       sigil: "◬", code: "QUANT" },
  { name: "PROOF FULCRUM",    path: "/proof-fulcrum",   icon: ShieldCheck,    sigil: "◇", code: "PROOF" },
];

const STANCE_FEED: Array<{ tag: string; msg: string }> = [
  { tag: "STANCE",      msg: "zero third-party telemetry · zero vendor middleware · local-first" },
  { tag: "PAM",         msg: "in-browser WebGPU runtime · no packets leave during inference" },
  { tag: "SAA",         msg: "sovereign-node proxy · /api/saa/{stripe|paypal|chain|cashapp} · secrets node-side" },
];

const CrtOverlay = memo(function CrtOverlay() {
  return (
    <div
      className="crt-scanlines crt-vignette pointer-events-none absolute inset-0"
      style={{ willChange: "transform" }}
    />
  );
});

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours();
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const isDay = h >= 6 && h < 18;
  const dayHour = isDay ? String(h - 5).padStart(2, "0") : null;
  const nightHour = !isDay ? String(h < 6 ? h + 7 : h - 17).padStart(2, "0") : null;
  const utc = now.toISOString().slice(11, 19);

  // Live ticker: Archangel probe events (sliding window, 64). Synced to the
  // 1Hz global clock — `now` invalidates this memo each tick.
  const events = useTickerEvents();
  const tickerItems = useMemo(() => {
    void now; // keep ticker re-render aligned to clock tick
    const stateCls = (s: string) =>
      s === "measured"     ? "text-gold"
      : s === "reachable"  ? "text-primary"
      : s === "probing"    ? "text-primary/70"
      : s === "unreachable"? "text-destructive"
      : "text-muted-foreground";
    const live = events.slice(0, 24).map((e) => ({
      key: `e-${e.id}`,
      tag: e.tag,
      cls: stateCls(e.state),
      msg: e.detail,
    }));
    const stance = STANCE_FEED.map((f, i) => ({
      key: `s-${i}`,
      tag: f.tag,
      cls: "text-primary/70",
      msg: f.msg,
    }));
    return [...live, ...stance];
  }, [events, now]);


  return (
    <div className="crt-flicker relative flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 z-0">
        <NebulaBackdrop />
      </div>

      {/* Header — sovereign command bar */}
      <header className="relative z-10 border-b border-border bg-background/70 backdrop-blur">
        <div className="flex items-stretch">
          <Link to="/" className="flex items-center gap-3 border-r border-border bg-primary/5 px-4 py-2">
            <div className="relative h-9 w-9">
              <svg viewBox="0 0 36 36" className="spin-slow absolute inset-0 text-primary">
                <polygon points="18,2 34,18 18,34 2,18" fill="none" stroke="currentColor" strokeWidth="0.6" />
                <polygon points="18,8 28,18 18,28 8,18" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.7" />
                <line x1="2" y1="18" x2="34" y2="18" stroke="currentColor" strokeWidth="0.3" opacity="0.4" />
                <line x1="18" y1="2" x2="18" y2="34" stroke="currentColor" strokeWidth="0.3" opacity="0.4" />
              </svg>
              <svg viewBox="0 0 36 36" className="spin-reverse absolute inset-0 text-primary/60">
                <polygon points="18,6 30,18 18,30 6,18" fill="none" stroke="currentColor" strokeWidth="0.4" />
              </svg>
            </div>
            <div>
              <div className="display-font phosphor-glow text-[15px] leading-none text-primary">tesseract terminus</div>
              <div className="mt-1 text-[10px] tracking-[0.3em] text-muted-foreground">KETHER_GATE · v1.3.0</div>
            </div>
          </Link>

          <div className="hidden items-center gap-6 border-r border-border px-5 text-[11px] md:flex">
            <div title="nexinus.net · 5.223.65.20 · SSL valid">
              <div className="text-muted-foreground">TESSERACT-A</div>
              <div className="phosphor-soft tracking-wider text-primary">nexinus.net</div>
            </div>
            <div title="valkyrie.nexinus.net · 5.78.148.244 · SSL valid">
              <div className="text-muted-foreground">VALKYRIE</div>
              <div className="phosphor-soft text-primary">dark mirror</div>
            </div>
            <div title="kether.nexinus.net · SSL pending">
              <div className="text-muted-foreground">KETHER-GATE</div>
              <div className="phosphor-soft text-primary/70">ssl · pending</div>
            </div>
            <div className="flex items-center gap-3" title="day 06:00 → 18:00 · night 18:00 → 06:00">
              <div className={isDay ? "phosphor-glow text-primary" : "text-muted-foreground/40"}>
                <div className="text-[10px] tracking-widest">☼ DAY</div>
                <div className="terminal-font mt-1 text-sm leading-none">
                  {isDay ? `${dayHour}:${mm}:${ss}` : "—— : —— : ——"}
                </div>
              </div>
              <div className="h-7 w-px bg-border" />
              <div className={!isDay ? "phosphor-glow text-primary" : "text-muted-foreground/40"}>
                <div className="text-[10px] tracking-widest">☽ NIGHT</div>
                <div className="terminal-font mt-1 text-sm leading-none">
                  {!isDay ? `${nightHour}:${mm}:${ss}` : "—— : —— : ——"}
                </div>
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4 px-4 text-[11px]">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-muted-foreground">OPERATOR</div>
              <div className="phosphor-soft text-primary">Tyler Morris · Nexinus RI Systems LLC</div>
              <div className="text-[9px] tracking-widest text-muted-foreground/70">@tychomorr · SOV-ROOT</div>
            </div>
            <div className="hidden items-center gap-2 text-muted-foreground lg:flex">
              <span>#XINUS</span><span>·</span><span>#RealChange</span>
            </div>
            <div className="pulse-dot h-2 w-2 rounded-full bg-primary" title="live" />
          </div>
        </div>

        {/* Top ticker */}
        <div className="relative flex h-7 items-center overflow-hidden border-b border-border bg-black/80 backdrop-blur">
          <div className="flex h-full flex-shrink-0 items-center gap-2 border-r border-border bg-primary/10 px-3">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="terminal-font text-sm leading-none text-primary">UPLINK {utc} UTC</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex h-full items-center gap-0 overflow-x-auto whitespace-nowrap" style={{ scrollbarWidth: "none" }}>
              {tickerItems.length === 0 ? (
                <span className="px-4 text-[11px] text-muted-foreground">awaiting first archangel heartbeat…</span>
              ) : (
                tickerItems.map((it) => (
                  <span key={it.key} className="inline-flex items-center gap-2 px-4 text-[11px]">
                    <span className={`phosphor-soft ${it.cls}`}>▸ {it.tag}</span>
                    <span className="text-muted-foreground">{it.msg}</span>
                    <span className="text-muted-foreground/40">·</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        <aside className="flex w-60 flex-col overflow-y-auto border-r border-border bg-background/60 backdrop-blur-sm">
          <div className="px-4 pb-2 pt-4">
            <div className="text-[10px] tracking-[0.3em] text-muted-foreground">⟁ OMNI-SAM AXIS</div>
            <div className="phosphor-soft mt-0.5 text-[10px] tracking-[0.2em] text-primary/70">13 BLADES · MONARCH · ORE · ◬ · ◇</div>
          </div>
          <nav className="space-y-0.5 p-2">
            {NAV.map((item, idx) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path as "/"}
                  className={`group relative flex items-center gap-3 border px-3 py-2 transition-all ${
                    isActive
                      ? "phosphor-glow border-primary/40 bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  <span className="terminal-font w-4 text-center text-base">{item.sigil}</span>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span className="flex-1 text-[12px]">{item.name}</span>
                  <span className="text-[9px] tracking-widest text-muted-foreground/60">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  {isActive && <span className="absolute bottom-0 left-0 top-0 w-[2px] bg-primary" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-border p-4">
            <div className="mb-2 text-[10px] tracking-[0.25em] text-muted-foreground">STANCE</div>
            <ul className="space-y-1 text-[10.5px] text-muted-foreground">
              <li><span className="phosphor-soft text-primary">▸</span> zero third-party telemetry</li>
              <li><span className="phosphor-soft text-primary">▸</span> zero vendor middleware</li>
              <li><span className="phosphor-soft text-primary">▸</span> local-first · sovereign-node</li>
              <li><span className="phosphor-soft text-primary">▸</span> real data or honest standby</li>
            </ul>
            <div className="mt-3 text-[9px] leading-relaxed text-muted-foreground/70">
              <span className="text-primary/80">Tyler Morris</span> · Nexinus RI Systems LLC<br />
              <span className="opacity-70">@tychomorr · SOV-ROOT · KETHER_GATE</span>
            </div>
          </div>
        </aside>

        <main className="relative flex-1 overflow-auto">{children}</main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-between border-t border-border bg-background/80 px-4 py-1.5 text-[10px] tracking-widest text-muted-foreground backdrop-blur">
        <div className="flex flex-wrap gap-3">
          <span><span className="text-primary/70">A</span> nexinus.net · 5.223.65.20</span>
          <span className="opacity-30">/</span>
          <span><span className="text-primary/70">VK</span> valkyrie.nexinus.net · 5.78.148.244</span>
          <span className="opacity-30">/</span>
          <span><span className="text-primary/70">KG</span> kether.nexinus.net</span>
        </div>
        <div className="hidden lg:block">SOVEREIGN CONSOLE · ZERO TELEMETRY · NO THIRD-PARTY MIDDLEWARE</div>
        <div className="phosphor-soft text-primary">⌬ NEXINUS MESH</div>
      </footer>

      <CrtOverlay />
    </div>
  );
}
