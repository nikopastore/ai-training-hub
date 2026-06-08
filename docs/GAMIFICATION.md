# Gamification design

The whole point of gamification here is to make the *start* of a course feel rewarding.

## XP curve

```
Level 1 → 2:  100 XP
Level 2 → 3:  282 XP
Level 3 → 4:  519 XP
Level 4 → 5:  800 XP
Level 5 → 6:  1,118 XP
...
```

Formula: `xpForLevel(n) = floor(100 * n^1.5)`

This is faster than a linear ramp (which feels grindy past level 5) and slower than a quadratic (which front-loads all the satisfaction). Early levels tick over every 1-2 course completions; later levels are a real milestone.

## Per-course XP rewards

| Tier | XP range | Rationale |
|---|---|---|
| **Learn** | 150-220 | Foundations — fast to complete, lower stakes |
| **Build** | 200-300 | Hands-on — longer, higher reward |
| **Ship** | 240-400 | Production-grade — biggest payoff |

Anthropic Skilljar courses are weighted slightly higher (200-320) because they're longer and more directly applicable to real work.

## Achievements (15 total)

### Onboarding
- **🌱 First Step** — Start your first course
- **🟣 Anthropic Pick** — Complete an Anthropic Skilljar course

### Streak
- **🔥 On Fire** — 3-day streak
- **⚡ Week Warrior** — 7-day streak

### Tier completion
- **📚 Lifelong Learner** — Complete all Learn-tier courses
- **🛠️ Builder** — Complete all Build-tier courses
- **🚀 Shipper** — Complete all Ship-tier courses

### Levels
- **⭐ Rising Star** — Reach Level 5
- **🌟 Expert** — Reach Level 10

### Volume
- **🎯 Halfway There** — Complete 50% of all courses
- **🏆 Completionist** — Complete all 27 courses

### Style
- **🌐 Polyglot** — Try courses from 4+ different providers
- **🤿 Deep Dive** — Complete 3 courses in one week
- **☀️ Early Bird** — Log progress before 9am
- **🦉 Night Owl** — Log progress after 10pm

## Streak math

```
state.streak += 1
  when: lastActiveDate is exactly 1 day before today
state.streak = 1 (reset, no bonus)
  when: gap is 2+ days, OR first ever action
state.streak unchanged
  when: lastActiveDate is today
```

The streak doesn't break until you've missed a full day. The window resets on calendar day, not 24-hour rolling — punishing a midnight coder for not opening the app at 9am the next day would feel bad.

## Level-up celebration

When XP crosses a level threshold, a toast fires: `🎉 Level 5! +240 XP`. The toast stacks, so if you complete two courses in a row that each trigger achievements, you'll see the XP toast, then the achievement toast 1.5s later, then the next. It feels like a small celebration without being obnoxious.

## Reset behavior

The Reset button (in the footer of the admin view) wipes localStorage and reloads. There's no soft-delete — once you reset, the data is gone. This is by design: it forces the reset to be deliberate.
