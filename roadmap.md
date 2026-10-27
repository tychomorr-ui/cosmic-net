# Remaining scope

- [x] Use a semantic warning token for unverified blade status.
- [x] Add and run messaging signature, CID, tamper, and backoff tests (55 regression tests passed).
- [x] Verify local delivery, signed acknowledgments, automatic HTTP retry, attempt-20 failure, and blade fallback views in the browser.

Verification boundary: HTTP delivery used a controlled peer response; no operator-hosted remote listener was supplied or contacted.