// Case-insensitively filters candidate names down to ones not already in the pantry
// (and not duplicated within the candidates themselves). Shared by addFromText and
// the photo-scan merge, since both need the same "is this already here" rule.
export function dedupeNewItems(candidates, existingPantry) {
  const existingLower = existingPantry.map(p => p.name.toLowerCase());
  const result = [];
  candidates.forEach(raw => {
    const name = String(raw).trim();
    if (!name) return;
    const lower = name.toLowerCase();
    if (existingLower.includes(lower)) return;
    if (result.some(n => n.toLowerCase() === lower)) return;
    result.push(name);
  });
  return result;
}
