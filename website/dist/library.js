export function normalize(value) { return String(value || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[\s/_\-']/g, ''); }
export function searchRecords(records, filters = {}) {
  const {type = 'text', query = '', category = '', scene = '', goal = '', saved = null, sort = 'recommended'} = filters;
  const terms = query.trim().split(/\s+/).filter(Boolean).map(normalize);
  const results = records.filter(r => r.output_type === type && (!category || r.category_ids.includes(category)) && (!scene || r.scene_ids.includes(scene)) && (!goal || r.goal_ids.includes(goal)) && (!saved || saved.has(r.id)) && terms.every(term => normalize([r.title, r.command, ...r.aliases, r.summary, r.prompt.text].join(' ')).includes(term)));
  if (sort === 'name') results.sort((a,b) => a.title.localeCompare(b.title, 'zh-Hant'));
  else if (sort === 'source') results.sort((a,b) => a.source_refs[0].source_id.localeCompare(b.source_refs[0].source_id) || a.source_refs[0].item_number - b.source_refs[0].item_number);
  else {
    const order = {'src-thinking20':0,'src-template99':1,'src-mode33':2,'src-shortcut50':3,'src-visual642':4};
    results.sort((a,b) => (order[a.source_refs[0].source_id] ?? 10) - (order[b.source_refs[0].source_id] ?? 10) || a.source_refs[0].item_number - b.source_refs[0].item_number);
  }
  return results;
}
export function applyVariables(prompt, values) {
  let text = prompt.text;
  for (const variable of prompt.variables) if (values[variable.key]?.trim()) text = text.split(variable.token).join(values[variable.key]);
  return text;
}
export function safeImageURL(value) {
  if (!value || typeof value !== 'string') return null;
  try { const url = new URL(value, globalThis.location?.href || 'https://example.invalid/'); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
