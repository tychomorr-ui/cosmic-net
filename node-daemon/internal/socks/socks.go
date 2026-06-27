// Package socks supervises a sing-box subprocess providing SOCKS5 egress
// bound to the WireGuard interface. We don't reimplement SOCKS5 — sing-box
// is mature, telemetry-free, and configured with a single JSON file.
package socks

import (
	"context"
	"log"
	"os/exec"
	"path/filepath"
	"time"
)

func Supervise(ctx context.Context, etc string) {
	cfg := filepath.Join(etc, "sing-box.json")
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		cmd := exec.CommandContext(ctx, "sing-box", "run", "-c", cfg)
		cmd.Stdout = nil // → /dev/null; journald captures stderr
		log.Printf("socks: starting sing-box (%s)", cfg)
		if err := cmd.Run(); err != nil && ctx.Err() == nil {
			log.Printf("socks: exited (%v) — restart in 3s", err)
			time.Sleep(3 * time.Second)
		}
	}
}
