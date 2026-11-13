<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep messaging cryptography and retry rules in browser-safe `src/lib/messaging.ts`, with regression tests alongside it; verification must not depend on a hosted service.
- Represent unverified status through the global semantic warning token so every blade surface uses the same themed state.
- Run unit tests with the dedicated Vitest config and local protocol alias so tests do not boot the server runtime.
- Keep the public reprobe hook disabled for both reads and writes until an authenticated operator-controlled replacement is explicitly authorized; public placement does not authorize privileged access.
- AI node explanations select bounded evidence-grounded sentences via an authenticated server function; never feed AI output into probe or trust stores.
- PAM refuses chain restamping and checks integrity plus concurrent writes before append, because recomputing history would erase evidence of drift.
- Digital Ore traces rederive scores and tiers, reject duplicate identities, and exclude descendants of broken v2 claims, because loads must not launder damaged ancestry.
- Truth Substrate stores full-sample SHA-256 fingerprints and validates measurements before persistence; local fingerprints are not signatures or economic valuations.
- Retired blade URLs redirect to an existing evidence surface; never dereference removed registry entries.
- Seventh Dimension projects recorded local state and verified Ore loads; its CID is a snapshot fingerprint, not fleet verification.
