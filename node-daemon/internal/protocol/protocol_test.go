// Golden-vector test for ARCHANGEL/v0 canonicalization. Loads the same
// fixtures the TS suite loads (../spec/golden-vectors.json). Any drift here
// is a P0 — the daemon and browser verifier would silently disagree forever.
package protocol

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

type vector struct {
	Name          string        `json:"name"`
	Payload       StatusPayload `json:"payload"`
	CanonicalUTF8 string        `json:"canonical_utf8"`
}

type vectors struct {
	Vectors []vector `json:"vectors"`
}

func loadVectors(t *testing.T) vectors {
	t.Helper()
	// Single source of truth: packages/protocol/spec/golden-vectors.json,
	// resolved from node-daemon/internal/protocol/.
	path := filepath.Join("..", "..", "..", "packages", "protocol", "spec", "golden-vectors.json")
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read golden vectors: %v", err)
	}
	var v vectors
	if err := json.Unmarshal(b, &v); err != nil {
		t.Fatalf("parse golden vectors: %v", err)
	}
	if len(v.Vectors) == 0 {
		t.Fatal("no golden vectors loaded")
	}
	return v
}

func TestCanonicalize_GoldenVectors(t *testing.T) {
	vs := loadVectors(t)
	for _, v := range vs.Vectors {
		v := v
		t.Run(v.Name, func(t *testing.T) {
			got, err := Canonicalize(v.Payload)
			if err != nil {
				t.Fatalf("canonicalize: %v", err)
			}
			if string(got) != v.CanonicalUTF8 {
				t.Fatalf("canonical drift\n  got:  %s\n  want: %s", got, v.CanonicalUTF8)
			}
		})
	}
}
