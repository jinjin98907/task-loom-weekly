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

## Rules

- Keep pure date, ordering and timetable rules in small browser-safe modules under `src/lib/` and unit-test them there instead of through a route. Why: route modules pull in TanStack Router and server-only code, which makes the rules hard to check on their own.
- Attendance reports read the existing dashboard LocalStorage records without creating a separate attendance store. Why: period views must remain synchronized and must not overwrite teacher records.
- Cloud sync keeps LocalStorage as the primary store: pages keep reading/writing their LocalStorage keys directly, and `src/lib/cloud-sync-client.ts` only mirrors those keys to the `user_data` cloud table (merge rules in `src/lib/cloud-merge.ts`). Why: offline and NAS self-hosting must keep working, and pages stay decoupled from the network.
- A single root CloudSync account provider verifies session users and owns auth subscriptions; account transitions archive and replace the active LocalStorage mirror, and sync writes compare an expected owner against the verified bearer subject. Why: shared-browser account switches must not expose or upload another account's records while preserving offline work.
- Cloud sync payloads for dashboard/yearly/rules/memo are AES-GCM encrypted in the browser (`src/lib/e2ee.ts`) with a password-derived key kept only in LocalStorage; sync pauses until the device is unlocked and never pushes stores it cannot decrypt. Why: the database operator must not be able to read teacher/student records.
