# Launch checklist — AI Training Hub v1.0.0

This is the step-by-step playbook to take the project from "code on disk" to "live at nikopastore.github.io/ai-training-hub."

**Estimated total time: 60-75 minutes.**

---

## Phase 1: Verify locally (10 min)

### 1.1 Run the test suite

```bash
cd ~/Desktop/ai-training-hub
npm test
```

**Expected: 34+ tests pass.** If any fail, fix them before proceeding.

### 1.2 Smoke-test the site in browser

```bash
npm run serve
# → http://localhost:8000
```

In Chrome, check:
- [ ] All 27 courses render, sorted by tier
- [ ] Click "Start" on a course → it moves to "in progress" state
- [ ] Click "Mark complete" → XP gains, level may go up, toast appears
- [ ] Click "Undo" on a completed course → state rolls back
- [ ] Search box filters as you type
- [ ] Tier filter chips work
- [ ] Achievements unlock at the right milestones
- [ ] Refresh the page → progress persists

### 1.3 Capture screenshots

See `docs/screenshots-README.md` for the 3-shot spec.

---

## Phase 2: GitHub setup (15 min)

### 2.1 Create the repo

```bash
cd ~/Desktop/ai-training-hub
gh repo create ai-training-hub --public --source=. \
  --description "Personal AI fluency tracker — gamified command center for 27 top AI/ML courses" --push
```

### 2.2 Enable GitHub Pages

1. Go to repo → Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `main` / `(root)`
4. Save
5. Wait 2-3 minutes for the first deploy
6. Verify: `https://nikopastore.github.io/ai-training-hub/` should be live

### 2.3 Verify the live site

Open the URL in Chrome. Check the site loads, courses render, state persists.

### 2.4 Pin the repo (optional)

1. Go to your GitHub profile
2. Click "Customize your pins"
3. Pin `ai-training-hub`

---

## Phase 3: Portfolio integration (15 min)

### 3.1 Add to the portfolio site

The portfolio lives at `~/hermes-workspaces/Niko-Portfolio-site/`. Verify:

- `src/lib/data.ts` has AI Training Hub in `projects[]`
- `src/lib/data.ts` has AI Training Hub in `apps[]`
- `src/content/blog/ai-training-hub-case-study.mdx` exists and renders

### 3.2 Verify the portfolio builds

```bash
cd ~/hermes-workspaces/Niko-Portfolio-site
npm run dev
```

### 3.3 Deploy the portfolio

```bash
npm run build
# then whatever the deploy command is
```

---

## Phase 4: Social launch (15-30 min)

See `SOCIAL.md` for the pre-written copy. Recommended order:

1. **X thread** (6 tweets) — highest-leverage
2. **LinkedIn long-form** — post ~30 min later
3. **Cold DMs** — to 3-5 people you'd want to share this with

### Best times to post (Phoenix time)
- **X**: Tue-Thu, 8-10am or 7-9pm
- **LinkedIn**: Tue-Thu, 7-9am

---

## Phase 5: Resume (5 min)

Add one line to your resume's "Personal Projects" section:

> **AI Training Hub** · [github.com/nikopastore/ai-training-hub](https://github.com/nikopastore/ai-training-hub) · [Live demo](https://nikopastore.github.io/ai-training-hub/)
> Built a vanilla-JS gamified course tracker (XP, levels, 15 achievements, streaks) over 27 curated AI/ML courses. JSON-driven catalog, 34-test suite, GitHub Pages demo.

Frame as a personal project, not job prep.

---

## What "done" looks like

- [ ] `npm test` is green
- [ ] Repo is public at github.com/nikopastore/ai-training-hub
- [ ] Site is live at nikopastore.github.io/ai-training-hub
- [ ] Portfolio site has 2 new cards + 1 new blog post
- [ ] Resume has 1 new line
- [ ] X thread is posted
- [ ] LinkedIn post is posted
- [ ] README has screenshots
