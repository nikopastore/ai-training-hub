# Contributing

Thanks for your interest in making AI Training Hub better. This is a small, opinionated project — please read this whole doc before opening a PR.

## What we're optimizing for

1. **A tool I'd want to use every day.** No feature that doesn't pull its weight.
2. **Readability.** A new contributor should be able to understand the codebase in 20 minutes.
3. **Zero dependencies.** Every dep is a future maintenance tax. The bar to add one is high.
4. **A polished feel.** The site should feel like a real product, not a hobby script.

## How to add a course

The catalog is `data/courses.json`. Each entry needs:

```json
{
  "id": "kebab-case-unique-id",
  "title": "Course Title",
  "provider": "Anthropic Skilljar",
  "tier": "learn | build | ship",
  "xp": 200,
  "tags": ["anthropic", "free"],
  "url": "https://...",
  "description": "One- or two-sentence description of what you'll learn."
}
```

Tier guidelines:
- **learn** — foundations, theory, intro-level, < 4 hours
- **build** — hands-on, code-first, deploys something
- **ship** — production-grade, architectural, advanced

XP guidelines (tune based on length + value):
- Short (< 2h): 150-180
- Medium (2-6h): 200-280
- Long (6h+): 300-400

Tags should be lowercase, no spaces. Common tags: `anthropic`, `free`, `agents`, `mcp`, `api`, `vision`, `production`, `theory`, `from-scratch`.

Before submitting:
- [ ] `npm test` passes (catalog integrity tests will catch malformed entries)
- [ ] URL works (click it, see the course exists)
- [ ] Description is 1-2 sentences, factual, no marketing fluff
- [ ] Tier is the right one — if unsure, default to `build`

## How to add an achievement

Achievements live in the `ACHIEVEMENTS` array in `app.js`. Each entry:

```js
{ id: "kebab-id", icon: "🌱", name: "Display Name", desc: "What you did to earn it." }
```

The unlock condition lives in `checkAchievements()`. Add your check, and add a test in `tests/gamification.test.mjs`.

## Coding style

- Vanilla JS, ES2022+, no transpilation
- 2-space indent, single quotes, no semicolons in HTML/CSS, semicolons in JS
- Pure functions exposed on `window.AITrainingHub` for testability
- State is plain JSON, deep-copied in `getState()` to prevent test mutation leaks
- Comments explain *why*, not *what*

## PR checklist

- [ ] `npm test` passes locally (34+ tests)
- [ ] New tests added for any new logic
- [ ] No new dependencies added
- [ ] Total JS bundle stays under 30 KB unminified
- [ ] If UI changed, screenshots updated
- [ ] CHANGELOG.md updated under "Unreleased"
- [ ] PR description explains the *why*, not just the *what*

## Review timeline

I try to review PRs within a week. If you don't hear back, ping me on the issue.

## Code of conduct

Be kind. Assume good faith. This is a personal project — the standards are "would I be comfortable if my non-technical friend saw this conversation?"
