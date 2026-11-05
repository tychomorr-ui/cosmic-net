# Remaining scope
- [ ] Finish evidence-only AI node explanations and verify trust isolation, error handling and browser display.

- [x] Disable the unauthenticated public reprobe writes and unrestricted read; 82 web-app/protocol tests pass and live GET/POST return 410. Scheduled updates through this hook are now disabled. Contract tests remain unverified because their separate Hardhat dependency is unavailable.
- [ ] Remaining Terminus modernization: reconcile Manus changes before continuing cleanup and real-node integration. Blocked on the latest Manus diff/report and operator-owned endpoint/key details.

- [x] Use a semantic warning token for unverified blade status.
- [x] Add and run messaging signature, CID, tamper, and backoff tests (55 regression tests passed).
- [x] Verify local delivery, signed acknowledgments, automatic HTTP retry, attempt-20 failure, and blade fallback views in the browser.

Verification boundary: HTTP delivery used a controlled peer response; no operator-hosted remote listener was supplied or contacted.