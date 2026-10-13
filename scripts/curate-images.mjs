// Resolves verified Wikipedia article URLs and Wikimedia Commons image metadata for the seed library.
// Usage: node scripts/curate-images.mjs  (writes src/lib/content/curated-media.ts)
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const UA = "CurioSeedCurator/0.1 (personal open-source learning app; one-off metadata curation)";

/** slug -> { article (source), image (article whose lead image is used, defaults to article) } */
const ENTRIES = {
  "kpg-extinction": { article: "Cretaceous–Paleogene extinction event" },
  "fastest-dinosaurs": { article: "Ornithomimidae" },
  "hypercar-engineering": { article: "Bugatti Chiron" },
  "black-hole-formation": { article: "Black hole" },
  "roman-concrete": { article: "Roman concrete", image: "Pantheon, Rome" },
  "silk-road": { article: "Silk Road", image: "Bactrian camel" },
  "psychology-of-memory": { article: "Memory", image: "Hippocampus" },
  "mountain-formation": { article: "Orogeny", image: "Himalayas" },
  "origins-of-writing": { article: "History of writing", image: "Cuneiform" },
  "exoplanet-discovery": { article: "Exoplanet", image: "Kepler space telescope" },
  "deep-sea-vents": { article: "Hydrothermal vent" },
  "encryption-mathematics": { article: "Public-key cryptography", image: "Cryptography" },
  "printing-press": { article: "Printing press" },
  "language-evolution": { article: "Origin of language", image: "Broca's area" },
  "science-of-sleep": { article: "Sleep" },
  "tardigrades": { article: "Tardigrade" },
  "octopus-intelligence": { article: "Cephalopod intelligence", image: "Octopus" },
  "auroras": { article: "Aurora" },
  "antikythera-mechanism": { article: "Antikythera mechanism" },
  "voyager-golden-record": { article: "Voyager Golden Record" },
  "placebo-effect": { article: "Placebo" },
  "mirror-test": { article: "Mirror test" },
  "mycorrhizal-networks": { article: "Mycorrhizal network", image: "Mycorrhiza" },
  "bird-migration": { article: "Bird migration", image: "Bar-tailed godwit" },
  "green-sahara": { article: "African humid period" },
  "mariana-trench": { article: "Mariana Trench" },
  "library-of-alexandria": { article: "Library of Alexandria" },
  "fibonacci-in-nature": { article: "Fibonacci sequence" },
  "invention-of-zero": { article: "0" },
  "monty-hall-problem": { article: "Monty Hall problem" },
  "the-transistor": { article: "Transistor" },
  "gps-and-relativity": { article: "Global Positioning System" },
  "flying-buttresses": { article: "Flying buttress" },
  "panama-canal-locks": { article: "Panama Canal", image: "Panama Canal locks" },
  "terracotta-army": { article: "Terracotta Army" },
  "tyrian-purple": { article: "Tyrian purple" },
  "bioluminescence": { article: "Bioluminescence" },
  "year-without-a-summer": { article: "Year Without a Summer", image: "Mount Tambora" },
  "crispr": { article: "CRISPR gene editing" },
  "great-wave": { article: "The Great Wave off Kanagawa" },
  "moai": { article: "Moai" },
  "atacama-desert": { article: "Atacama Desert" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(host, params, attempt = 0) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params });
  await sleep(1200);
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!res && attempt < 5) return api(host, params, attempt + 1);
  if (!res) throw new Error(`Network failure for ${url}`);
  if (res.status === 429 && attempt < 5) {
    await sleep(Math.min(Number(res.headers.get("retry-after") ?? 10), 30) * 1000);
    return api(host, params, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

async function articleInfo(title) {
  const data = await api("en.wikipedia.org", {
    action: "query", prop: "pageimages|info", piprop: "name", inprop: "url", redirects: "1", titles: title,
  });
  const page = data.query?.pages?.[0];
  if (!page || page.missing) return null;
  return { title: page.title, url: page.fullurl, imageFile: page.pageimage ?? null };
}

const stripHtml = (s) => (s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function commonsImage(file) {
  const data = await api("commons.wikimedia.org", {
    action: "query", prop: "imageinfo", iiprop: "url|extmetadata|mime", iiurlwidth: "1280", titles: `File:${file}`,
  });
  const page = data.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!info || page.missing) return null; // not on Commons (e.g. non-free local file)
  if (!/^image\/(jpeg|png|webp)$/.test(info.mime) && !(info.mime === "image/svg+xml" && info.thumburl)) return null;
  const m = info.extmetadata ?? {};
  return {
    url: info.thumburl ?? info.url,
    pageUrl: info.descriptionurl,
    credit: stripHtml(m.Artist?.value).slice(0, 160) || "Wikimedia Commons contributor",
    license: stripHtml(m.LicenseShortName?.value) || "See source page",
    licenseUrl: m.LicenseUrl?.value || undefined,
  };
}

const OUTPUT = new URL("../src/lib/content/curated-media.ts", import.meta.url);
// `--only=slug-a,slug-b` refreshes just those entries and keeps the rest of the existing file.
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const out = {};
if (only && existsSync(OUTPUT)) {
  const existing = readFileSync(OUTPUT, "utf8").match(/= (\{[\s\S]*\});\s*$/);
  if (existing) Object.assign(out, JSON.parse(existing[1]));
}
for (const [slug, entry] of Object.entries(ENTRIES)) {
  if (only && !only.includes(slug)) continue;
  const article = await articleInfo(entry.article);
  if (!article) { console.warn(`! no article for ${slug}`); continue; }
  const imgArticle = entry.image ? await articleInfo(entry.image) : article;
  const image = imgArticle?.imageFile ? await commonsImage(imgArticle.imageFile) : null;
  out[slug] = { source: { title: `Wikipedia: ${article.title}`, url: article.url }, image };
  console.log(`${image ? "ok " : "-- "} ${slug}  ${image?.license ?? "(no free image)"}`);
}

const file = `// Generated by scripts/curate-images.mjs from the Wikipedia and Wikimedia Commons APIs. Do not edit by hand.
export interface CuratedMedia {
  source: { title: string; url: string };
  image: { url: string; pageUrl: string; credit: string; license: string; licenseUrl?: string } | null;
}

export const CURATED_MEDIA: Record<string, CuratedMedia> = ${JSON.stringify(out, null, 2)};
`;
writeFileSync(OUTPUT, file);
console.log(`Wrote ${Object.keys(out).length} entries.`);
