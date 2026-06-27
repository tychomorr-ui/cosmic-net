// Package dns supervises CoreDNS for the in-tunnel `.xinus` zone.
// CoreDNS owns: authoritative .xinus answers, recursive forwarding for
// everything else, and reload-on-zone-change via the `reload` plugin.
package dns

import (
	"context"
	"log"
	"os/exec"
	"path/filepath"
	"time"
)

func Supervise(ctx context.Context, etc string) {
	corefile := filepath.Join(etc, "Corefile")
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		cmd := exec.CommandContext(ctx, "coredns", "-conf", corefile)
		log.Printf("dns: starting coredns (%s)", corefile)
		if err := cmd.Run(); err != nil && ctx.Err() == nil {
			log.Printf("dns: exited (%v) — restart in 3s", err)
			time.Sleep(3 * time.Second)
		}
	}
}
