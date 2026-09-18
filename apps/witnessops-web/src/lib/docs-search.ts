export interface SearchEntry {
  title: string;
  description: string;
  layerTitle: string;
  sectionTitle: string;
}

export function matchScore(query: string, entry: SearchEntry): number {
  const q = query.toLowerCase();
  const title = entry.title.toLowerCase();
  const desc = entry.description.toLowerCase();
  const layer = entry.layerTitle.toLowerCase();
  const section = entry.sectionTitle.toLowerCase();

  if (title === q) return 100;
  if (title.startsWith(q)) return 80;
  if (title.includes(q)) return 60;
  if (layer.includes(q)) return 45;
  if (section.includes(q)) return 40;


  // Natural task queries often span title and description, e.g. "create account".
  const words = q.replace(/sign[ -]?up/g, "signup").split(/\s+/).filter(Boolean);
  const haystack = `${title} ${desc}`.replace(/sign[ -]?up/g, "signup");
  if (words.length > 1 && words.every(word => title.includes(word))) return 55;
  if (desc.includes(q)) return 30;
  if (words.length > 1 && words.every(word => haystack.includes(word))) return 25;

  // Fuzzy: check if all chars appear in order
  let ti = 0;
  for (let i = 0; i < q.length; i++) {
    const idx = title.indexOf(q[i], ti);
    if (idx === -1) return 0;
    ti = idx + 1;
  }
  return 15;
}
