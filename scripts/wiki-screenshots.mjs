// Phase-2 wiki screenshot capture.
// Logs into the local app, captures low-PII screens, saves to public/wiki-shots/,
// then replaces the <p class="wiki-shot" data-shot="..."> placeholders in each
// WikiArticle with <img> tags. PII/secret-heavy screens are skipped (kept as a note).
//
// Run: WIKI_ADMIN_EMAIL=... WIKI_ADMIN_PASSWORD=... BASE_URL=http://localhost:3000 \
//      node scripts/wiki-screenshots.mjs
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.WIKI_ADMIN_EMAIL;
const PASSWORD = process.env.WIKI_ADMIN_PASSWORD;
const OUT_DIR = path.join(process.cwd(), "public", "wiki-shots");

// route -> screenshot filename (low-PII screens only)
const SHOTS = {
  "/login": "login",
  "/dashboard": "dashboard",
  "/assessment": "assessment",
  "/dpia": "dpia",
  "/mapper": "mapper",
  "/reports": "reports",
  "/dev": "dev",
  "/voip": "voip",
  "/training": "training",
  "/consent/fields": "consent-fields",
  "/consent/projects": "consent-projects",
  "/c/newsletter-demo": "consent-public-form",
  "/c/newsletter-demo/manage": "consent-manage",
  "/admin/company": "admin-company",
  "/admin/companies": "admin-companies",
  "/admin/departments": "admin-departments",
  "/admin/positions": "admin-positions",
  "/admin/policies": "admin-policies",
  "/admin/roles": "admin-roles",
  "/admin/training": "admin-training",
  "/admin/wiki": "admin-wiki",
  "/settings": "settings",
};
// PII / secrets — never embed real data into a guide visible to all users.
const SKIP = new Set(["/erasure", "/audit", "/admin/users", "/admin/dsr", "/admin/api-keys"]);

const prisma = new PrismaClient();

async function main() {
  if (!EMAIL || !PASSWORD) throw new Error("Set WIKI_ADMIN_EMAIL and WIKI_ADMIN_PASSWORD env vars");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "el-GR" });
  const page = await ctx.newPage();

  // ── Capture the login screen (unauthenticated) ──
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, "login.png") });

  // ── Login via the Auth.js API (reliable cookie persistence in the context) ──
  const csrfRes = await ctx.request.get(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  await ctx.request.post(`${BASE}/api/auth/callback/credentials`, {
    form: { csrfToken, email: EMAIL, password: PASSWORD, callbackUrl: `${BASE}/dashboard` },
    maxRedirects: 5,
  });
  const cookies = await ctx.cookies();
  const sessionCookie = cookies.find((c) => /authjs\.session-token|next-auth\.session-token/.test(c.name));
  console.log("cookies:", cookies.map((c) => c.name).join(", ") || "(none)");
  // Verify auth by loading a protected page
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  if (page.url().includes("/login") || !sessionCookie) {
    console.error("⚠️  Login failed — no session cookie / redirected to /login.");
  } else {
    console.log("✓ Logged in (session cookie present):", sessionCookie.name);
  }

  // ── Capture ──
  const captured = {};
  for (const [route, name] of Object.entries(SHOTS)) {
    if (name === "login") { captured[route] = name; continue; } // already shot
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1200); // let charts/data settle
      await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
      captured[route] = name;
      console.log(`✓ ${route} → ${name}.png`);
    } catch (e) {
      console.error(`✗ ${route}: ${e.message}`);
    }
  }

  await browser.close();

  // ── Embed into articles ──
  const articles = await prisma.wikiArticle.findMany();
  const re = /<p class="wiki-shot" data-shot="([^"]+)">\[Στιγμιότυπο[^\]]*?:?\s*([^\]]*)\]<\/p>/g;
  let updated = 0;
  for (const a of articles) {
    let changed = false;
    const next = a.content.replace(re, (full, route, caption) => {
      const cap = (caption || "").trim();
      if (captured[route]) {
        changed = true;
        return `<figure class="wiki-figure"><img src="/wiki-shots/${captured[route]}.png" alt="${cap}" loading="lazy" />${cap ? `<figcaption>${cap}</figcaption>` : ""}</figure>`;
      }
      if (SKIP.has(route)) {
        changed = true;
        return `<p class="wiki-note">ℹ️ Το στιγμιότυπο αυτής της οθόνης παραλείπεται γιατί περιέχει πραγματικά προσωπικά δεδομένα ή μυστικά.</p>`;
      }
      return full; // leave untouched if not captured and not skipped
    });
    if (changed && next !== a.content) {
      await prisma.wikiArticle.update({ where: { id: a.id }, data: { content: next } });
      updated++;
    }
  }
  console.log(`✓ Updated ${updated} articles with screenshots/notes`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
