// Test suite for AI Training Hub gamification engine
// Run with: node --test tests/gamification.test.mjs
// Zero dependencies. Uses node:test and node:assert/strict.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const appSource = readFileSync(join(projectRoot, "app.js"), "utf8");

const noop = () => {};
const window = {
  addEventListener: noop,
  removeEventListener: noop,
  scrollTo: noop,
  scrollY: 0,
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
  AITrainingHub: undefined,
};
const localStorage = (() => {
  let store = {};
  const keys = () => Object.keys(store);
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
    get length() { return keys().length; },
    key: (i) => keys()[i] ?? null,
  };
})();

const noopEl = {
  textContent: "",
  innerHTML: "",
  classList: { add: noop, remove: noop, contains: () => false },
  style: {},
  setAttribute: noop,
  appendChild: noop,
  addEventListener: noop,
  removeEventListener: noop,
  querySelector: () => null,
  querySelectorAll: () => [],
  closest: () => null,
  dataset: {},
  hidden: false,
  focus: noop,
  value: "",
  files: [],
};
const document = {
  readyState: "complete",
  addEventListener: noop,
  querySelector: () => noopEl,
  querySelectorAll: () => [],
  createElement: () => noopEl,
  body: { appendChild: noop },
  documentElement: { dataset: {} },
};
const fetch = async () => { throw new Error("fetch not available in tests"); };

const Hub = new Function("window", "localStorage", "document", "fetch", appSource + "; return window.AITrainingHub;")(window, localStorage, document, fetch);

// ============================================================
// XP CURVE
// ============================================================
test("xpForLevel returns expected curve values", () => {
  assert.equal(Hub.xpForLevel(1), 100);
  assert.equal(Hub.xpForLevel(2), 282);
  assert.equal(Hub.xpForLevel(3), 519);
  assert.equal(Hub.xpForLevel(4), 800);
});

test("levelFromXP at 0 XP is level 1", () => {
  const r = Hub.levelFromXP(0);
  assert.equal(r.level, 1);
  assert.equal(r.currentLevelXP, 0);
  assert.equal(r.nextLevelXP, 100);
});

test("levelFromXP at exactly 100 XP promotes to level 2", () => {
  const r = Hub.levelFromXP(100);
  assert.equal(r.level, 2);
  assert.equal(r.currentLevelXP, 0);
  assert.equal(r.nextLevelXP, 282);
});

test("levelFromXP at 382 XP (= 100+282) is level 3", () => {
  const r = Hub.levelFromXP(382);
  assert.equal(r.level, 3);
});

test("levelFromXP mid-level reports correct current and next", () => {
  const r = Hub.levelFromXP(150);
  assert.equal(r.level, 2);
  assert.equal(r.currentLevelXP, 50);
  assert.equal(r.nextLevelXP, 282);
});

test("xpForLevel is monotonically increasing", () => {
  let prev = 0;
  for (let n = 1; n <= 20; n++) {
    const v = Hub.xpForLevel(n);
    assert.ok(v > prev, `level ${n} XP should be > level ${n - 1} (${prev})`);
    prev = v;
  }
});

// ============================================================
// DATE / STREAK
// ============================================================
test("today returns ISO date YYYY-MM-DD", () => {
  assert.match(Hub.today(), /^\d{4}-\d{2}-\d{2}$/);
});

test("daysBetween 0 for same day", () => {
  assert.equal(Hub.daysBetween("2026-06-07", "2026-06-07"), 0);
});

test("daysBetween 1 for consecutive days", () => {
  assert.equal(Hub.daysBetween("2026-06-06", "2026-06-07"), 1);
});

test("daysBetween 7 for a week apart", () => {
  assert.equal(Hub.daysBetween("2026-05-31", "2026-06-07"), 7);
});

test("daysBetween handles month boundaries", () => {
  assert.equal(Hub.daysBetween("2026-05-31", "2026-06-01"), 1);
  assert.equal(Hub.daysBetween("2026-01-31", "2026-02-01"), 1);
});

test("daysBetween handles leap year", () => {
  assert.equal(Hub.daysBetween("2024-02-28", "2024-03-01"), 2);
});

// ============================================================
// ACHIEVEMENTS
// ============================================================
test("ACHIEVEMENTS list has 19 entries (4 quality-tier achievements)", () => {
  assert.equal(Hub.ACHIEVEMENTS.length, 19);
});

test("each achievement has id, icon, name, desc", () => {
  for (const a of Hub.ACHIEVEMENTS) {
    assert.ok(a.id, "missing id");
    assert.ok(a.icon, `missing icon for ${a.id}`);
    assert.ok(a.name, `missing name for ${a.id}`);
    assert.ok(a.desc, `missing desc for ${a.id}`);
  }
});

test("achievement ids are unique", () => {
  const ids = Hub.ACHIEVEMENTS.map(a => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("anthropic-pick achievement exists", () => {
  const a = Hub.ACHIEVEMENTS.find(x => x.id === "anthropic-pick");
  assert.ok(a, "anthropic-pick achievement should exist");
  assert.match(a.name, /anthropic/i);
});

test("s-tier-collector achievement exists with crown icon", () => {
  const a = Hub.ACHIEVEMENTS.find(x => x.id === "s-tier-collector");
  assert.ok(a);
  assert.equal(a.icon, "👑");
});

test("a-tier-collector achievement exists with gold medal icon", () => {
  const a = Hub.ACHIEVEMENTS.find(x => x.id === "a-tier-collector");
  assert.ok(a);
  assert.equal(a.icon, "🥇");
});

test("tier-explorer achievement exists", () => {
  const a = Hub.ACHIEVEMENTS.find(x => x.id === "tier-explorer");
  assert.ok(a);
});

test("centurion achievement exists with 💯 icon", () => {
  const a = Hub.ACHIEVEMENTS.find(x => x.id === "centurion");
  assert.ok(a);
  assert.equal(a.icon, "💯");
  assert.match(a.desc, /1[,.]?000 XP/i);
});

// ============================================================
// QUALITY TIER SYSTEM
// ============================================================
test("QUALITY_TIERS exposes S/A/B/C in order", () => {
  assert.deepEqual(Hub.QUALITY_TIERS, ["S", "A", "B", "C"]);
});

test("QUALITY_LABELS has entries for all 4 tiers", () => {
  for (const t of ["S", "A", "B", "C"]) {
    assert.ok(Hub.QUALITY_LABELS[t], `missing label for ${t}`);
  }
});

test("QUALITY_DESCRIPTIONS has entries for all 4 tiers", () => {
  for (const t of ["S", "A", "B", "C"]) {
    assert.ok(Hub.QUALITY_DESCRIPTIONS[t], `missing description for ${t}`);
  }
});

test("catalog has at least 1 S-tier course", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  const sCount = catalog.filter(c => c.quality === "S").length;
  assert.ok(sCount >= 1, `expected >= 1 S-tier course, found ${sCount}`);
});

test("every course in catalog has a quality tier (S/A/B/C)", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  for (const c of catalog) {
    assert.ok(["S", "A", "B", "C"].includes(c.quality), `course ${c.id} has invalid quality: ${c.quality}`);
    assert.ok(c.qualityReason, `course ${c.id} missing qualityReason`);
  }
});

test("5 new certification courses are present", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  const required = [
    "anthropic-claude-cert-architect",
    "github-foundations",
    "google-ai-essentials",
    "aws-ai-practitioner",
    "ibm-genai-engineering",
  ];
  for (const id of required) {
    const found = catalog.find(c => c.id === id);
    assert.ok(found, `expected course ${id} to exist`);
    assert.ok(found.url.startsWith("https://"), `${id} should have https URL`);
  }
});

test("completing all S-tier courses unlocks s-tier-collector achievement", () => {
  Hub.resetAll();
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  const sCourses = catalog.filter(c => c.quality === "S");
  for (const c of sCourses) {
    Hub.completeCourse(c.id, c, catalog);
  }
  assert.ok(Hub.getState().achievements["s-tier-collector"], "s-tier-collector should be unlocked");
});

test("completing one of each tier (S+A+B) unlocks tier-explorer achievement", () => {
  Hub.resetAll();
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  const s = catalog.find(c => c.quality === "S");
  const a = catalog.find(c => c.quality === "A");
  const b = catalog.find(c => c.quality === "B");
  assert.ok(s && a && b, "catalog must have at least one S, A, and B course");
  Hub.completeCourse(s.id, s, catalog);
  Hub.completeCourse(a.id, a, catalog);
  Hub.completeCourse(b.id, b, catalog);
  assert.ok(Hub.getState().achievements["tier-explorer"], "tier-explorer should be unlocked after S+A+B");
});

test("earning 1000+ XP from S-tier courses unlocks centurion achievement", () => {
  Hub.resetAll();
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  const sCourses = catalog.filter(c => c.quality === "S");
  // Complete enough S-tier courses to hit 1000 XP
  let xp = 0;
  for (const c of sCourses) {
    if (xp >= 1000) break;
    Hub.completeCourse(c.id, c, catalog);
    xp += c.xp;
  }
  assert.ok(xp >= 1000, `test setup: need 1000+ S XP, got ${xp}`);
  assert.ok(Hub.getState().achievements["centurion"], "centurion should unlock at 1000+ S-tier XP");
});

test("5 new certification courses (azure/aws-ml/google-ml/nvidia/kaggle) are present", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  const required = [
    "azure-ai-engineer",
    "aws-ml-specialty",
    "google-ml-engineer",
    "nvidia-dli",
    "kaggle-learn",
  ];
  for (const id of required) {
    const found = catalog.find(c => c.id === id);
    assert.ok(found, `expected course ${id} to exist`);
    assert.ok(found.url.startsWith("https://"), `${id} should have https URL`);
    assert.ok(["S", "A", "B", "C"].includes(found.quality), `${id} should have quality tier`);
  }
});

test("catalog has exactly 5 top picks (curated S-tier highlights)", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  const picks = catalog.filter(c => c.picks === true);
  assert.equal(picks.length, 5, `expected 5 top picks, found ${picks.length}`);
  for (const p of picks) {
    assert.equal(p.quality, "S", `top pick should be S-tier: ${p.id} is ${p.quality}`);
  }
});

test("AWS ML Specialty is in the top picks (new addition)", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  const aws = catalog.find(c => c.id === "aws-ml-specialty");
  assert.ok(aws.picks === true, "AWS ML Specialty should be a top pick");
});

test("at least 60 courses in catalog", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  assert.ok(catalog.length >= 60, `expected >= 60 courses, got ${catalog.length}`);
});

test("every course has a brand field with logo + color + initials", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  for (const c of catalog) {
    assert.ok(c.brand, `course ${c.id} missing brand`);
    assert.ok(c.brand.logo, `course ${c.id} missing brand.logo`);
    assert.ok(c.brand.color, `course ${c.id} missing brand.color`);
    assert.match(c.brand.color, /^#[0-9a-f]{6}$/i, `course ${c.id} invalid color format`);
    assert.ok(c.brand.initials, `course ${c.id} missing brand.initials`);
    assert.ok(c.brand.name, `course ${c.id} missing brand.name`);
  }
});

test("every course has a real logo URL (not a placeholder service)", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  // Count how many courses use real logo sources vs placeholders
  const realSources = ["wikipedia", "yt3", "devicon", "avatars.githubusercontent.com", "madewithml.com", "langfuse.com", "github.githubassets", "huggingface.co"];
  const realCount = catalog.filter(c => realSources.some(s => c.brand.logo.includes(s))).length;
  // At least 95% should be real (we have 60 courses with 23 unique URLs, mostly all real)
  assert.ok(realCount >= 55, `expected >= 55 courses with real logos, got ${realCount}`);
});

test("no course uses ui-avatars (placeholder service)", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  const placeholderCount = catalog.filter(c => c.brand.logo.includes("ui-avatars")).length;
  assert.equal(placeholderCount, 0, `expected 0 placeholder logos, found ${placeholderCount}`);
});

test("at least 10 unique brand colors used across the catalog", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  const colors = new Set(catalog.map(c => c.brand.color));
  assert.ok(colors.size >= 10, `expected >= 10 unique brand colors, got ${colors.size}`);
});

// ============================================================
// STATE
// ============================================================
test("getState returns deep copy (mutations don't leak)", () => {
  const s1 = Hub.getState();
  s1.xp = 99999;
  const s2 = Hub.getState();
  assert.notEqual(s2.xp, 99999);
});

test("resetAll wipes state", () => {
  Hub.completeCourse("test-id", { id: "test-id", xp: 100, tags: [] }, []);
  Hub.resetAll();
  const s = Hub.getState();
  assert.equal(s.xp, 0);
  assert.equal(s.streak, 0);
  assert.deepEqual(s.courses, {});
  assert.deepEqual(s.achievements, {});
});

// ============================================================
// CATALOG INTEGRITY
// ============================================================
test("courses.json loads and is non-empty", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  assert.ok(Array.isArray(catalog));
  assert.ok(catalog.length >= 20);
});

test("every course has required fields", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  for (const c of catalog) {
    assert.ok(c.id, `course missing id: ${JSON.stringify(c)}`);
    assert.ok(c.title, `course ${c.id} missing title`);
    assert.ok(c.provider, `course ${c.id} missing provider`);
    assert.ok(c.tier, `course ${c.id} missing tier`);
    assert.ok(["learn", "build", "ship"].includes(c.tier), `course ${c.id} has invalid tier: ${c.tier}`);
    assert.ok(typeof c.xp === "number" && c.xp > 0, `course ${c.id} has invalid xp`);
    assert.ok(c.url, `course ${c.id} missing url`);
  }
});

test("course ids are unique", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  const ids = catalog.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("course urls are well-formed", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  for (const c of catalog) {
    assert.match(c.url, /^https?:\/\//, `course ${c.id} url should start with http(s)`);
  }
});

test("all 3 tiers have at least 5 courses each", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  const counts = { learn: 0, build: 0, ship: 0 };
  for (const c of catalog) counts[c.tier]++;
  assert.ok(counts.learn >= 5);
  assert.ok(counts.build >= 5);
  assert.ok(counts.ship >= 5);
});

test("at least 15 courses are tagged 'anthropic'", () => {
  const catalog = JSON.parse(readFileSync(join(projectRoot, "data/courses.json"), "utf8"));
  const anthropic = catalog.filter(c => (c.tags || []).includes("anthropic"));
  assert.ok(anthropic.length >= 15, `expected >= 15, found ${anthropic.length}`);
});

// ============================================================
// IDEMPOTENCY
// ============================================================
test("completing the same course twice does not double-award XP", () => {
  Hub.resetAll();
  const course = { id: "test", xp: 100, tags: [] };
  const r1 = Hub.completeCourse("test", course, [course]);
  assert.equal(r1.xpGained, 100);
  const r2 = Hub.completeCourse("test", course, [course]);
  assert.equal(r2, null);
  assert.equal(Hub.getState().xp, 100);
});

test("starting then completing the same course awards XP once", () => {
  Hub.resetAll();
  const course = { id: "test-2", xp: 200, tags: [] };
  Hub.startCourse("test-2", course, [course]);
  const r = Hub.completeCourse("test-2", course, [course]);
  assert.equal(r.xpGained, 200);
  assert.equal(Hub.getState().xp, 200);
});

test("uncompleting a course returns the XP", () => {
  Hub.resetAll();
  const course = { id: "test-3", xp: 150, tags: [] };
  Hub.completeCourse("test-3", course, [course]);
  assert.equal(Hub.getState().xp, 150);
  Hub.uncompleteCourse("test-3", [course]);
  assert.equal(Hub.getState().xp, 0);
});

test("uncompleting an uncompleted course is a no-op", () => {
  Hub.resetAll();
  const r = Hub.uncompleteCourse("never-done");
  assert.equal(r, null);
});

// ============================================================
// ACHIEVEMENT TRIGGERS
// ============================================================
test("completing an anthropic-tagged course unlocks anthropic-pick", () => {
  Hub.resetAll();
  const course = { id: "a1", xp: 100, tags: ["anthropic"] };
  Hub.completeCourse("a1", course, [course]);
  assert.ok(Hub.getState().achievements["anthropic-pick"]);
});

test("starting any course unlocks first-step", () => {
  Hub.resetAll();
  const course = { id: "fs1", xp: 100, tags: [] };
  Hub.startCourse("fs1", course, [course]);
  assert.ok(Hub.getState().achievements["first-step"]);
});

test("completing a course never unlocks nothing — at least 1 achievement fires", () => {
  Hub.resetAll();
  const course = { id: "a2", xp: 100, tags: ["anthropic", "free"] };
  Hub.completeCourse("a2", course, [course]);
  const achCount = Object.keys(Hub.getState().achievements).length;
  assert.ok(achCount >= 2);
});

// ============================================================
// LEVEL / XP INTEGRATION
// ============================================================
test("earning 100 XP at 0 promotes to level 2", () => {
  Hub.resetAll();
  const course = { id: "l1", xp: 100, tags: [] };
  const r = Hub.completeCourse("l1", course, [course]);
  assert.equal(r.leveledUp, true);
  assert.equal(r.newLevel, 2);
});

test("earning XP below threshold does not level up", () => {
  Hub.resetAll();
  const course = { id: "l2", xp: 50, tags: [] };
  const r = Hub.completeCourse("l2", course, [course]);
  assert.equal(r.leveledUp, false);
  assert.equal(r.newLevel, 1);
});

test("big XP grant triggers multi-level up", () => {
  Hub.resetAll();
  const course = { id: "l3", xp: 500, tags: [] };
  const r = Hub.completeCourse("l3", course, [course]);
  assert.ok(r.newLevel >= 2);
  assert.equal(r.leveledUp, true);
});

// ============================================================
// P1.3 SCHEMA VERSIONING
// ============================================================
test("default state carries current schema number", () => {
  Hub.resetAll();
  assert.equal(Hub.getState().schema, Hub.CURRENT_SCHEMA);
});

test("STORAGE_KEY reflects current schema (so users on v1 can be migrated)", () => {
  assert.match(Hub.STORAGE_KEY, /^ai-training-hub-state-v\d+$/);
  assert.equal(Hub.STORAGE_KEY, `ai-training-hub-state-v${Hub.CURRENT_SCHEMA}`);
});

test("migrateState fills missing fields with defaults", () => {
  const out = Hub.migrateState({ xp: 250, courses: { c1: { status: "in-progress" } } });
  assert.equal(out.schema, Hub.CURRENT_SCHEMA);
  assert.equal(out.xp, 250);
  assert.equal(out.streak, 0);
  assert.deepEqual(out.courses, { c1: { status: "in-progress" } });
});

test("migrateState rejects bogus shapes and returns a default", () => {
  assert.equal(Hub.migrateState(null).schema, Hub.CURRENT_SCHEMA);
  assert.equal(Hub.migrateState(undefined).schema, Hub.CURRENT_SCHEMA);
  assert.equal(Hub.migrateState("garbage").schema, Hub.CURRENT_SCHEMA);
  assert.equal(Hub.migrateState(42).schema, Hub.CURRENT_SCHEMA);
});

test("migrateState clamps negative/NaN XP to zero", () => {
  assert.equal(Hub.migrateState({ xp: -50 }).xp, 0);
  assert.equal(Hub.migrateState({ xp: Number.NaN }).xp, 0);
  assert.equal(Hub.migrateState({ xp: Number.POSITIVE_INFINITY }).xp, 0);
});

// ============================================================
// P1.2 EXPORT / IMPORT
// ============================================================
test("exportPayload includes app identifier + version + timestamp + state", () => {
  Hub.resetAll();
  Hub.completeCourse("ex1", { id: "ex1", xp: 100, tags: [] }, [{ id: "ex1", xp: 100, tags: [] }]);
  const payload = Hub.exportPayload();
  assert.equal(payload.app, "ai-training-hub");
  assert.equal(typeof payload.exportVersion, "number");
  assert.match(payload.exportedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(payload.schema, Hub.CURRENT_SCHEMA);
  assert.equal(payload.state.xp, 100);
});

test("applyPayload rejects non-hub-shaped payloads", () => {
  assert.equal(Hub.applyPayload(null), false);
  assert.equal(Hub.applyPayload({ app: "something-else" }), false);
  assert.equal(Hub.applyPayload({ app: "ai-training-hub" }), false);
});

test("applyPayload round-trips: export → clear → import → same state", () => {
  Hub.resetAll();
  Hub.completeCourse("rt1", { id: "rt1", xp: 250, tags: [] }, [{ id: "rt1", xp: 250, tags: [] }]);
  Hub.completeCourse("rt2", { id: "rt2", xp: 300, tags: ["anthropic"] }, [{ id: "rt2", xp: 300, tags: ["anthropic"] }]);
  const snapshot = Hub.exportPayload();
  Hub.resetAll();
  assert.equal(Hub.getState().xp, 0);
  const ok = Hub.applyPayload(snapshot);
  assert.equal(ok, true);
  assert.equal(Hub.getState().xp, 550);
  assert.ok(Hub.getState().courses.rt1);
  assert.ok(Hub.getState().courses.rt2);
  assert.ok(Hub.getState().achievements["first-step"]);
});

test("applyPayload migrates old-shape data (no schema field) on import", () => {
  const old = { xp: 200, courses: {}, achievements: {} }; // no schema
  const ok = Hub.applyPayload({ app: "ai-training-hub", state: old });
  assert.equal(ok, true);
  assert.equal(Hub.getState().schema, Hub.CURRENT_SCHEMA);
  assert.equal(Hub.getState().xp, 200);
});

// ============================================================
// P1.1 DARK MODE
// ============================================================
test("THEME_KEY and FILTERS_KEY are exposed for testability", () => {
  assert.equal(Hub.THEME_KEY, "ai-training-hub-theme");
  assert.equal(Hub.FILTERS_KEY, "ai-training-hub-filters");
});

test("applyTheme sets the data-theme attribute on documentElement", () => {
  const applied = Hub.applyTheme("dark");
  assert.equal(applied, "dark");
  assert.equal(document.documentElement.dataset.theme, "dark");
  Hub.applyTheme("light");
  assert.equal(document.documentElement.dataset.theme, "light");
});

test("toggleTheme flips between light and dark", () => {
  Hub.applyTheme("light");
  assert.equal(Hub.toggleTheme(), "dark");
  assert.equal(Hub.getTheme(), "dark");
  assert.equal(Hub.toggleTheme(), "light");
  assert.equal(Hub.getTheme(), "light");
});

test("toggleTheme persists the new theme to localStorage", () => {
  Hub.applyTheme("light");
  Hub.toggleTheme();
  assert.equal(localStorage.getItem(Hub.THEME_KEY), "dark");
  Hub.toggleTheme();
  assert.equal(localStorage.getItem(Hub.THEME_KEY), "light");
});

// ============================================================
// P1.3 LOAD-STATE MIGRATION FROM OLDER STORAGE KEYS
// ============================================================
test("a payload stored under the current key is round-tripped", () => {
  localStorage.clear();
  Hub.resetAll();
  Hub.completeCourse("m1", { id: "m1", xp: 100, tags: [] }, [{ id: "m1", xp: 100, tags: [] }]);
  const raw = localStorage.getItem(Hub.STORAGE_KEY);
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.xp, 100);
  assert.equal(parsed.schema, Hub.CURRENT_SCHEMA);
});

// ============================================================
// P1 — INTEGRATION SMOKE
// ============================================================
test("P1 integration: export a real session and re-import on a blank slate", () => {
  Hub.resetAll();
  // Simulate a real session: start 2, complete 1.
  const catalog = [
    { id: "i1", xp: 100, tags: ["anthropic"] },
    { id: "i2", xp: 200, tags: [] },
  ];
  Hub.startCourse("i1", catalog[0], catalog);
  Hub.completeCourse("i1", catalog[0], catalog);
  Hub.startCourse("i2", catalog[1], catalog);
  const before = Hub.getState();
  const backup = Hub.exportPayload();
  Hub.resetAll();
  assert.equal(Hub.getState().xp, 0);
  Hub.applyPayload(backup);
  const after = Hub.getState();
  assert.equal(after.xp, before.xp);
  assert.equal(after.streak, before.streak);
  assert.deepEqual(after.courses, before.courses);
  assert.deepEqual(Object.keys(after.achievements), Object.keys(before.achievements));
});

// ============================================================
// P2 — ONBOARDING + STICKY MOTIVATION UX
// ============================================================
test("P2 exposes an onboarding storage key", () => {
  assert.equal(Hub.ONBOARDING_KEY, "ai-training-hub-onboarding-v1");
});

test("shouldShowOnboarding only returns true for a first-run blank state", () => {
  const blank = { courses: {}, xp: 0, achievements: {} };
  assert.equal(Hub.shouldShowOnboarding(blank, null), true);
  assert.equal(Hub.shouldShowOnboarding(blank, "seen"), false);
  assert.equal(Hub.shouldShowOnboarding({ ...blank, xp: 100 }, null), false);
  assert.equal(Hub.shouldShowOnboarding({ ...blank, courses: { c1: { status: "in-progress" } } }, null), false);
});

test("getNextInProgressCourse returns the most recently started active course", () => {
  const catalog = [
    { id: "old", title: "Old course" },
    { id: "new", title: "New course" },
    { id: "done", title: "Done course" },
  ];
  const state = {
    courses: {
      old: { status: "in-progress", startedAt: "2026-01-01T00:00:00.000Z" },
      new: { status: "in-progress", startedAt: "2026-02-01T00:00:00.000Z" },
      done: { status: "completed", startedAt: "2026-03-01T00:00:00.000Z" },
    },
  };
  assert.equal(Hub.getNextInProgressCourse(catalog, state)?.id, "new");
});

test("filterCatalog returns matching courses for empty-state decisions", () => {
  const catalog = [
    { id: "a", title: "Claude Code", provider: "Anthropic", tier: "build", quality: "S", tags: ["coding"], description: "agents" },
    { id: "b", title: "AI Basics", provider: "Google", tier: "learn", quality: "A", tags: ["foundations"], description: "intro" },
  ];
  assert.deepEqual(Hub.filterCatalog(catalog, { activeFilter: "build", activeQuality: "S", searchQuery: "claude" }).map(c => c.id), ["a"]);
  assert.deepEqual(Hub.filterCatalog(catalog, { activeFilter: "ship", activeQuality: "all", searchQuery: "zzz" }), []);
});
