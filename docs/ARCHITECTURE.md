# Architecture

## System overview

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│                                                         │
│  ┌────────────┐    ┌────────────┐    ┌───────────────┐   │
│  │ index.html │ →  │  app.js    │ →  │ data/courses  │   │
│  │ (DOM shell)│    │ (engine +  │    │     .json     │   │
│  │            │    │  render)   │    │  (catalog)    │   │
│  └────────────┘    └──────┬─────┘    └───────────────┘   │
│                           │                              │
│                           ↓                              │
│                    ┌─────────────┐                        │
│                    │ localStorage│                        │
│                    │  (state)    │                        │
│                    └─────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

Three files do all the work:

- `index.html` — semantic shell, 100% static, no JSX or templating
- `app.js` — single IIFE that owns the gamification engine, state, and DOM rendering
- `data/courses.json` — the catalog, fetched at boot, drives every render

## Data model

```typescript
type State = {
  courses: { [courseId]: CourseState };
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  achievements: { [achievementId]: ISO8601 };
};

type CourseState = {
  status: "not-started" | "in-progress" | "completed";
  startedAt?: string;
  completedAt?: string;
};

type Course = {
  id: string;
  title: string;
  provider: string;
  tier: "learn" | "build" | "ship";
  xp: number;
  tags: string[];
  url: string;
  description: string;
};
```

## Render flow

```
boot
  ↓
loadState() ← localStorage
  ↓
fetch(courses.json) ← catalog
  ↓
init()
  ↓
renderAll()
  ├─ renderStats()       (level, XP, streak, active count)
  ├─ renderProgress()    (overall bar, %)
  ├─ renderFilters()     (All / Learn / Build / Ship)
  ├─ renderCourses()     (3 grids, one per tier, filter+search applied)
  └─ renderAchievements() (15 cards, locked/unlocked)
```

Every state mutation calls `saveState()` and `renderAll()`. No virtual DOM, no diffing — the catalog is small enough that full re-render is < 5ms.

## Why no framework?

I considered React. I considered Svelte. I considered HTMX. **I shipped vanilla.** Here's the math:

- Catalog: 27 items. Even with search debouncing, render is ~3ms.
- Total JS: ~17 KB unminified. After gzip: ~6 KB. React + ReactDOM is 45 KB before you write a line of code.
- Tests: Node `--test` is built into Node 18+. No Jest, no Vitest, no jsdom.
- Build step: zero. `index.html` opens directly.
- State persistence: localStorage. No Redux, no Zustand, no migration framework.

For a single-page tool that runs on the local filesystem or any static host, **the framework is more code than the app.** When the catalog hits 500 courses and we need virtualization, I'll add React. Until then, `app.js` is the engine.

## Adding a feature

Three places to touch, in order:

1. **State** — extend the `defaultState()` factory in `app.js`
2. **Logic** — add the action function, expose it on `window.AITrainingHub` for tests
3. **Render** — add a `render*()` function, call it from `renderAll()`

## Performance budget

| Metric | Target | Current |
|---|---|---|
| First paint (cold cache) | < 200ms | ~80ms |
| Render all courses | < 10ms | ~3ms |
| State save | < 5ms | < 1ms |
| Total JS (unminified) | < 30KB | 17.6KB |
| Total CSS (unminified) | < 20KB | 12.1KB |
| Total HTML | < 10KB | 4.2KB |
