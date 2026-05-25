import { termReference } from "../../data/term-reference.js";

const termEntries = termReference.flatMap((term) => [
  term.name,
  ...(term.aliases ?? []),
].map((label) => ({ label, term })));

const termLookup = new Map(termEntries.map(({ label, term }) => [label, term]));
const termPattern = new RegExp(
  termEntries
    .map(({ label }) => label)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|"),
  "g",
);

export function renderTermText(value) {
  const text = String(value ?? "");
  if (!text || termEntries.length === 0) return escapeHtml(text);

  return escapeHtml(text).replace(termPattern, (label, offset, source) => {
    if (hasWordPrefix(source, offset)) return label;
    const term = termLookup.get(label);
    if (!term) return label;
    return `<span class="term-glossary" data-term-name="${escapeAttribute(term.name)}">${label}</span>`;
  });
}

export function getTermDefinition(name) {
  return termLookup.get(name) ?? null;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWordPrefix(source, offset) {
  if (offset <= 0) return false;
  return /[\p{L}\p{N}]/u.test(source[offset - 1]);
}
