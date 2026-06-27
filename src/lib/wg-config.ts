// Compose a WireGuard .conf locally. No private keys leave the browser.

export type WgConfigInput = {
  clientPrivBase64: string;
  clientAddress: string; // e.g. "10.42.0.42/32"
  dns: string;           // e.g. "10.42.0.1"
  serverPubBase64: string;
  serverEndpoint: string; // e.g. "tesseract-a.xinus.one:51820"
  allowedIps?: string;    // default "0.0.0.0/0, ::/0"
  persistentKeepalive?: number;
};

export function composeWgConfig(i: WgConfigInput): string {
  const allowed = i.allowedIps ?? "0.0.0.0/0, ::/0";
  const keep = i.persistentKeepalive ?? 25;
  return [
    "[Interface]",
    `PrivateKey = ${i.clientPrivBase64}`,
    `Address = ${i.clientAddress}`,
    `DNS = ${i.dns}`,
    "",
    "[Peer]",
    `PublicKey = ${i.serverPubBase64}`,
    `Endpoint = ${i.serverEndpoint}`,
    `AllowedIPs = ${allowed}`,
    `PersistentKeepalive = ${keep}`,
    "",
  ].join("\n");
}

export function downloadText(filename: string, body: string): void {
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
