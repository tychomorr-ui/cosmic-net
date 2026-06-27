// Package wg manages the kernel WireGuard interface via wgctrl-go.
//
// Responsibilities:
//   - Load (or generate on first boot) the server WireGuard keypair.
//   - Allocate /32 addresses from the configured pool.
//   - Add/remove peers with `wg set` semantics.
//   - Surface peer stats for /status.
package wg

import (
	"encoding/base64"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"sync"
	"time"

	"golang.org/x/sys/unix"
	"golang.zx2c4.com/wireguard/wgctrl"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

const (
	wgPrivFile = "server.wg.key"
	wgPubFile  = "server.wg.pub"
)

type Manager struct {
	iface     string
	etc       string
	pool      *net.IPNet
	gateway   net.IP
	client    *wgctrl.Client
	priv      wgtypes.Key
	pub       wgtypes.Key

	mu     sync.Mutex
	taken  map[string]struct{} // assigned IPs (string form) for fast alloc
	nextOf uint32              // last allocated host index hint
}

func Init(etc string) error {
	if _, err := os.Stat(filepath.Join(etc, wgPrivFile)); err == nil {
		return errors.New("wg key already initialized")
	}
	k, err := wgtypes.GeneratePrivateKey()
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(etc, wgPrivFile), []byte(k.String()), 0o600); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(etc, wgPubFile), []byte(k.PublicKey().String()), 0o644)
}

func LoadServerPubkey(etc string) (string, error) {
	b, err := os.ReadFile(filepath.Join(etc, wgPubFile))
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func Open(iface, etc, poolCIDR string) (*Manager, error) {
	_, ipNet, err := net.ParseCIDR(poolCIDR)
	if err != nil {
		return nil, fmt.Errorf("pool: %w", err)
	}
	priv, err := loadKey(filepath.Join(etc, wgPrivFile))
	if err != nil {
		return nil, fmt.Errorf("load wg key (run `archangeld init`): %w", err)
	}
	cli, err := wgctrl.New()
	if err != nil {
		return nil, fmt.Errorf("wgctrl: %w", err)
	}
	m := &Manager{
		iface:   iface,
		etc:     etc,
		pool:    ipNet,
		gateway: nextIP(ipNet.IP, 1), // .1 is the daemon end
		client:  cli,
		priv:    priv,
		pub:     priv.PublicKey(),
		taken:   make(map[string]struct{}),
		nextOf:  2,
	}
	if err := m.hydrateExistingPeers(); err != nil {
		return nil, fmt.Errorf("hydrate: %w", err)
	}
	return m, nil
}

func (m *Manager) Close() { _ = m.client.Close() }

func (m *Manager) ServerPubBase64() string { return m.pub.String() }
func (m *Manager) GatewayIP() string       { return m.gateway.String() }
func (m *Manager) Iface() string           { return m.iface }

func (m *Manager) hydrateExistingPeers() error {
	dev, err := m.client.Device(m.iface)
	if err != nil {
		if errors.Is(err, unix.ENODEV) {
			return fmt.Errorf("interface %s missing — bring it up with `ip link add %s type wireguard`", m.iface, m.iface)
		}
		return err
	}
	for _, p := range dev.Peers {
		for _, a := range p.AllowedIPs {
			m.taken[a.IP.String()] = struct{}{}
		}
	}
	return nil
}

func (m *Manager) AddPeer(xPub []byte) (string, error) {
	if len(xPub) != 32 {
		return "", errors.New("xPub length")
	}
	var key wgtypes.Key
	copy(key[:], xPub)

	m.mu.Lock()
	ip, err := m.allocLocked()
	m.mu.Unlock()
	if err != nil {
		return "", err
	}

	_, allowed, _ := net.ParseCIDR(ip + "/32")
	cfg := wgtypes.Config{
		ReplacePeers: false,
		Peers: []wgtypes.PeerConfig{{
			PublicKey:         key,
			ReplaceAllowedIPs: true,
			AllowedIPs:        []net.IPNet{*allowed},
		}},
	}
	if err := m.client.ConfigureDevice(m.iface, cfg); err != nil {
		m.mu.Lock()
		delete(m.taken, ip)
		m.mu.Unlock()
		return "", err
	}
	return ip, nil
}

func (m *Manager) allocLocked() (string, error) {
	for i := uint32(0); i < (1 << 16); i++ {
		candidate := nextIP(m.pool.IP, m.nextOf+i)
		if !m.pool.Contains(candidate) {
			return "", errors.New("pool exhausted")
		}
		s := candidate.String()
		if s == m.gateway.String() {
			continue
		}
		if _, ok := m.taken[s]; ok {
			continue
		}
		m.taken[s] = struct{}{}
		m.nextOf += i + 1
		return s, nil
	}
	return "", errors.New("alloc loop exceeded")
}

type Stats struct {
	Peers                 int
	LastHandshakeMaxAgeS  int64
}

func (m *Manager) Stats() (Stats, error) {
	dev, err := m.client.Device(m.iface)
	if err != nil {
		return Stats{}, err
	}
	var maxAge int64 = -1
	now := time.Now()
	for _, p := range dev.Peers {
		if p.LastHandshakeTime.IsZero() {
			continue
		}
		age := int64(now.Sub(p.LastHandshakeTime).Seconds())
		if age > maxAge {
			maxAge = age
		}
	}
	if maxAge < 0 {
		maxAge = int64(time.Since(now.Add(-time.Hour)).Seconds()) // sentinel: no handshakes yet
	}
	return Stats{Peers: len(dev.Peers), LastHandshakeMaxAgeS: maxAge}, nil
}

func loadKey(path string) (wgtypes.Key, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return wgtypes.Key{}, err
	}
	dec, err := base64.StdEncoding.DecodeString(string(trimNL(b)))
	if err != nil {
		return wgtypes.Key{}, err
	}
	var k wgtypes.Key
	if len(dec) != len(k) {
		return wgtypes.Key{}, errors.New("key length")
	}
	copy(k[:], dec)
	return k, nil
}

func trimNL(b []byte) []byte {
	for len(b) > 0 && (b[len(b)-1] == '\n' || b[len(b)-1] == '\r' || b[len(b)-1] == ' ') {
		b = b[:len(b)-1]
	}
	return b
}

func nextIP(base net.IP, n uint32) net.IP {
	ip := base.To4()
	if ip == nil {
		return base
	}
	v := uint32(ip[0])<<24 | uint32(ip[1])<<16 | uint32(ip[2])<<8 | uint32(ip[3])
	v += n
	return net.IPv4(byte(v>>24), byte(v>>16), byte(v>>8), byte(v))
}
