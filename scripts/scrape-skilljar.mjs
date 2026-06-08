#!/usr/bin/env node
// Scrape Anthropic Skilljar catalog and re-emit data/courses.json
// Run with: npm run scrape
//
// This is a best-effort scraper. It walks the Anthropic Skilljar catalog page
// and pulls course titles + URLs, then merges with the existing catalog
// (preserving custom XP weights and tags).
//
// Requires Node 18+ for built-in fetch.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const CATALOG_PATH = join(projectRoot, "data", "courses.json");
const SKILLJAR_CATALOG = "https://anthropic.skilljar.com/";

const fetchHTML = async (url) => {
  const res = await fetch(url, {
    headers: { "User-Agent": "ai-training-hub-scraper/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
};

const extractCourses = (html) => {
  // Skilljar renders course cards. Look for anchor tags with /courses/... or /pages/...
  const coursePattern = /<a[^>]+href="(\/[^"]+)"[^>]*class="[^"]*course[^"]*"[^>]*>([^<]+)<\/a>/gi;
  const matches = [];
  let m;
  while ((m = coursePattern.exec(html)) !== null) {
    matches.push({ slug: m[1], title: m[2].trim() });
  }
  return matches;
};

const inferTier = (title) => {
  const t = title.toLowerCase();
  if (t.match(/intro|fundamentals|foundations|101|constitutional|safety/)) return "learn";
  if (t.match(/api|sdk|build|tool|mcp|code|vision|caching|extended|aws|gcp|deploy/)) return "build";
  if (t.match(/evaluat|compound|context|orchestrat|flow|production|ship/)) return "ship";
  return "build";
};

const inferXP = (title) => {
  const tier = inferTier(title);
  return tier === "learn" ? 180 : tier === "ship" ? 320 : 240;
};

const main = async () => {
  console.log("Fetching Anthropic Skilljar catalog…");
  const html = await fetchHTML(SKILLJAR_CATALOG);
  const scraped = extractCourses(html);
  console.log(`Found ${scraped.length} potential course links on catalog page`);

  const existing = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  const existingByUrl = new Map(existing.map(c => [c.url, c]));

  const merged = [...existing];
  for (const s of scraped) {
    const url = `https://anthropic.skilljar.com${s.slug}`;
    if (existingByUrl.has(url)) continue;
    merged.push({
      id: s.slug.replace(/^\//, "").replace(/\//g, "-").toLowerCase().slice(0, 64),
      title: s.title,
      provider: "Anthropic Skilljar",
      tier: inferTier(s.title),
      xp: inferXP(s.title),
      tags: ["anthropic", "free"],
      url,
      description: `Course from Anthropic Skilljar: ${s.title}`,
    });
  }

  merged.sort((a, b) => {
    const aA = (a.tags || []).includes("anthropic") ? 0 : 1;
    const bA = (b.tags || []).includes("anthropic") ? 0 : 1;
    return aA - bA;
  });

  writeFileSync(CATALOG_PATH, JSON.stringify(merged, null, 2) + "\n");
  console.log(`Wrote ${merged.length} courses to ${CATALOG_PATH}`);
};

main().catch(e => {
  console.error(e);
  process.exit(1);
});
