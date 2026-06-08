# Screenshots

This folder holds the demo screenshots used in the README and any external coverage.

## Capturing fresh screenshots

The screenshots in this folder were captured with a 1440×900 viewport in Chrome. To re-capture after a UI change:

1. Start the local server: `npm run serve` (runs on `http://localhost:8000`)
2. Open the site in Chrome at that URL
3. Set viewport to 1440×900 (DevTools → device toolbar → Responsive)
4. Capture the following 3 shots:

### Shot 1: Hero / fresh state
- Action: Open the site, clear localStorage (DevTools → Application → Local Storage → Delete), reload
- Why: Shows the empty state, full course catalog, level 1, 0 XP
- File: `screenshot-1-hero.png`

### Shot 2: Mid-progress
- Action: Start 3-4 courses (click "Start" on each), complete 1-2 of them
- Why: Shows level-up, in-progress badges, completed checkmarks, achievement unlocks
- File: `screenshot-2-progress.png`

### Shot 3: Filtered view
- Action: Click the "Build" filter chip, then type "agent" in search
- Why: Shows filter and search in action
- File: `screenshot-3-filtered.png`

## Image specs

- Format: PNG
- Dimensions: 1440 × 900 (or 2880 × 1800 for retina)
- Compression: Lossless or high-quality
- No fake logos, no fabricated stats

## Where they're used

- `screenshot-1-hero.png` → top of README
- `screenshot-2-progress.png` → "What it does" section
- `screenshot-3-filtered.png` → "Features" section
