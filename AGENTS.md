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
