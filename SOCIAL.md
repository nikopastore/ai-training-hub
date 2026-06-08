# Social launch pack

Pre-written copy for announcing AI Training Hub. Use as-is, or as a starting point.

---

## X (Twitter) — 6-tweet thread

**Tweet 1 (hook)**
```
I built a gamified course tracker for 27 of the most important AI/ML courses of 2026.

XP, levels, 15 achievements, daily streaks. Zero accounts. Zero cloud. ~75 KB total.

Here's what's in it 🧵
```

**Tweet 2 (what it does)**
```
- 18 Anthropic Skilljar courses (Claude API, MCP, agents, evals, the works)
- Tiered by Learn → Build → Ship
- Search + filter to find what to do in your next 30 min
- All progress in localStorage (your data stays on your machine)
```

**Tweet 3 (the why)**
```
The whole 2026 AI curriculum is overwhelming.

I wanted one page that:
✓ Tells me what to read next
✓ Tracks where I am
✓ Makes the start of each course feel rewarding
✓ Doesn't try to sell me a subscription
```

**Tweet 4 (the tech)**
```
Tech:
- Vanilla HTML/CSS/JS (no framework — the catalog is 27 items, React is overkill)
- Node --test for the test suite (34 tests, zero deps)
- GitHub Pages for hosting
- JSON catalog as single source of truth
```

**Tweet 5 (proof)**
```
Test suite: 34/34 green ✅

The repo:
github.com/nikopastore/ai-training-hub

Live demo:
nikopastore.github.io/ai-training-hub
```

**Tweet 6 (CTA)**
```
If you're trying to get fluent in AI in 2026, fork it, swap in your own course list, and start earning XP for the work you're already doing.

Star if it's useful, PRs welcome.
```

---

## LinkedIn — long-form post

```
I built something I'm actually using every day, and I wanted to share it.

AI Training Hub is a gamified, personally curated command center for the top AI/ML courses of 2026. 27 courses, organized into three tiers — Learn (foundations), Build (hands-on), Ship (production). 18 of them are from Anthropic's own Skilljar track (Claude API, MCP, tool use, the constitutional AI curriculum).

What it does:
• Tracks your progress through each course (not started → in progress → completed)
• Awards XP and a level number when you finish one
• Unlocks achievements (15 total — from "First Step" to "Completionist")
• Maintains a daily streak that auto-bumps when you come back the next day
• Filters and searches to help you find the right course for your next 30 minutes

The numbers:
• 27 courses across 3 tiers
• 15 achievements
• 99 levels
• 34 tests, all green
• ~75 KB of code total
• Zero runtime dependencies

The tech choices were deliberate:
• Vanilla HTML/CSS/JS — the catalog is 27 items, so a framework would be more code than the app
• Node's built-in test runner — no Jest, no Vitest, no jsdom
• GitHub Pages — free, fast, no vendor lock-in
• localStorage — your progress never leaves your device

The whole thing is open source (MIT) and lives at github.com/nikopastore/ai-training-hub. Live demo at nikopastore.github.io/ai-training-hub.

If you're trying to build real AI fluency this year, fork it, swap in your own course list, and start earning XP for the work you're already doing. PRs welcome.

#AI #MachineLearning #Claude #Anthropic #Learning #OpenSource
```

---

## Cold DM / share snippet

**Short (for DMs to people you know):**
```
Hey — I built a small thing I think you'd like.

AI Training Hub: a gamified tracker for 27 of the best AI/ML courses of 2026. 18 are from Anthropic's Skilljar (Claude API, MCP, agents, etc.). XP, levels, achievements, daily streaks.

github.com/nikopastore/ai-training-hub

If you end up using it, I'd love to hear what you think.
```

**Longer (for DMs to people you don't know well):**
```
Subject: Built something I think you'd find useful

Hi [name],

I've been working through Anthropic's AI course catalog this year and got tired of tracking progress in a spreadsheet. So I built a small open-source tool for it.

AI Training Hub: 27 courses (18 from Anthropic Skilljar), gamified with XP/levels/achievements, hosted free on GitHub Pages, all your data stays in localStorage.

github.com/nikopastore/ai-training-hub

If you're tracking your own AI learning, you might find it useful. No strings attached, no signup, no upsell.

Cheers,
Niko
```

---

## Posting cadence

| Day | Platform | Post |
|---|---|---|
| Day 1 morning | X | 6-tweet thread |
| Day 1 evening | LinkedIn | Long-form post |
| Day 1-3 | DMs | 3-5 personal shares |
| Day 7 | X | "One week update" — what you've completed using it |
| Day 30 | X | "What I learned" — synthesis post |

The day-7 and day-30 posts are the ones that build real credibility.
