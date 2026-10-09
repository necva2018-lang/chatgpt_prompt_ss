const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const read = n => JSON.parse(fs.readFileSync(path.join(__dirname, n), 'utf8'));
const schema = read('record.schema.json');
// 核對本資料 schema 所用的關鍵字；不宣稱為通用 JSON Schema 驗證器。
function check(value, rule, at) {
  if (rule.$ref) {
    assert.ok(rule.$ref.startsWith('#/'));
    rule = rule.$ref.slice(2).split('/').reduce((s, k) => s[k], schema);
  }
  if (rule.type) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type];
    const valid = types.some(t => t === 'null' ? value === null : t === 'array' ? Array.isArray(value) : t === 'integer' ? Number.isInteger(value) : t === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) : typeof value === t);
    assert.ok(valid, `${at}: 欄位型別錯誤`);
  }
  if (rule.enum) assert.ok(rule.enum.includes(value), `${at}: 不允許的值`);
  if (typeof value === 'string') {
    if (rule.minLength) assert.ok(value.length >= rule.minLength, `${at}: 字串太短`);
    if (rule.pattern) assert.ok(new RegExp(rule.pattern).test(value), `${at}: 格式不符`);
  }
  if (typeof value === 'number' && rule.minimum !== undefined) assert.ok(value >= rule.minimum, `${at}: 數值過小`);
  if (Array.isArray(value)) {
    if (rule.minItems) assert.ok(value.length >= rule.minItems, `${at}: 筆數不足`);
    if (rule.uniqueItems) assert.equal(new Set(value.map(v => JSON.stringify(v))).size, value.length, `${at}: 重複元素`);
    if (rule.items) value.forEach((v, i) => check(v, rule.items, `${at}[${i}]`));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of rule.required || []) assert.ok(Object.hasOwn(value, key), `${at}: 缺少 ${key}`);
    if (rule.additionalProperties === false) for (const key of Object.keys(value)) assert.ok(Object.hasOwn(rule.properties || {}, key), `${at}: 額外欄位 ${key}`);
    for (const [key, sub] of Object.entries(rule.properties || {})) if (Object.hasOwn(value, key)) check(value[key], sub, `${at}.${key}`);
  }
}
const manifest = read('manifest.json');
const text = read('text-prompts.json');
const image = read('image-prompts.json');
const records = [...text, ...image];
const ids = new Set(records.map(r => r.id));
assert.equal(ids.size, records.length);
assert.equal(text.length, manifest.record_counts.text);
assert.equal(image.length, manifest.record_counts.image);
assert.equal(records.length, manifest.record_counts.total);
assert.ok(text.every(r => r.output_type === 'text'));
assert.ok(image.every(r => r.output_type === 'image'));
const categories = new Map(read('categories.json').map(c => [c.id, c]));
const sources = read('sources.json');
const groups = read('duplicate-groups.json');
const groupIds = new Set(groups.map(g => g.id));
const scenarioIds = new Set(read('scenarios.json').map(s => s.id));
const goalIds = new Set(read('goals.json').map(g => g.id));
const caseIds = new Set(read('cases.json').map(c => c.id));
for (const r of records) {
  check(r, schema, r.id);
  for (const id of r.category_ids) assert.equal(categories.get(id)?.output_type, r.output_type, `${r.id}: 分類成果衝突`);
  for (const id of r.related_ids) assert.ok(ids.has(id));
  for (const id of r.scenario_ids) assert.ok(scenarioIds.has(id));
  for (const id of r.goal_ids) assert.ok(goalIds.has(id));
  for (const id of r.case_ids) assert.ok(caseIds.has(id));
  for (const id of r.duplicate_group_ids) assert.ok(groupIds.has(id));
  for (const ref of r.source_refs) assert.ok(sources.some(s => s.id === ref.source_id));
  for (const variable of r.prompt.variables) assert.ok(r.prompt.text.includes(variable.token));
}
for (const group of groups) {
  assert.ok(group.record_ids.every(id => ids.has(id)));
  assert.equal(new Set(group.record_ids.map(id => records.find(r => r.id === id).output_type)).size, 1);
  assert.ok(group.record_ids.every(id => records.find(r => r.id === id).duplicate_group_ids.includes(group.id)));
}
for (const source of sources) assert.equal(records.filter(r => r.source_refs.some(ref => ref.source_id === source.id)).length, source.actual_record_count);
const report = read('validation-report.json');
for (const name of ['逐筆結構與 schema 一致', '所有關聯 ID 存在', '占位欄位與提示原文一致', '重複群組雙向參照']) if (!report.checks.includes(name)) report.checks.push(name);
fs.writeFileSync(path.join(__dirname, 'validation-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`PASS: ${records.length} 筆；文字 ${text.length}、圖片 ${image.length}；結構、分類、來源與關聯核對通過。`);
