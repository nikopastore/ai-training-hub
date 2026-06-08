# Changelog

All notable changes to AI Training Hub are documented here.

## [1.0.0] — 2026-06-07

### Added
- Initial release
- 27 curated AI/ML courses across 3 tiers (Learn, Build, Ship)
- 18 Anthropic Skilljar courses with working URLs
- XP system with 99 levels and tuned curve
- 15 achievements covering onboarding, streaks, tiers, levels, and volume
- Streak tracking with day-based reset
- Search and tier filtering
- localStorage state persistence
- 34-test suite covering XP curve, levels, streak, achievements, idempotency, catalog integrity
- JSON-driven catalog (`data/courses.json`) as single source of truth
- Anthropic Skilljar scraper for catalog re-syncing
- GitHub Actions CI on Node 18, 20, 22
- Warm aesthetic: cream + terracotta + forest green palette
- Glassmorphism header and noise texture
- JetBrains Mono for stats, Inter for body
- Mobile-responsive layout

### Notes
- Zero dependencies at runtime
- Zero dependencies for tests
- ~75 KB of code total (HTML + CSS + JS)
- Designed to open directly via `file://` or any static host

## Roadmap

- [ ] Dark mode toggle
- [ ] Course notes field
- [ ] Time tracking per course
- [ ] Export to CSV/JSON
- [ ] Import progress
- [ ] Web Share API for achievement unlocks
- [ ] Course recommendations
- [ ] Estimated completion time per course
- [ ] Difficulty rating per course (user-voted)
- [ ] Print-friendly progress report
- [ ] PWA manifest
- [ ] Weekly/monthly email digest (opt-in, self-hosted)
