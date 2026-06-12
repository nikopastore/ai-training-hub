// AI Training Hub — gamified course tracker
// Vanilla JS, no dependencies. localStorage-backed state.

(() => {
  "use strict";

  // ============================================================
  // CONSTANTS
  // ============================================================
  // Bump CURRENT_SCHEMA when payload shape changes. The migration shim
  // in loadState() handles older payloads and stores the current version
  // inside the payload so future versions can detect and migrate up.
  const CURRENT_SCHEMA = 1;
  const STORAGE_KEY = `ai-training-hub-state-v${CURRENT_SCHEMA}`;
  const THEME_KEY = "ai-training-hub-theme";
  const FILTERS_KEY = "ai-training-hub-filters";
  const ONBOARDING_KEY = "ai-training-hub-onboarding-v1";
  const TIERS = ["learn", "build", "ship"];
  const TIER_LABELS = { learn: "Learn", build: "Build", ship: "Ship" };

  // Quality tier (S=top, A=strong, B=useful, C=niche) — graded on usefulness + market weight
  const QUALITY_TIERS = ["S", "A", "B", "C"];
  const QUALITY_LABELS = {
    S: "S — Top tier",
    A: "A — Strong",
    B: "B — Useful",
    C: "C — Niche",
  };
  const QUALITY_DESCRIPTIONS = {
    S: "Industry-defining content, top recognition, essential reference",
    A: "Authoritative training, well-recognized, high production value",
    B: "Solid content, useful learning, moderate industry recognition",
    C: "Niche or specialized, useful for specific contexts",
  };

  // XP curve: level n requires (100 * n^1.5) cumulative XP
  const xpForLevel = (n) => Math.floor(100 * Math.pow(n, 1.5));

  const levelFromXP = (xp) => {
    let level = 1;
    let cumulative = 0;
    while (cumulative + xpForLevel(level) <= xp) {
      cumulative += xpForLevel(level);
      level += 1;
      if (level > 99) break;
    }
    return { level, currentLevelXP: xp - cumulative, nextLevelXP: xpForLevel(level) };
  };

  // ============================================================
  // STATE
  // ============================================================
  const defaultState = () => ({
    schema: CURRENT_SCHEMA,
    courses: {},
    xp: 0,
    lastActiveDate: null,
    streak: 0,
    achievements: {},
  });

  let state = defaultState();

  // Wrap a parsed localStorage payload with the current schema and
  // backfill any missing fields. Add a new branch when CURRENT_SCHEMA
  // bumps; never mutate the original parsed object.
  const migrateState = (raw) => {
    if (!raw || typeof raw !== "object") return defaultState();
    const merged = { ...defaultState(), ...raw };
    if (!merged.schema) merged.schema = 1;
    if (!merged.courses || typeof merged.courses !== "object") merged.courses = {};
    if (typeof merged.xp !== "number" || !Number.isFinite(merged.xp) || merged.xp < 0) merged.xp = 0;
    if (typeof merged.streak !== "number" || merged.streak < 0) merged.streak = 0;
    if (!merged.achievements || typeof merged.achievements !== "object") merged.achievements = {};
    merged.schema = CURRENT_SCHEMA;
    return merged;
  };

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // No current-version payload — try to migrate from any prior
        // ai-training-hub-state-v* key (best-effort, not a fatal error).
        const prefix = "ai-training-hub-state-v";
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix) && k !== STORAGE_KEY) {
            try {
              const older = JSON.parse(localStorage.getItem(k));
              state = migrateState(older);
              saveState();
              localStorage.removeItem(k);
              return;
            } catch (_) { /* fallthrough */ }
          }
        }
        return;
      }
      const parsed = JSON.parse(raw);
      state = migrateState(parsed);
    } catch (e) {
      console.warn("Failed to load state, using defaults", e);
    }
  };

  const saveState = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Failed to save state", e);
    }
  };

  // ============================================================
  // THEME (light / dark) — persisted in localStorage with override
  // for prefers-color-scheme. Header has a manual toggle.
  // ============================================================
  const getStoredTheme = () => {
    try { return localStorage.getItem(THEME_KEY) || null; } catch { return null; }
  };
  const setStoredTheme = (t) => {
    try { localStorage.setItem(THEME_KEY, t); } catch (_) { /* noop */ }
  };
  const applyTheme = (theme) => {
    const resolved = theme === "dark" || theme === "light"
      ? theme
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = resolved;
    const btn = document.querySelector("[data-action=\"toggle-theme\"]");
    if (btn) {
      btn.setAttribute("aria-label", `Switch to ${resolved === "dark" ? "light" : "dark"} mode`);
      btn.setAttribute("title", `Switch to ${resolved === "dark" ? "light" : "dark"} mode`);
    }
    return resolved;
  };
  const initTheme = () => {
    const stored = getStoredTheme();
    return applyTheme(stored || "auto");
  };
  const toggleTheme = () => {
    const current = document.documentElement.dataset.theme || "light";
    const next = current === "dark" ? "light" : "dark";
    setStoredTheme(next);
    applyTheme(next);
    return next;
  };

  // ============================================================
  // FILTER PERSISTENCE — active tier/quality + search query + scroll
  // ============================================================
  const loadFilters = () => {
    try {
      const raw = localStorage.getItem(FILTERS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  };
  const saveFilters = () => {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify({
        activeFilter,
        activeQuality,
        searchQuery,
        scrollY: window.scrollY || 0,
      }));
    } catch (_) { /* noop */ }
  };
  const stateHasProgress = (snapshot) => {
    const s = snapshot || defaultState();
    const courses = s.courses && typeof s.courses === "object" ? s.courses : {};
    const hasCourseProgress = Object.values(courses).some(c => c && c.status && c.status !== "not-started");
    const hasAchievements = s.achievements && typeof s.achievements === "object" && Object.keys(s.achievements).length > 0;
    return (s.xp || 0) > 0 || hasCourseProgress || hasAchievements;
  };
  const shouldShowOnboarding = (snapshot, seenValue) => !seenValue && !stateHasProgress(snapshot);
  const getNextInProgressCourse = (list, snapshot = state) => {
    const coursesState = snapshot?.courses || {};
    return (list || [])
      .filter(c => coursesState[c.id]?.status === "in-progress")
      .sort((a, b) => {
        const aTime = Date.parse(coursesState[a.id]?.startedAt || "") || 0;
        const bTime = Date.parse(coursesState[b.id]?.startedAt || "") || 0;
        return bTime - aTime;
      })[0] || null;
  };
  const courseMatchesFilters = (course, filters = {}) => {
    const tier = filters.activeFilter || "all";
    const quality = filters.activeQuality || "all";
    const query = (filters.searchQuery || "").trim().toLowerCase();
    if (tier !== "all" && course.tier !== tier) return false;
    if (quality !== "all" && course.quality !== quality) return false;
    if (query) {
      return (
        (course.title || "").toLowerCase().includes(query) ||
        (course.provider || "").toLowerCase().includes(query) ||
        (course.tags || []).some(t => String(t).toLowerCase().includes(query)) ||
        (course.description || "").toLowerCase().includes(query)
      );
    }
    return true;
  };
  const filterCatalog = (list, filters) => (list || []).filter(c => courseMatchesFilters(c, filters));
  const applyFilters = (saved) => {
    if (!saved || typeof saved !== "object") return;
    if (typeof saved.activeFilter === "string") activeFilter = saved.activeFilter;
    if (typeof saved.activeQuality === "string") activeQuality = saved.activeQuality;
    if (typeof saved.searchQuery === "string") searchQuery = saved.searchQuery;
    // search input + scroll are restored after the first render
    if (typeof saved.scrollY === "number") {
      const restore = () => {
        window.scrollTo({ top: saved.scrollY, behavior: "instant" in window ? "instant" : "auto" });
      };
      if (document.readyState === "complete") restore();
      else window.addEventListener("load", restore, { once: true });
    }
  };

  // ============================================================
  // STREAK
  // ============================================================
  const today = () => new Date().toISOString().slice(0, 10);
  const daysBetween = (a, b) => {
    const d1 = new Date(a + "T00:00:00Z");
    const d2 = new Date(b + "T00:00:00Z");
    return Math.round((d2 - d1) / 86400000);
  };

  const updateStreak = () => {
    const t = today();
    if (!state.lastActiveDate) {
      state.lastActiveDate = t;
      state.streak = 1;
      return true;
    }
    const diff = daysBetween(state.lastActiveDate, t);
    if (diff === 0) return false;
    else if (diff === 1) {
      state.streak += 1;
      state.lastActiveDate = t;
      return true;
    } else if (diff > 1) {
      state.streak = 1;
      state.lastActiveDate = t;
      return true;
    }
    return false;
  };

  // ============================================================
  // ACHIEVEMENTS
  // ============================================================
  const ACHIEVEMENTS = [
    { id: "first-step", icon: "🌱", name: "First Step", desc: "Start your first course" },
    { id: "anthropic-pick", icon: "🟣", name: "Anthropic Pick", desc: "Complete an Anthropic Skilljar course" },
    { id: "streak-3", icon: "🔥", name: "On Fire", desc: "Maintain a 3-day streak" },
    { id: "streak-7", icon: "⚡", name: "Week Warrior", desc: "Maintain a 7-day streak" },
    { id: "tier-learn", icon: "📚", name: "Lifelong Learner", desc: "Complete all Learn-tier courses" },
    { id: "tier-build", icon: "🛠️", name: "Builder", desc: "Complete all Build-tier courses" },
    { id: "tier-ship", icon: "🚀", name: "Shipper", desc: "Complete all Ship-tier courses" },
    { id: "level-5", icon: "⭐", name: "Rising Star", desc: "Reach Level 5" },
    { id: "level-10", icon: "🌟", name: "Expert", desc: "Reach Level 10" },
    { id: "half-way", icon: "🎯", name: "Halfway There", desc: "Complete 50% of all courses" },
    { id: "completionist", icon: "🏆", name: "Completionist", desc: "Complete all 27 courses" },
    { id: "polyglot", icon: "🌐", name: "Polyglot", desc: "Try courses from 4+ different providers" },
    { id: "deep-dive", icon: "🤿", name: "Deep Dive", desc: "Complete 3 courses in one week" },
    { id: "morning-person", icon: "☀️", name: "Early Bird", desc: "Log progress before 9am" },
    { id: "night-owl", icon: "🦉", name: "Night Owl", desc: "Log progress after 10pm" },
    { id: "s-tier-collector", icon: "👑", name: "S-Tier Scholar", desc: "Complete all S-tier courses" },
    { id: "a-tier-collector", icon: "🥇", name: "Gold Standard", desc: "Complete all A-tier courses" },
    { id: "tier-explorer", icon: "🎖️", name: "Tier Explorer", desc: "Complete courses from every quality tier (S, A, B)" },
    { id: "centurion", icon: "💯", name: "Centurion", desc: "Earn 1,000 XP from S-tier courses" },
  ];

  const checkAchievements = (catalog) => {
    const newlyUnlocked = [];
    const tryUnlock = (id) => {
      if (!state.achievements[id]) {
        state.achievements[id] = new Date().toISOString();
        newlyUnlocked.push(ACHIEVEMENTS.find(a => a.id === id));
      }
    };

    const completed = catalog.filter(c => state.courses[c.id]?.status === "completed");

    if (Object.values(state.courses).some(s => s.status !== "not-started")) {
      tryUnlock("first-step");
    }
    if (completed.some(c => c.tags?.includes("anthropic"))) {
      tryUnlock("anthropic-pick");
    }
    if (state.streak >= 3) tryUnlock("streak-3");
    if (state.streak >= 7) tryUnlock("streak-7");

    const learnDone = catalog.filter(c => c.tier === "learn" && state.courses[c.id]?.status === "completed").length;
    const learnTotal = catalog.filter(c => c.tier === "learn").length;
    if (learnDone > 0 && learnDone === learnTotal) tryUnlock("tier-learn");

    const buildDone = catalog.filter(c => c.tier === "build" && state.courses[c.id]?.status === "completed").length;
    const buildTotal = catalog.filter(c => c.tier === "build").length;
    if (buildDone > 0 && buildDone === buildTotal) tryUnlock("tier-build");

    const shipDone = catalog.filter(c => c.tier === "ship" && state.courses[c.id]?.status === "completed").length;
    const shipTotal = catalog.filter(c => c.tier === "ship").length;
    if (shipDone > 0 && shipDone === shipTotal) tryUnlock("tier-ship");

    const lvl = levelFromXP(state.xp).level;
    if (lvl >= 5) tryUnlock("level-5");
    if (lvl >= 10) tryUnlock("level-10");

    if (completed.length >= Math.ceil(catalog.length / 2)) tryUnlock("half-way");
    if (completed.length === catalog.length) tryUnlock("completionist");

    const providers = new Set(completed.map(c => c.provider));
    if (providers.size >= 4) tryUnlock("polyglot");

    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const recentCompletions = completed.filter(c => {
      const completedAt = state.courses[c.id]?.completedAt;
      return completedAt && new Date(completedAt).getTime() >= sevenDaysAgo;
    });
    if (recentCompletions.length >= 3) tryUnlock("deep-dive");

    const hour = new Date().getHours();
    if (hour < 9) tryUnlock("morning-person");
    if (hour >= 22) tryUnlock("night-owl");

    // Quality tier achievements
    const sTotal = catalog.filter(c => c.quality === "S").length;
    const sDone = catalog.filter(c => c.quality === "S" && state.courses[c.id]?.status === "completed").length;
    if (sTotal > 0 && sDone === sTotal) tryUnlock("s-tier-collector");

    const aTotal = catalog.filter(c => c.quality === "A").length;
    const aDone = catalog.filter(c => c.quality === "A" && state.courses[c.id]?.status === "completed").length;
    if (aTotal > 0 && aDone === aTotal) tryUnlock("a-tier-collector");

    const tiersWithCompletion = new Set(
      completed.map(c => c.quality).filter(q => q && QUALITY_TIERS.includes(q))
    );
    if (["S", "A", "B"].every(q => tiersWithCompletion.has(q))) tryUnlock("tier-explorer");

    // Centurion: 1000 XP specifically from S-tier courses
    const sTierXp = completed
      .filter(c => c.quality === "S")
      .reduce((sum, c) => sum + (c.xp || 0), 0);
    if (sTierXp >= 1000) tryUnlock("centurion");

    return newlyUnlocked;
  };

  // ============================================================
  // ACTIONS
  // ============================================================
  const startCourse = (courseId, course, catalog) => {
    if (!state.courses[courseId]) {
      state.courses[courseId] = { status: "in-progress", startedAt: new Date().toISOString() };
      updateStreak();
      const newlyUnlocked = checkAchievements(catalog || []);
      saveState();
      return { xpGained: 0, leveledUp: false, newlyUnlocked };
    }
    return null;
  };

  const completeCourse = (courseId, course, catalog) => {
    const wasCompleted = state.courses[courseId]?.status === "completed";
    if (wasCompleted) return null;

    state.courses[courseId] = {
      status: "completed",
      startedAt: state.courses[courseId]?.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    const xpGained = course.xp || 100;
    const beforeLevel = levelFromXP(state.xp).level;
    state.xp += xpGained;
    const afterLevel = levelFromXP(state.xp).level;
    updateStreak();
    const newlyUnlocked = checkAchievements(catalog);
    saveState();
    return {
      xpGained,
      leveledUp: afterLevel > beforeLevel,
      newLevel: afterLevel,
      newlyUnlocked,
    };
  };

  const uncompleteCourse = (courseId, passedCatalog) => {
    if (state.courses[courseId]?.status !== "completed") return null;
    const course = (passedCatalog || catalog).find(c => c.id === courseId);
    if (!course) {
      state.xp = Math.max(0, state.xp - 100);
      state.courses[courseId] = { status: "not-started" };
      saveState();
      return { xpLost: 100 };
    }
    state.xp = Math.max(0, state.xp - (course.xp || 100));
    state.courses[courseId] = { status: "not-started" };
    saveState();
    return { xpLost: course.xp || 100 };
  };

  const resetAll = () => {
    state = defaultState();
    saveState();
  };

  // ============================================================
  // UI
  // ============================================================
  let catalog = [];
  let activeFilter = "all";
  let activeQuality = "all";
  let searchQuery = "";

  const el = (sel) => document.querySelector(sel);

  // C-tier is rendered only when the catalog actually contains C courses.
  // C is a quality grade, not a tier label — the legend/chip/distribution
  // surfaces are conditioned on the live catalog so the UI never shows a
  // dead "0/0" row.
  const activeQualities = () => {
    const set = new Set();
    catalog.forEach(c => { if (c.quality) set.add(c.quality); });
    // Stable render order: S, A, B, C — but only include those present.
    return QUALITY_TIERS.filter(q => set.has(q));
  };
  const emptyQualities = () => QUALITY_TIERS.filter(q => !activeQualities().includes(q));

  const setAnimatedNumber = (node, next) => {
    if (!node) return;
    const formatted = next.toLocaleString();
    const current = Number(String(node.dataset.value || node.textContent || "0").replace(/,/g, "")) || 0;
    node.dataset.value = String(next);
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!window.requestAnimationFrame || reduceMotion || current === next) {
      node.textContent = formatted;
      return;
    }
    const start = window.performance?.now?.() || Date.now();
    const duration = 520;
    const step = (now) => {
      const elapsed = Math.min(1, ((now || Date.now()) - start) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const value = Math.round(current + (next - current) * eased);
      node.textContent = value.toLocaleString();
      if (elapsed < 1) window.requestAnimationFrame(step);
      else node.textContent = formatted;
    };
    window.requestAnimationFrame(step);
  };

  const renderStats = () => {
    const { level, currentLevelXP, nextLevelXP } = levelFromXP(state.xp);
    setAnimatedNumber(el("#stat-level"), level);
    setAnimatedNumber(el("#stat-xp"), state.xp);
    setAnimatedNumber(el("#stat-streak"), state.streak);
    const active = Object.values(state.courses).filter(s => s.status === "in-progress").length;
    setAnimatedNumber(el("#stat-active"), active);

    // Level-to-next-XP sub-bar (P1.4). Cap level at 99 in the engine to
    // avoid runaway levels; the bar is hidden at the level cap.
    const bar = el("#level-xp-bar");
    const label = el("#level-xp-label");
    if (bar && label) {
      if (level >= 99) {
        bar.style.width = "100%";
        label.textContent = "MAX";
      } else {
        const pct = Math.min(100, Math.round((currentLevelXP / nextLevelXP) * 100));
        bar.style.width = `${pct}%`;
        label.textContent = `${currentLevelXP} / ${nextLevelXP} XP`;
      }
    }
  };

  const renderProgress = () => {
    const completed = catalog.filter(c => state.courses[c.id]?.status === "completed").length;
    const total = catalog.length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    el("#progress-pct").textContent = `${pct}%`;
    el("#progress-fill").style.width = `${pct}%`;
    el("#progress-bar").setAttribute("aria-valuenow", pct);
    el("#progress-meta").textContent = `${completed} of ${total} courses completed`;
  };

  const renderTierDistribution = () => {
    const grid = el("#tier-distribution");
    if (!grid) return;
    grid.innerHTML = "";
    const visible = activeQualities();
    if (visible.length === 0) {
      grid.innerHTML = `<p style="color: var(--ink-3); font-size: 13px; padding: 12px 0; grid-column: 1 / -1;">No quality grades available yet.</p>`;
      return;
    }
    visible.forEach(q => {
      const all = catalog.filter(c => (c.quality || "B") === q);
      const done = all.filter(c => state.courses[c.id]?.status === "completed").length;
      const total = all.length;
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
      const xpDone = all.filter(c => state.courses[c.id]?.status === "completed")
        .reduce((s, c) => s + (c.xp || 0), 0);
      const xpTotal = all.reduce((s, c) => s + (c.xp || 0), 0);
      const card = document.createElement("div");
      card.className = `tier-stat tier-stat-${q.toLowerCase()}`;
      card.innerHTML = `
        <div class="tier-stat-head">
          <span class="tier-badge tier-badge-${q.toLowerCase()}">${q}</span>
          <span class="tier-stat-count">${done}/${total}</span>
        </div>
        <div class="tier-stat-bar"><div class="tier-stat-fill" style="width:${pct}%"></div></div>
        <div class="tier-stat-foot">
          <span class="tier-stat-pct">${pct}%</span>
          <span class="tier-stat-xp">${xpDone.toLocaleString()} / ${xpTotal.toLocaleString()} XP</span>
        </div>
      `;
      grid.appendChild(card);
    });
  };

  const renderTopPicks = () => {
    const grid = el("#top-picks-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const picks = catalog.filter(c => c.picks === true);
    picks.forEach(course => {
      const courseState = state.courses[course.id] || { status: "not-started" };
      const status = courseState.status;
      const brand = course.brand || { logo: "", color: "#2a241d", initials: "AI", name: course.provider };
      const card = document.createElement("article");
      card.className = `pick-card quality-${(course.quality || "B").toLowerCase()} ${status === "completed" ? "completed" : ""} ${status === "in-progress" ? "in-progress" : ""}`;
      card.dataset.id = course.id;
      card.innerHTML = `
        ${status === "completed" ? `<div class="completed-check" aria-label="Completed">✓</div>` : ""}
        <a class="pick-image" href="${course.url}" target="_blank" rel="noopener noreferrer" style="background: linear-gradient(135deg, ${brand.color}33 0%, ${brand.color}11 100%);" title="Open ${course.title} on ${course.provider}">
          <img class="pick-image-img" src="${brand.logo}" alt="${brand.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div class="pick-image-fallback" style="display:none; background: ${brand.color};">${brand.initials}</div>
        </a>
        <div class="pick-body">
          <div class="pick-card-top">
            <span class="course-provider">${course.provider}</span>
            <span class="tier-badge tier-badge-${course.quality.toLowerCase()}" title="${course.qualityReason || ""}">${course.quality}</span>
          </div>
          <h3 class="pick-card-title">${course.title}</h3>
          <p class="pick-card-desc">${course.description || ""}</p>
          <div class="pick-card-actions">
            <span class="course-xp">+${course.xp} XP</span>
            <a class="btn btn-open" href="${course.url}" target="_blank" rel="noopener noreferrer" data-action="open">Open ↗</a>
            <button class="btn ${status === "completed" ? "btn-ghost" : status === "in-progress" ? "btn-terracotta" : "btn-primary"}" data-action="${status === "completed" ? "uncomplete" : status === "in-progress" ? "complete" : "start"}">${
              status === "completed" ? "Done" : status === "in-progress" ? "Mark complete" : "Start"
            }</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  };

  const renderContinueCard = () => {
    const wrap = el("#continue-card");
    if (!wrap) return;
    const course = getNextInProgressCourse(catalog, state);
    if (!course) {
      wrap.hidden = true;
      wrap.innerHTML = "";
      return;
    }
    const startedAt = state.courses[course.id]?.startedAt;
    const started = startedAt ? new Date(startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "recently";
    const brand = course.brand || { logo: "", color: "#2a241d", initials: "AI", name: course.provider };
    wrap.hidden = false;
    wrap.dataset.id = course.id;
    wrap.innerHTML = `
      <div class="continue-copy">
        <span class="continue-kicker">Continue where you left off</span>
        <h2 id="continue-heading">${course.title}</h2>
        <p>${course.provider} · started ${started} · +${course.xp || 100} XP when complete</p>
      </div>
      <div class="continue-brand" style="--continue-color:${brand.color};">
        <img src="${brand.logo}" alt="${brand.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';" />
        <span style="display:none;">${brand.initials}</span>
      </div>
      <div class="continue-actions">
        <a class="btn btn-open" href="${course.url}" target="_blank" rel="noopener noreferrer" data-action="open">Open ↗</a>
        <button class="btn btn-terracotta" data-action="complete">Mark complete</button>
      </div>
    `;
  };

  const matchesFilter = (course) => courseMatchesFilters(course, { activeFilter, activeQuality, searchQuery });

  const renderCourse = (course) => {
    const courseState = state.courses[course.id] || { status: "not-started" };
    const status = courseState.status;
    const card = document.createElement("article");
    card.className = `course ${status === "completed" ? "completed" : ""} ${status === "in-progress" ? "in-progress" : ""} quality-${(course.quality || "B").toLowerCase()}`;
    card.dataset.id = course.id;

    const tagsHTML = (course.tags || []).slice(0, 3).map(t => {
      const cls = t === "anthropic" ? "tag-anthropic" : (t === "free" ? "tag-free" : "");
      return `<span class="tag ${cls}">${t}</span>`;
    }).join("");

    const quality = course.quality || "B";
    const qualityReason = course.qualityReason || "";
    const brand = course.brand || { logo: "", color: "#2a241d", initials: "AI", name: course.provider };

    let actionHTML = "";
    let statusHTML = "";
    if (status === "completed") {
      actionHTML = `<button class="btn btn-ghost" data-action="uncomplete">Undo</button>`;
      statusHTML = `<span class="course-status">Completed</span>`;
    } else if (status === "in-progress") {
      actionHTML = `<button class="btn btn-terracotta" data-action="complete">Mark complete</button>`;
      statusHTML = `<span class="course-status in-progress">In progress</span>`;
    } else {
      actionHTML = `<button class="btn btn-primary" data-action="start">Start</button>`;
      statusHTML = `<span class="course-status not-started">Not started</span>`;
    }

    card.innerHTML = `
      ${status === "completed" ? `<div class="completed-check" aria-label="Completed">✓</div>` : ""}
      <a class="course-image" href="${course.url}" target="_blank" rel="noopener noreferrer" style="background: linear-gradient(135deg, ${brand.color}22 0%, ${brand.color}11 100%);" title="Open ${course.title} on ${course.provider}">
        <img class="course-image-img" src="${brand.logo}" alt="${brand.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        <div class="course-image-fallback" style="display:none; background: ${brand.color};">${brand.initials}</div>
        <span class="tier-badge tier-badge-${quality.toLowerCase()}" title="${qualityReason}" aria-label="Quality tier ${quality}">${quality}</span>
      </a>
      <div class="course-body">
        <div class="course-top">
          <span class="course-provider">${course.provider}</span>
        </div>
        <h3 class="course-title">${course.title}</h3>
        <p class="course-desc">${course.description || ""}</p>
        <div class="course-meta">${tagsHTML}</div>
        <div class="course-actions">
          <div>
            ${statusHTML}
            <span class="course-xp">+${course.xp} XP</span>
          </div>
          <div style="display:flex; gap:6px;">
            <a class="btn btn-open" href="${course.url}" target="_blank" rel="noopener noreferrer" data-action="open">Open ↗</a>
            ${actionHTML}
          </div>
        </div>
      </div>
    `;
    return card;
  };

  const renderCourses = () => {
    const visibleCourses = filterCatalog(catalog, { activeFilter, activeQuality, searchQuery });
    const isEmpty = visibleCourses.length === 0;
    const empty = el("#empty-state");
    if (empty) empty.hidden = !isEmpty;

    TIERS.forEach(tier => {
      const section = document.querySelector(`.tier-section[data-tier="${tier}"]`);
      const grid = document.querySelector(`.course-grid[data-tier="${tier}"]`);
      if (!grid) return;
      if (section) section.hidden = isEmpty;
      grid.innerHTML = "";
      if (isEmpty) return;
      const filtered = visibleCourses.filter(c => c.tier === tier);
      if (filtered.length === 0) {
        grid.innerHTML = `<p style="color: var(--ink-3); font-size: 13px; padding: 12px 0;">No courses match.</p>`;
        return;
      }
      filtered.forEach(course => grid.appendChild(renderCourse(course)));
    });
  };

  const renderFilters = () => {
    const tierContainer = el("#filter-chips");
    if (tierContainer) {
      tierContainer.innerHTML = "";
      ["all", ...TIERS].forEach(tier => {
        const chip = document.createElement("button");
        chip.className = `chip ${activeFilter === tier ? "active" : ""}`;
        chip.textContent = tier === "all" ? "All" : TIER_LABELS[tier];
        chip.dataset.tier = tier;
        tierContainer.appendChild(chip);
      });
    }
    const qualityContainer = el("#quality-chips");
    if (qualityContainer) {
      qualityContainer.innerHTML = "";
      // Only render chips for qualities actually present in the catalog.
      // This hides C (or any grade) when the catalog has zero of that grade.
      ["all", ...activeQualities()].forEach(q => {
        const chip = document.createElement("button");
        chip.className = `chip quality-chip-${q.toLowerCase()} ${activeQuality === q ? "active" : ""}`;
        chip.textContent = q === "all" ? "All tiers" : q;
        chip.title = q === "all" ? "Show all quality tiers" : QUALITY_DESCRIPTIONS[q] || "";
        chip.dataset.quality = q;
        qualityContainer.appendChild(chip);
      });
    }
  };

  const renderAchievements = () => {
    const grid = el("#achievements-grid");
    if (!grid) return;
    grid.innerHTML = "";
    ACHIEVEMENTS.forEach(a => {
      const unlocked = !!state.achievements[a.id];
      const div = document.createElement("div");
      div.className = `achievement ${unlocked ? "unlocked" : "locked"}`;
      div.innerHTML = `
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-text">
          <span class="achievement-name">${a.name}</span>
          <span class="achievement-desc">${a.desc}</span>
        </div>
      `;
      grid.appendChild(div);
    });
  };

  const renderAll = () => {
    renderStats();
    renderProgress();
    renderTierDistribution();
    renderContinueCard();
    renderTopPicks();
    renderFilters();
    renderCourses();
    renderAchievements();
    renderLegend();
  };

  // Hide quality legend items whose grade has 0 courses in the catalog.
  // C-tier is the common case (catalog only has S/A/B) — showing "0/0"
  // legend would be dead UI. We treat the legend as a derived view.
  const renderLegend = () => {
    const visible = new Set(activeQualities());
    const empty = emptyQualities();
    document.querySelectorAll("[data-legend-quality]").forEach(node => {
      const q = node.dataset.legendQuality;
      const shouldHide = empty.includes(q);
      node.hidden = shouldHide;
    });
  };

  // ============================================================
  // TOAST
  // ============================================================
  let toastTimer = null;
  const showToast = (message) => {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  };

  const showAchievementReveal = (achievement) => {
    if (!achievement) return;
    const reveal = document.createElement("div");
    reveal.className = "achievement-reveal";
    reveal.setAttribute("role", "status");
    reveal.innerHTML = `
      <div class="achievement-reveal-icon">${achievement.icon}</div>
      <div>
        <span class="achievement-reveal-kicker">Achievement unlocked</span>
        <strong>${achievement.name}</strong>
        <p>${achievement.desc}</p>
      </div>
    `;
    document.body.appendChild(reveal);
    window.requestAnimationFrame?.(() => reveal.classList.add("show"));
    setTimeout(() => {
      reveal.classList.remove("show");
      setTimeout(() => reveal.remove(), 260);
    }, 4200);
  };

  // ============================================================
  // ONBOARDING (P2)
  // ============================================================
  const markOnboardingSeen = () => {
    try { localStorage.setItem(ONBOARDING_KEY, "seen"); } catch (_) { /* noop */ }
  };
  const buildOnboardingModal = () => {
    if (document.querySelector("#onboarding-modal")) return;
    const modal = document.createElement("div");
    modal.id = "onboarding-modal";
    modal.className = "onboarding-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-label", "Welcome to AI Training Hub");
    modal.hidden = true;
    modal.innerHTML = `
      <div class="onboarding-card">
        <span class="onboarding-kicker">Welcome</span>
        <h2>Build AI fluency without losing the thread.</h2>
        <p>Start with the 5 highest-signal S-tier picks, or jump straight into hands-on Build courses. Your progress stays private in this browser.</p>
        <div class="onboarding-steps">
          <span><strong>1</strong> Start a course</span>
          <span><strong>2</strong> Earn XP</span>
          <span><strong>3</strong> Keep shipping</span>
        </div>
        <div class="onboarding-actions">
          <button class="btn btn-primary" data-action="onboarding-top-picks">Start with top picks</button>
          <button class="btn btn-terracotta" data-action="onboarding-build">Jump to Build</button>
          <button class="btn btn-ghost" data-action="dismiss-onboarding">Skip</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };
  const showOnboardingIfNeeded = () => {
    let seen = null;
    try { seen = localStorage.getItem(ONBOARDING_KEY); } catch (_) { /* noop */ }
    if (!shouldShowOnboarding(state, seen)) return;
    buildOnboardingModal();
    const modal = document.querySelector("#onboarding-modal");
    if (modal) modal.hidden = false;
  };
  const hideOnboarding = () => {
    const modal = document.querySelector("#onboarding-modal");
    if (modal) modal.hidden = true;
    markOnboardingSeen();
  };

  // ============================================================
  // EVENTS
  // ============================================================
  // Course cards and top-pick cards share a [data-id] contract but use
  // different wrapper classes (.course vs .pick-card). The action handler
  // resolves the course id from the closest data-id-bearing ancestor so
  // Start / Mark complete / Undo work everywhere, including the featured
  // strip (audit caught this as a silent gap in v1).
  const handleAction = (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "open") return; // Let the link do its thing
    if (action === "toggle-theme") {
      toggleTheme();
      return;
    }
    if (action === "dismiss-onboarding") {
      hideOnboarding();
      return;
    }
    if (action === "onboarding-top-picks") {
      hideOnboarding();
      activeFilter = "all";
      activeQuality = "S";
      searchQuery = "";
      const searchEl = el("#search");
      if (searchEl) searchEl.value = "";
      renderAll();
      saveFilters();
      el("#top-picks-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action === "onboarding-build") {
      hideOnboarding();
      activeFilter = "build";
      activeQuality = "all";
      searchQuery = "";
      const searchEl = el("#search");
      if (searchEl) searchEl.value = "";
      renderAll();
      saveFilters();
      document.querySelector('[data-tier="build"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action === "clear-filters") {
      activeFilter = "all";
      activeQuality = "all";
      searchQuery = "";
      const searchEl = el("#search");
      if (searchEl) searchEl.value = "";
      renderAll();
      saveFilters();
      showToast("Filters cleared.");
      return;
    }
    if (action === "open-settings" || action === "close-settings" || action === "export-progress" || action === "import-progress" || action === "confirm-reset" || action === "cancel-reset") {
      return; // handled by their dedicated listeners below
    }
    const card = target.closest("[data-id]");
    if (!card) return;
    const courseId = card.dataset.id;
    const course = catalog.find(c => c.id === courseId);
    if (!course) return;

    if (action === "start") {
      const result = startCourse(courseId, course, catalog);
      if (result) {
        renderAll();
        showToast(`Started: ${course.title}`);
        result.newlyUnlocked.forEach((a, i) => {
          setTimeout(() => showAchievementReveal(a), 700 + (i * 350));
        });
      }
    } else if (action === "complete") {
      const result = completeCourse(courseId, course, catalog);
      if (result) {
        renderAll();
        if (result.leveledUp) {
          showToast(`🎉 Level ${result.newLevel}! +${result.xpGained} XP`);
        } else {
          showToast(`+${result.xpGained} XP — ${course.title}`);
        }
        result.newlyUnlocked.forEach((a, i) => {
          setTimeout(() => showAchievementReveal(a), 700 + (i * 350));
        });
      }
    } else if (action === "uncomplete") {
      const result = uncompleteCourse(courseId, catalog);
      if (result) {
        renderAll();
        showToast(`Marked incomplete (${result.xpLost} XP returned)`);
      }
    }
  };

  // ============================================================
  // SETTINGS MENU — Export / Import / Reset (P1.2)
  // Pattern: a single floating panel; "type RESET" confirmation for
  // destructive reset; never a single-click wipe.
  // ============================================================
  const buildSettingsPanel = () => {
    if (document.querySelector("#settings-panel")) return;
    const panel = document.createElement("div");
    panel.id = "settings-panel";
    panel.className = "settings-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Settings");
    panel.hidden = true;
    panel.innerHTML = `
      <div class="settings-panel-head">
        <h2>Settings</h2>
        <button class="icon-btn" data-action="close-settings" aria-label="Close settings" title="Close">×</button>
      </div>
      <p class="settings-panel-hint">Your progress is saved in this browser only. Export a backup before clearing site data or switching devices.</p>
      <div class="settings-row">
        <div class="settings-row-text">
          <strong>Export backup</strong>
          <span>Download a JSON file with all your progress, achievements, and XP.</span>
        </div>
        <button class="btn btn-primary" data-action="export-progress">Download .json</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-text">
          <strong>Import backup</strong>
          <span>Restore from a previously exported JSON file. Replaces current progress.</span>
        </div>
        <label class="btn btn-primary" for="import-file-input">Choose file…</label>
        <input id="import-file-input" type="file" accept="application/json,.json" hidden />
      </div>
      <div class="settings-row">
        <div class="settings-row-text">
          <strong>Theme</strong>
          <span>Toggle between light and dark mode.</span>
        </div>
        <button class="btn btn-primary" data-action="toggle-theme" id="settings-theme-btn">Switch theme</button>
      </div>
      <div class="settings-row settings-row-danger">
        <div class="settings-row-text">
          <strong>Reset progress</strong>
          <span>Wipes all XP, streaks, and completion state from this browser. Export first if unsure.</span>
        </div>
        <button class="btn btn-danger" data-action="prompt-reset" id="settings-reset-btn">Reset…</button>
      </div>
      <div class="settings-reset-confirm" id="settings-reset-confirm" hidden>
        <p>This is permanent. Type <code>RESET</code> to confirm:</p>
        <input type="text" id="settings-reset-input" autocomplete="off" spellcheck="false" />
        <div class="settings-reset-actions">
          <button class="btn" data-action="cancel-reset">Cancel</button>
          <button class="btn btn-danger" data-action="confirm-reset" disabled>Reset everything</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Backdrop click closes the panel (but not when clicking inside it).
    panel.addEventListener("click", (e) => {
      if (e.target === panel) hideSettings();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !panel.hidden) hideSettings();
    });

    // Settings-specific actions
    panel.addEventListener("click", (e) => {
      const t = e.target.closest("[data-action]");
      if (!t) return;
      const a = t.dataset.action;
      if (a === "close-settings") hideSettings();
      else if (a === "export-progress") exportProgress();
      else if (a === "toggle-theme") toggleTheme();
      else if (a === "prompt-reset") showResetConfirm();
      else if (a === "cancel-reset") hideResetConfirm();
      else if (a === "confirm-reset") confirmReset();
    });

    // Import file
    const fileInput = panel.querySelector("#import-file-input");
    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) importProgressFile(file);
        fileInput.value = ""; // allow re-importing the same file
      });
    }

    // Reset confirmation input — enable the destructive button only when
    // the user types the exact string "RESET".
    const resetInput = panel.querySelector("#settings-reset-input");
    if (resetInput) {
      resetInput.addEventListener("input", (e) => {
        const btn = panel.querySelector("[data-action=\"confirm-reset\"]");
        if (btn) btn.disabled = e.target.value.trim() !== "RESET";
      });
    }
  };

  const showSettings = () => {
    buildSettingsPanel();
    const panel = document.querySelector("#settings-panel");
    if (panel) panel.hidden = false;
  };
  const hideSettings = () => {
    const panel = document.querySelector("#settings-panel");
    if (panel) panel.hidden = true;
    hideResetConfirm();
  };
  const showResetConfirm = () => {
    const wrap = document.querySelector("#settings-reset-confirm");
    const input = document.querySelector("#settings-reset-input");
    if (wrap) wrap.hidden = false;
    if (input) { input.value = ""; input.focus(); }
    const btn = document.querySelector("[data-action=\"confirm-reset\"]");
    if (btn) btn.disabled = true;
  };
  const hideResetConfirm = () => {
    const wrap = document.querySelector("#settings-reset-confirm");
    if (wrap) wrap.hidden = true;
  };
  const confirmReset = () => {
    const input = document.querySelector("#settings-reset-input");
    if (!input || input.value.trim() !== "RESET") return;
    resetAll();
    hideSettings();
    renderAll();
    showToast("Progress reset.");
  };

  // ============================================================
  // EXPORT / IMPORT — portable JSON, includes schema + exportedAt
  // ============================================================
  const EXPORT_VERSION = 1;
  const exportProgress = () => {
    try {
      const payload = {
        app: "ai-training-hub",
        exportVersion: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        schema: state.schema,
        state,
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `ai-training-hub-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("Backup downloaded.");
    } catch (e) {
      console.error("Export failed", e);
      showToast("Export failed — see console.");
    }
  };

  const importProgressFile = async (file) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload || payload.app !== "ai-training-hub" || !payload.state) {
        showToast("Not a Training Hub backup file.");
        return;
      }
      // Optional: confirm destructive replace
      if (state.xp > 0 || Object.keys(state.courses).length > 0) {
        const ok = window.confirm(
          "This will REPLACE your current progress with the imported backup.\n\n" +
          `Backup date: ${payload.exportedAt || "unknown"}\n` +
          `Backup XP: ${payload.state.xp || 0}\n` +
          `Backup courses: ${Object.keys(payload.state.courses || {}).length}\n\n` +
          "Continue?"
        );
        if (!ok) return;
      }
      state = migrateState(payload.state);
      saveState();
      renderAll();
      showToast("Backup imported.");
      hideSettings();
    } catch (e) {
      console.error("Import failed", e);
      showToast("Import failed — file is invalid JSON.");
    }
  };

  const wireEvents = () => {
    document.addEventListener("click", handleAction);
    el("#search").addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      renderCourses();
      saveFilters();
    });
    el("#filter-chips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      activeFilter = chip.dataset.tier;
      renderFilters();
      renderCourses();
      saveFilters();
    });
    const qualityChips = el("#quality-chips");
    if (qualityChips) {
      qualityChips.addEventListener("click", (e) => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        activeQuality = chip.dataset.quality;
        renderFilters();
        renderCourses();
        saveFilters();
      });
    }
    // Settings button in header
    const settingsBtn = document.querySelector("[data-action=\"open-settings\"]");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showSettings();
      });
    }
    // Theme toggle in header
    const themeBtn = document.querySelector("[data-action=\"toggle-theme\"]");
    if (themeBtn) {
      themeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleTheme();
      });
    }
    // Persist scroll position (debounced via rAF).
    let scrollRaf = 0;
    window.addEventListener("scroll", () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        saveFilters();
      });
    }, { passive: true });
  };

  // ============================================================
  // INIT
  // ============================================================
  const init = async () => {
    // Theme should resolve before first paint to avoid a light→dark flash.
    initTheme();
    loadState();
    // Restore saved filters/search before render so the first frame is
    // already in the user's previous view (no All→... flash on reload).
    applyFilters(loadFilters());
    try {
      const res = await fetch("data/courses.json");
      catalog = await res.json();
    } catch (e) {
      console.error("Failed to load courses.json", e);
      catalog = [];
    }
    // Self-heal persisted filter that no longer applies to the current
    // catalog (e.g. user previously filtered by C when C existed, then
    // the catalog dropped C). Falling back to "all" avoids a permanently
    // empty catalog with no visible way to recover.
    const visible = activeQualities();
    if (activeQuality !== "all" && !visible.includes(activeQuality)) activeQuality = "all";
    if (!["all", ...TIERS].includes(activeFilter)) activeFilter = "all";
    wireEvents();
    // Reflect restored search into the input field (events were wired
    // before render so this fires the same path as user typing).
    const searchEl = el("#search");
    if (searchEl && searchQuery) searchEl.value = searchQuery;
    renderAll();
    showOnboardingIfNeeded();
  };

  if (typeof window !== "undefined") {
    window.AITrainingHub = {
      xpForLevel,
      levelFromXP,
      today,
      daysBetween,
      ACHIEVEMENTS,
      QUALITY_TIERS,
      QUALITY_LABELS,
      QUALITY_DESCRIPTIONS,
      CURRENT_SCHEMA,
      STORAGE_KEY,
      THEME_KEY,
      FILTERS_KEY,
      ONBOARDING_KEY,
      getState: () => JSON.parse(JSON.stringify(state)),
      startCourse,
      completeCourse,
      uncompleteCourse,
      resetAll,
      migrateState,
      shouldShowOnboarding,
      getNextInProgressCourse,
      filterCatalog,
      exportPayload: () => ({
        app: "ai-training-hub",
        exportVersion: 1,
        exportedAt: new Date().toISOString(),
        schema: state.schema,
        state: JSON.parse(JSON.stringify(state)),
      }),
      applyPayload: (payload) => {
        if (!payload || payload.app !== "ai-training-hub" || !payload.state) return false;
        state = migrateState(payload.state);
        saveState();
        return true;
      },
      applyTheme,
      toggleTheme,
      getTheme: () => document.documentElement.dataset.theme || "light",
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
