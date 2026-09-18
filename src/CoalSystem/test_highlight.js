const highlight = "s";
const text = "Jai Bhole Traders";
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const safeHighlight = escapeRegExp(highlight);
const parts = String(text).split(new RegExp(`(${safeHighlight})`, 'gi'));
console.log(parts);
parts.forEach(part => {
  console.log(`"${part}" -> matches?`, part.toLowerCase() === highlight.toLowerCase());
});
