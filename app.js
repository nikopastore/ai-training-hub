// AI Training Hub — gamified course tracker
// Vanilla JS, no dependencies. localStorage-backed state.

(() => {
  "use strict";

  // ============================================================
  // CONSTANTS
  // ============================================================
  const STORAGE_KEY = "ai-training-hub-state-v1";
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
    courses: {},
    xp: 0,
    lastActiveDate: null,
    streak: 0,
    achievements: {},
  });

  let state = defaultState();

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state = { ...defaultState(), ...parsed };
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

  const renderStats = () => {
    const { level } = levelFromXP(state.xp);
    el("#stat-level").textContent = level;
    el("#stat-xp").textContent = state.xp.toLocaleString();
    el("#stat-streak").textContent = state.streak;
    const active = Object.values(state.courses).filter(s => s.status === "in-progress").length;
    el("#stat-active").textContent = active;
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

  const matchesFilter = (course) => {
    if (activeFilter !== "all" && course.tier !== activeFilter) return false;
    if (activeQuality !== "all" && course.quality !== activeQuality) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        course.title.toLowerCase().includes(q) ||
        course.provider.toLowerCase().includes(q) ||
        (course.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (course.description || "").toLowerCase().includes(q)
      );
    }
    return true;
  };

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
    const qualityLabel = QUALITY_LABELS[quality] || `Tier ${quality}`;
    const qualityReason = course.qualityReason || "";

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
      <div class="course-top">
        <span class="course-provider">${course.provider}</span>
        <span class="tier-badge tier-badge-${quality.toLowerCase()}" title="${qualityReason}" aria-label="Quality tier ${quality}">${quality}</span>
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
          <a class="btn btn-ghost" href="${course.url}" target="_blank" rel="noopener noreferrer">Open ↗</a>
          ${actionHTML}
        </div>
      </div>
    `;
    return card;
  };

  const renderCourses = () => {
    TIERS.forEach(tier => {
      const grid = document.querySelector(`.course-grid[data-tier="${tier}"]`);
      if (!grid) return;
      grid.innerHTML = "";
      const filtered = catalog.filter(c => c.tier === tier && matchesFilter(c));
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
      ["all", ...QUALITY_TIERS].forEach(q => {
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
    renderFilters();
    renderCourses();
    renderAchievements();
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

  // ============================================================
  // EVENTS
  // ============================================================
  const handleAction = (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const card = target.closest(".course");
    if (!card) return;
    const courseId = card.dataset.id;
    const course = catalog.find(c => c.id === courseId);
    if (!course) return;

    if (action === "start") {
      const result = startCourse(courseId, course, catalog);
      if (result) {
        renderAll();
        showToast(`Started: ${course.title}`);
        result.newlyUnlocked.forEach(a => {
          setTimeout(() => showToast(`🏆 ${a.name} unlocked!`), 1500);
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
        result.newlyUnlocked.forEach(a => {
          setTimeout(() => showToast(`🏆 ${a.name} unlocked!`), 1500);
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

  const wireEvents = () => {
    document.addEventListener("click", handleAction);
    el("#search").addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      renderCourses();
    });
    el("#filter-chips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      activeFilter = chip.dataset.tier;
      renderFilters();
      renderCourses();
    });
    const qualityChips = el("#quality-chips");
    if (qualityChips) {
      qualityChips.addEventListener("click", (e) => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        activeQuality = chip.dataset.quality;
        renderFilters();
        renderCourses();
      });
    }
  };

  // ============================================================
  // INIT
  // ============================================================
  const init = async () => {
    loadState();
    try {
      const res = await fetch("data/courses.json");
      catalog = await res.json();
    } catch (e) {
      console.error("Failed to load courses.json", e);
      catalog = [];
    }
    wireEvents();
    renderAll();
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
      getState: () => JSON.parse(JSON.stringify(state)),
      startCourse,
      completeCourse,
      uncompleteCourse,
      resetAll,
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
