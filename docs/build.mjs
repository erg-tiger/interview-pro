// version: 0.7.0
// tags: [artifact, build, yaml, static-site]

// Run: node docs/build.mjs. Reads content/artifact.yaml and template.html, writes index.html (generated; do not edit it).
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

// js-yaml is installed with the prototype; reuse it instead of adding a second package.
const { load } = createRequire(new URL("../prototype/package.json", import.meta.url))("js-yaml");

const read = (name) => readFileSync(new URL(name, import.meta.url), "utf8");
const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const CALLOUT_LABELS = { weak_spot: "Weak spot", note: "Note" };

// Inline markup, applied after escaping so the YAML cannot inject HTML: **bold**, *italic*, __underline__, `code`, {ok|text} {warn|text} {bad|text} {info|text}.
const fmt = (value) =>
  esc(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/__([^_]+)__/g, "<u>$1</u>")
    .replace(/\{(ok|warn|bad|info)\|([^}]+)\}/g, '<span class="tag $1">$2</span>');

const ACCENTS = ["#0b3d91", "#0f766e", "#7c3aed", "#b45309", "#0369a1", "#be185d", "#047857", "#4338ca", "#c2410c", "#0e7490", "#6d28d9"];

// Pinned so the page cannot change under us; the diagram source stays readable if the script cannot load.
const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@12.2.0/dist/mermaid.esm.min.mjs";
let usesMermaid = false;

// Every value is escaped; the YAML cannot inject markup.
function renderBlock(block) {
  if ("p" in block) return `<p>${fmt(block.p)}</p>`;
  if ("h" in block) return `<h3>${fmt(block.h)}</h3>`;
  if ("cards" in block) {
    return `<div class="grid">${block.cards.map((card) => `<article class="card"><h4>${fmt(card.title)}</h4><p>${fmt(card.text)}</p></article>`).join("")}</div>`;
  }
  if ("bullets" in block) return `<ul>${block.bullets.map((b) => `<li>${fmt(b)}</li>`).join("")}</ul>`;
  if ("steps" in block) return `<ol class="steps${block.stacked ? " stacked" : ""}">${block.steps.map((s) => `<li>${fmt(s)}</li>`).join("")}</ol>`;
  if ("table" in block) {
    const { columns, rows } = block.table;
    const head = `<tr>${columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
    const body = rows.map((r) => `<tr>${r.map((cell) => `<td>${fmt(cell)}</td>`).join("")}</tr>`).join("");
    return `<div class="tbl"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  }
  if ("callout" in block) {
    const { kind, text } = block.callout;
    if (!CALLOUT_LABELS[kind]) throw new Error(`Unknown callout kind: ${kind}`);
    const tone = kind === "weak_spot" ? "warn" : "info";
    return `<div class="callout ${tone}"><strong>${CALLOUT_LABELS[kind]}:</strong> ${fmt(text)}</div>`;
  }
  if ("images" in block) {
    const figs = block.images.map((img) => {
      if (!/^img\/[\w.-]+\.(png|jpg|jpeg|webp)$/.test(img.src)) throw new Error(`Bad image path: ${img.src}`);
      return `<figure class="shot"><img src="${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy"><figcaption>${fmt(img.caption)}</figcaption></figure>`;
    });
    return `<div class="shots">${figs.join("")}</div>`;
  }
  if ("mermaid" in block) {
    usesMermaid = true;
    return `<figure><pre class="mermaid">${esc(block.mermaid.source.trim())}</pre><figcaption>${fmt(block.mermaid.caption)}</figcaption></figure>`;
  }
  throw new Error(`Unknown block: ${JSON.stringify(Object.keys(block))}`);
}

const content = load(read("content/artifact.yaml"));
const ids = new Set();
for (const section of content.sections) {
  if (ids.has(section.id)) throw new Error(`Duplicate section id: ${section.id}`);
  if (!section.nav || !section.kicker || !section.headline) throw new Error(`Section ${section.id} needs nav, kicker, and headline.`);
  ids.add(section.id);
}

const accent = (i) => ACCENTS[i % ACCENTS.length];
const nav = content.sections.map((s) => `<a class="nav" href="#${esc(s.id)}" data-id="${esc(s.id)}">${esc(s.nav)}</a>`).join("\n");
const sections = content.sections
  .map(
    (s, i) => `      <section class="sec" id="${esc(s.id)}" data-id="${esc(s.id)}" style="--accent:${accent(i)}">
        <span class="kicker">${fmt(s.kicker)}</span>
        <h2>${fmt(s.title)}</h2>
        <p class="headline">${fmt(s.headline)}</p>
        ${s.source ? `<p class="detail">Detail: ${esc(s.source)}</p>` : ""}
        ${s.blocks.map(renderBlock).join("\n        ")}
      </section>`,
  )
  .join("\n");

const values = { ...content.meta, nav, content: sections };
const scripts = usesMermaid
  ? `<script type="module">
    import mermaid from "${MERMAID_URL}";
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
    await mermaid.run({ querySelector: ".mermaid" });
  </script>`
  : "";
const RAW = new Set(["nav", "content", "scripts"]);
const html = read("template.html")
  .replace(/^<!--[\s\S]*?-->\s*/, "")
  .replace(/\{\{(\w+)\}\}/g, (_, key) => (key === "scripts" ? scripts : RAW.has(key) ? values[key] : esc(values[key])));

const banner = "<!--\nversion: 0.4.0\ntags: [artifact, html, generated]\nGenerated by docs/build.mjs from content/artifact.yaml. Do not edit by hand.\n-->\n";
writeFileSync(new URL("index.html", import.meta.url), banner + html);
console.log(`Wrote docs/index.html with ${content.sections.length} sections.`);
