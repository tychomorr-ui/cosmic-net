// Live Bitcoin substrate readings via mempool.space public API (CORS-enabled).
// Used by SUDO-COIN to compute a sovereign-attestable composite ore reading.
// No custody. No third party. Read · name · hash · publish.

export type BtcSample = {
  ts: number;
  block: { height: number; hash: string; tx_count: number; size: number };
  hashrate: number;       // H/s
  difficulty: number;
  mempool: { count: number; vsize: number };
  priceUsd: number;
  supplyBtc: number;      // estimated from height
  work: number;           // log10(hashrate)
  pressure: number;       // mempool vbytes / 1MB
  density: number;        // size / 1MB
  oreIndex: number;       // work × pressure × density × supply^0.25
  marketCapUsd: number;
};

const API = "https://mempool.space/api";

async function jget<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json() as Promise<T>;
}
async function ttext(path: string): Promise<string> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.text();
}

// Halving-aware circulating supply estimate.
export function estimateSupply(height: number): number {
  let supply = 0;
  let reward = 50;
  let h = height;
  let interval = 210_000;
  while (h > 0 && reward > 0) {
    const take = Math.min(h, interval);
    supply += take * reward;
    h -= take;
    reward /= 2;
  }
  return supply;
}

export async function sampleSubstrate(): Promise<BtcSample> {
  const [tipHash, tipHeightStr, mp, prices, hr] = await Promise.all([
    ttext("/blocks/tip/hash"),
    ttext("/blocks/tip/height"),
    jget<{ count: number; vsize: number }>("/mempool"),
    jget<{ USD: number }>("/v1/prices"),
    jget<{ currentHashrate: number; currentDifficulty: number }>("/v1/mining/hashrate/3d"),
  ]);
  const height = parseInt(tipHeightStr.trim(), 10);
  const hash = tipHash.trim();
  const block = await jget<{ tx_count: number; size: number }>(`/block/${hash}`);

  const supplyBtc = estimateSupply(height);
  const work = Math.log10(Math.max(hr.currentHashrate, 1));
  const pressure = mp.vsize / 1_000_000;
  const density = block.size / 1_000_000;
  const oreIndex = work * pressure * density * Math.pow(supplyBtc, 0.25);

  return {
    ts: Date.now(),
    block: { height, hash, tx_count: block.tx_count, size: block.size },
    hashrate: hr.currentHashrate,
    difficulty: hr.currentDifficulty,
    mempool: mp,
    priceUsd: prices.USD,
    supplyBtc,
    work, pressure, density, oreIndex,
    marketCapUsd: prices.USD * supplyBtc,
  };
}

const KEY = "nexinus.sudo.samples.v1";
export function loadSamples(): BtcSample[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
export function pushSample(s: BtcSample): BtcSample[] {
  const all = [...loadSamples(), s].slice(-256);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}

// FNV-1a 32-bit — same primitive as Digital Ore for symmetry.
export function stamp(s: BtcSample): string {
  const payload = `${s.block.height}|${s.block.hash}|${s.oreIndex.toFixed(4)}|${s.priceUsd}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0").toUpperCase();
}
