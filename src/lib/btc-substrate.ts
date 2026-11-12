// Live Bitcoin substrate readings via mempool.space public API (CORS-enabled).
// Used by SUDO-COIN to compute a sovereign-attestable composite ore reading.
// No custody. No third party. Read · name · hash · publish.

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export type BtcSample = {
  fingerprint?: string;
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
  const r = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json() as Promise<T>;
}
async function ttext(path: string): Promise<string> {
  const r = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.text();
}

// Halving-aware circulating supply estimate.
export function estimateSupply(height: number): number {
  if (!Number.isSafeInteger(height) || height < 0) throw new Error("Invalid block height");
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
  const [tipHash, mp, prices, hr] = await Promise.all([
    ttext("/blocks/tip/hash"),
    jget<{ count: number; vsize: number }>("/mempool"),
    jget<{ USD: number }>("/v1/prices"),
    jget<{ currentHashrate: number; currentDifficulty: number }>("/v1/mining/hashrate/3d"),
  ]);
  const hash = tipHash.trim();
  if (!/^[0-9a-f]{64}$/i.test(hash)) throw new Error("Invalid block hash");
  const block = await jget<{ height: number; tx_count: number; size: number }>(`/block/${hash}`);
  const height = block.height;
  for (const value of [height, block.tx_count, block.size, mp.count, mp.vsize])
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("Missing or invalid network measurement");
  for (const value of [prices.USD, hr.currentHashrate, hr.currentDifficulty])
    if (!Number.isFinite(value) || value <= 0) throw new Error("Missing or invalid market/mining measurement");

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
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter(verifySample) : [];
  } catch { return []; }
}
export function pushSample(s: BtcSample): BtcSample[] {
  const recorded = { ...s, fingerprint: stamp(s) };
  if (!verifySample(recorded)) throw new Error("Invalid substrate sample; not recorded");
  const all = [...loadSamples(), recorded].slice(-256);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}

// Complete sample fingerprint; never a signature or independent network proof.
export function stamp(s: BtcSample): string {
  const payload = ["substrate/v2", s.ts, s.block.height, s.block.hash, s.block.tx_count, s.block.size,
    s.hashrate, s.difficulty, s.mempool.count, s.mempool.vsize, s.priceUsd, s.supplyBtc,
    s.work, s.pressure, s.density, s.oreIndex, s.marketCapUsd];
  return bytesToHex(sha256(utf8ToBytes(JSON.stringify(payload))));
}

export function verifySample(raw: unknown): raw is BtcSample {
  if (!raw || typeof raw !== "object") return false;
  const s = raw as BtcSample;
  if (!s.block || !s.mempool || typeof s.fingerprint !== "string" ||
    !/^[0-9a-f]{64}$/i.test(s.block.hash)) return false;
  if ([s.ts, s.block.height, s.block.tx_count, s.block.size, s.mempool.count, s.mempool.vsize]
    .some((v) => !Number.isSafeInteger(v) || v < 0)) return false;
  if ([s.hashrate, s.difficulty, s.priceUsd].some((v) => !Number.isFinite(v) || v <= 0)) return false;
  const supply = estimateSupply(s.block.height);
  const work = Math.log10(Math.max(s.hashrate, 1));
  const pressure = s.mempool.vsize / 1_000_000;
  const density = s.block.size / 1_000_000;
  return s.supplyBtc === supply && s.work === work && s.pressure === pressure && s.density === density &&
    s.oreIndex === work * pressure * density * Math.pow(supply, 0.25) &&
    s.marketCapUsd === s.priceUsd * supply && s.fingerprint === stamp(s);
}
