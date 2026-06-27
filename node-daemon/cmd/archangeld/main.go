// archangeld — sovereign node daemon for the Nexinus Terminus fleet.
//
// One static binary per node. Owns kernel WireGuard, supervises sing-box
// (SOCKS5) and CoreDNS (.xinus zone), and serves the ARCHANGEL/v0 handshake
// plus a signed /status payload to the control plane.
package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"nexinus/archangeld/internal/dns"
	"nexinus/archangeld/internal/handshake"
	"nexinus/archangeld/internal/socks"
	"nexinus/archangeld/internal/status"
	"nexinus/archangeld/internal/wg"
)

const (
	defaultListen   = ":8443"
	defaultEtc      = "/etc/archangeld"
	defaultIface    = "wg0"
	defaultAllowNet = "10.42.0.0/16"
)

func main() {
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "init":
			must(handshake.Init(defaultEtc))
			must(wg.Init(defaultEtc))
			log.Println("archangeld initialized in", defaultEtc)
			return
		case "pubkeys":
			edPub, xPub, err := handshake.LoadPubkeys(defaultEtc)
			must(err)
			wgPub, err := wg.LoadServerPubkey(defaultEtc)
			must(err)
			out, _ := json.MarshalIndent(map[string]string{
				"ed25519_hex":      edPub,
				"x25519_hex":       xPub,
				"wireguard_pub_b64": wgPub,
			}, "", "  ")
			os.Stdout.Write(out)
			os.Stdout.Write([]byte("\n"))
			return
		case "serve":
			// fall through
		default:
			log.Fatalf("unknown subcommand %q (init|pubkeys|serve)", os.Args[1])
		}
	}

	listen := flag.String("listen", defaultListen, "HTTPS listen address")
	etc := flag.String("etc", defaultEtc, "config directory")
	iface := flag.String("iface", defaultIface, "WireGuard interface")
	endpoint := flag.String("endpoint", "", "public WG endpoint (host:port) advertised on enroll")
	allowNet := flag.String("allow", defaultAllowNet, "CIDR pool for peer addresses")
	tlsCert := flag.String("tls-cert", "", "TLS cert (PEM); empty = self-signed dev")
	tlsKey := flag.String("tls-key", "", "TLS key (PEM)")
	flag.Parse()

	if *endpoint == "" {
		log.Fatal("--endpoint required (e.g. tesseract-a.xinus.one:51820)")
	}

	hs, err := handshake.Open(*etc)
	must(err)
	wgm, err := wg.Open(*iface, *etc, *allowNet)
	must(err)
	defer wgm.Close()

	statusSigner, err := status.Open(*etc, *iface)
	must(err)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go socks.Supervise(ctx, *etc)
	go dns.Supervise(ctx, *etc)

	mux := http.NewServeMux()
	mux.HandleFunc("/archangel/challenge", hs.HandleChallenge)
	mux.HandleFunc("/archangel/enroll", hs.HandleEnroll(wgm, *endpoint))
	mux.HandleFunc("/status", statusSigner.Handle(wgm))
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(204)
	})

	srv := &http.Server{
		Addr:              *listen,
		Handler:           withCORS(mux),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
		TLSConfig:         &tls.Config{MinVersion: tls.VersionTLS12},
	}

	go reloadOnSIGHUP(hs)

	go func() {
		log.Printf("archangeld listening on %s (iface=%s endpoint=%s pool=%s)",
			*listen, *iface, *endpoint, *allowNet)
		var err error
		if *tlsCert != "" && *tlsKey != "" {
			err = srv.ListenAndServeTLS(*tlsCert, *tlsKey)
		} else {
			// Dev / behind-LB mode. Production should provide certs.
			err = srv.ListenAndServe()
		}
		if !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	log.Println("shutdown")
	shutdownCtx, c := context.WithTimeout(context.Background(), 5*time.Second)
	defer c()
	_ = srv.Shutdown(shutdownCtx)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func reloadOnSIGHUP(hs *handshake.Service) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGHUP)
	for range c {
		if err := hs.ReloadAllowlist(); err != nil {
			log.Printf("reload allowlist: %v", err)
		} else {
			log.Printf("allowlist reloaded")
		}
	}
}

func must(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
