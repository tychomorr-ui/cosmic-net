#!/usr/bin/env bun
// Publish an IPNS record for the static IPFS snapshot.
//
// The signing key is an Ed25519 keypair that WE hold. w3name is only a
// record store: it cannot forge a revision, it can only refuse to serve one.
// That keeps the naming layer honest — the authority is the key, not the host.
//
//   bun run scripts/publish-ipns.mjs <cid>
//
// Env:
//   IPNS_SIGNING_KEY  base64 of the w3name key archive. If absent, a new key
//                     is generated and printed once — store it as a secret.

import * as Name from "w3name";

const cid = process.argv[2];
if (!cid) {
  console.error("usage: bun run scripts/publish-ipns.mjs <cid>");
  process.exit(1);
}

const value = cid.startsWith("/") ? cid : `/ipfs/${cid}`;

let name;
let created = false;
const archived = process.env["IPNS_SIGNING_KEY"];
if (archived) {
  name = await Name.from(Uint8Array.from(Buffer.from(archived, "base64")));
} else {
  name = await Name.create();
  created = true;
}

let revision;
try {
  const current = await Name.resolve(name);
  revision = await Name.increment(current, value);
} catch {
  revision = await Name.v0(name, value);
}

await Name.publish(revision, name.key);

console.log(JSON.stringify(
  {
    ipns: name.toString(),
    value: revision.value,
    sequence: String(revision.sequence),
    dnslink: `dnslink=/ipns/${name.toString()}`,
    gateway: `https://${name.toString()}.ipns.dweb.link/`,
  },
  null,
  2,
));

if (created) {
  console.error("\n--- NEW SIGNING KEY (store as IPNS_SIGNING_KEY, shown once) ---");
  console.error(Buffer.from(name.key.bytes).toString("base64"));
}
