import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "redis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const RESERVED = new Set(["api"]);

const redis = createClient({ url: REDIS_URL });
redis.on("error", (err) => {
  console.error("Redis error:", err);
});

await redis.connect();

app.use(express.json({ limit: "64kb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

function isValidUrl(input) {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidSlug(slug) {
  return /^[a-zA-Z0-9_-]{3,40}$/.test(slug);
}

function randomSlug(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function reserveSlug(slug, url) {
  const key = `redirect:${slug}`;
  const result = await redis.set(key, url, { NX: true });
  return result === "OK";
}

function mergeQueryIntoTarget(target, rawQuery = "") {
  if (!rawQuery) {
    return target;
  }

  try {
    const targetUrl = new URL(target);
    const incoming = new URLSearchParams(rawQuery);

    // Incoming short-link params take precedence when keys overlap.
    for (const [key, value] of incoming.entries()) {
      targetUrl.searchParams.set(key, value);
    }

    return targetUrl.toString();
  } catch {
    return target;
  }
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.post("/api/shorten", async (req, res) => {
  const { url, slug } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required." });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: "Please enter a valid http(s) URL." });
  }

  let finalSlug = typeof slug === "string" ? slug.trim() : "";

  if (finalSlug.length === 0) {
    let created = false;
    let attempts = 0;
    while (!created && attempts < 5) {
      finalSlug = randomSlug(6 + attempts);
      created = await reserveSlug(finalSlug, url);
      attempts += 1;
    }

    if (!created) {
      return res.status(500).json({ error: "Could not generate a unique slug." });
    }
  } else {
    if (RESERVED.has(finalSlug.toLowerCase())) {
      return res.status(400).json({ error: "That slug is reserved." });
    }

    if (!isValidSlug(finalSlug)) {
      return res.status(400).json({ error: "Custom slug must be 3-40 chars: letters, numbers, dashes, underscores." });
    }

    const created = await reserveSlug(finalSlug, url);
    if (!created) {
      return res.status(409).json({ error: "That slug is already taken." });
    }
  }

  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  return res.json({
    slug: finalSlug,
    url,
    shortUrl: `${baseUrl.replace(/\/$/, "")}/${finalSlug}`
  });
});

app.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  if (!slug || RESERVED.has(slug.toLowerCase())) {
    return res.status(404).sendFile(path.join(__dirname, "..", "public", "404.html"));
  }

  const key = `redirect:${slug}`;
  const target = await redis.get(key);

  if (!target) {
    return res.status(404).sendFile(path.join(__dirname, "..", "public", "404.html"));
  }

  const rawQuery = req.originalUrl.includes("?") ? req.originalUrl.split("?").slice(1).join("?") : "";
  const redirectUrl = mergeQueryIntoTarget(target, rawQuery);

  return res.redirect(302, redirectUrl);
});

app.listen(PORT, () => {
  console.log(`Redirector running on http://localhost:${PORT}`);
});
