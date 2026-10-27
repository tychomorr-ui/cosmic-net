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
