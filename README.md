# AI Training Hub

> A gamified, personally curated command center for the top AI/ML courses of 2026 — built to make deep technical learning as satisfying as finishing a good book.

A self-contained web app for tracking your progress through 60+ of the most important AI courses this year. Earn XP for starting and finishing courses, unlock achievements, maintain learning streaks, and watch your level climb as you build real AI fluency.

**Read the build case study:** [AI Training Hub: A Gamified Tracker for the Top AI Courses of 2026](https://nikopastore-portfolio.vercel.app/blog/ai-training-hub-case-study)

## What it does

- **60+ curated courses** organized into three tiers: **Learn** (foundations), **Build** (hands-on), **Ship** (production)
- **Anthropic Skilljar courses** front and center — including Claude API, tool use, MCP, agents, and the constitutional AI track
- **XP system** with 99 levels, scaling curve tuned to feel rewarding without being trivial
- **15 achievements** — from "First Step" to "Completionist" — to chase
- **Streak tracking** that auto-bumps when you come back the next day
- **localStorage persistence** — your progress stays on your device, nothing leaves
- **Search + tier filter** to find the right course when you have 30 minutes
- **JSON-driven catalog** — `data/courses.json` is the single source of truth

## Quick start

```bash
git clone https://github.com/nikopastore/ai-training-hub
cd ai-training-hub
npm install   # optional — only needed for the scraper
npm run serve # → http://localhost:8000
```

That's it. No build step, no bundler, no transpiler. Just open `index.html` directly, or serve the directory.

## Running the tests

```bash
npm test
```

74 tests covering the XP curve, level math, streak logic, achievement triggers, catalog integrity, import/export, theme persistence, and idempotency. Zero dependencies — uses Node's built-in test runner.

## Updating the catalog

The course list lives in `data/courses.json` — edit it directly, or re-sync from Anthropic:

```bash
npm run scrape
```

The scraper walks the Anthropic Skilljar catalog, preserves your custom XP weights and tags, and adds any new courses. Best-effort: the Skilljar page structure changes occasionally, so the script has fallback handling.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the system diagram, data model, and "why vanilla JS" deep-dive.

See [`docs/GAMIFICATION.md`](docs/GAMIFICATION.md) for the XP curve, achievement list, and streak math.

## Contributing

PRs welcome. See [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md) for how to add a course, what makes a good PR, and the review checklist.

## License

MIT — see [LICENSE](LICENSE).

---

**Why I built this:** I wanted one place to track my own AI fluency journey — a tool that felt as good to use as the best consumer apps, but stayed out of my way when I just wanted to start the next course. No accounts, no cloud, no upsells. Just a fast, pretty page that makes learning feel like a game I want to keep playing.
