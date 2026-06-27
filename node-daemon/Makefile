# archangel — build + install
#
# Targets:
#   make build      build static linux/amd64 binary into ./dist
#   make install    install binary, config skeleton, systemd unit
#   make uninstall  stop unit, remove binary; keep /etc/archangel
#
# Run `archangel init` after install to generate keys, then paste pubkeys
# into the /gateway control plane.

BINARY := archangel
PREFIX ?= /usr/local
ETC    ?= /etc/archangel
USER   ?= archangel

.PHONY: build install uninstall fmt vet

build:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
		go build -trimpath -ldflags="-s -w" \
		-o dist/$(BINARY) ./cmd/archangel

install: build
	id -u $(USER) >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin $(USER)
	install -d $(ETC) $(ETC)/receipts
	install -m 0755 dist/$(BINARY) $(PREFIX)/bin/$(BINARY)
	install -m 0644 config/Corefile $(ETC)/Corefile
	install -m 0644 config/xinus.zone $(ETC)/xinus.zone
	install -m 0644 config/sing-box.json $(ETC)/sing-box.json
	install -m 0644 systemd/archangel.service /etc/systemd/system/archangel.service
	chown -R $(USER):$(USER) $(ETC)
	systemctl daemon-reload
	@echo
	@echo "Installed. Next:"
	@echo "  sudo -u $(USER) $(PREFIX)/bin/$(BINARY) init"
	@echo "  sudo -u $(USER) $(PREFIX)/bin/$(BINARY) pubkeys   # paste into /gateway"
	@echo "  edit $(ETC)/allowlist.json to add your operator ed25519 pubkey"
	@echo "  systemctl enable --now archangel"

uninstall:
	-systemctl disable --now archangel
	-rm -f /etc/systemd/system/archangel.service
	-rm -f $(PREFIX)/bin/$(BINARY)
	systemctl daemon-reload
	@echo "Left $(ETC) in place. Remove manually if desired."

fmt:; go fmt ./...
vet:; go vet ./...
