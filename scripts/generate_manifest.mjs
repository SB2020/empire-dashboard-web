// scripts/generate_manifest.mjs
// Parses todo.md checkboxes into docs/PROJECT_MANIFEST.json
// Run: node scripts/generate_manifest.mjs

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const TODO_PATH = path.join(ROOT, "todo.md");
const OUT_PATH = path.join(ROOT, "docs", "PROJECT_MANIFEST.json");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function parseTodo(md) {
  const lines = md.split(/\r?\n/);
  const items = [];
  for (const line of lines) {
    const m = line.match(/^\s*-\s*\[(x|X|\s)\]\s+(.*)\s*$/);
    if (!m) continue;
    const done = m[1].toLowerCase() === "x";
    const title = m[2].trim();
    if (!title) continue;
    // Extract category prefix (e.g., "v3.0:", "Feature:", "Augment:")
    let category = "General";
    const prefixMatch = title.match(/^([\w\s.]+?):\s/);
    if (prefixMatch) category = prefixMatch[1].trim();
    items.push({ title, done, category });
  }
  return items;
}

function countFiles(dir, extensions = [".tsx", ".ts", ".css", ".json", ".md"]) {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countFiles(fullPath, extensions);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        count++;
      }
    }
  } catch { /* skip */ }
  return count;
}

function getPages(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith(".tsx") && f !== "NotFound.tsx")
      .map(f => f.replace(".tsx", ""));
  } catch { return []; }
}

function getDatabaseTables(schemaPath) {
  try {
    const content = fs.readFileSync(schemaPath, "utf8");
    const matches = content.matchAll(/mysqlTable\(['"]([\w]+)['"]/g);
    return [...matches].map(m => m[1]);
  } catch { return []; }
}

function main() {
  if (!fs.existsSync(TODO_PATH)) {
    console.error(`Missing ${TODO_PATH}`);
    process.exit(1);
  }

  const todoMd = fs.readFileSync(TODO_PATH, "utf8");
  const parsed = parseTodo(todoMd);

  const items = parsed.map((it, idx) => ({
    id: `${String(idx + 1).padStart(4, "0")}-${slugify(it.title)}`,
    title: it.title,
    done: it.done,
    category: it.category,
  }));

  const done = items.filter((i) => i.done).length;
  const total = items.length;

  // Gather project structure stats
  const pages = getPages(path.join(ROOT, "client/src/pages"));
  const tables = getDatabaseTables(path.join(ROOT, "drizzle/schema.ts"));
  const totalFiles = countFiles(ROOT);

  // Group by category
  const categories = {};
  for (const item of parsed) {
    if (!categories[item.category]) categories[item.category] = { total: 0, completed: 0 };
    categories[item.category].total++;
    if (item.done) categories[item.category].completed++;
  }

  const manifest = {
    name: "Empire Dashboard: God Mode",
    version: "3.0",
    classification: "UNCLASSIFIED // PUBLIC",
    generated_at: new Date().toISOString(),
    sources: { todo_md: "todo.md" },
    stats: {
      total,
      done,
      open: total - done,
      completion_pct: Math.round((done / total) * 1000) / 10,
      total_source_files: totalFiles,
      total_pages: pages.length,
      total_database_tables: tables.length,
    },
    pages: pages.sort(),
    database_tables: tables.sort(),
    categories,
    documentation: {
      manual: "docs/MANUAL.md",
      architecture: "docs/APP_MAP.md",
      security: "docs/SECURITY_MODEL.md",
      macros: "docs/MACROS.md",
    },
    integrity: {
      hash_algorithm: "SHA-256",
      todo_hash: crypto.createHash("sha256").update(todoMd).digest("hex"),
    },
    items,
  };

  ensureDir(path.dirname(OUT_PATH));
  fs.writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`✅ PROJECT_MANIFEST.json generated successfully`);
  console.log(`   Total tasks: ${total}`);
  console.log(`   Completed: ${done}`);
  console.log(`   Pending: ${total - done}`);
  console.log(`   Completion: ${manifest.stats.completion_pct}%`);
  console.log(`   Pages: ${pages.length}`);
  console.log(`   DB Tables: ${tables.length}`);
  console.log(`   Source files: ${totalFiles}`);
  console.log(`   Output: ${OUT_PATH}`);
}

main();
