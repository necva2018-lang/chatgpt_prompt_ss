const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = __dirname;
const clean = s => s.replace(/\\([\[\]*])/g, '$1').replace(/\*\*/g, '').trim();
const sources = [];
const records = [];
const read = (prefix, id, expected) => {
  const names = fs.readdirSync(path.join(root, 'Data Pool')).filter(n => n.startsWith(prefix) && n.endsWith('.md'));
  assert.equal(names.length, 1, `來源檔需唯一：${prefix}`);
  const file = names[0];
  const raw = fs.readFileSync(path.join(root, 'Data Pool', file), 'utf8');
  const text = raw.replace(/\r\n/g, '\n');
  sources.push({id, title: file.replace(/\.md$/, ''), path: `Data Pool/${file}`, sha256: crypto.createHash('sha256').update(raw).digest('hex'), expected_record_count: expected, actual_record_count: 0});
  return {id, text};
};
const category = (kind, name) => `${kind === 'image' ? 'img' : 'txt'}-${crypto.createHash('sha256').update(name).digest('hex').slice(0, 12)}`;
const categories = new Map();
function add(src, number, kind, name, command, summary, cat, prompt, promptType, excerpt, offset, extra = {}) {
  const catId = category(kind, cat);
  categories.set(catId, {id: catId, output_type: kind, name: cat, origin: 'source_category', scenario_ids: [], goal_ids: [], extensions: {}});
  const line = 1 + src.text.slice(0, offset).split('\n').length - 1;
  const variableTokens = [...new Set([...prompt.matchAll(/\[[^\]\n]+\]|【[^】\n]+】/g)].map(m => m[0]))];
  const record = {
    id: `${src.id}-${String(number).padStart(3, '0')}`,
    output_type: kind,
    title: clean(name),
    command,
    aliases: [],
    summary: clean(summary),
    category_ids: [catId],
    scenario_ids: [],
    goal_ids: [],
    tags: [],
    prompt: {text: prompt, language: kind === 'image' ? 'en' : 'zh-TW', type: promptType, origin: 'source', variables: variableTokens.map((token, i) => ({key: `field_${i + 1}`, label: token.slice(1, -1), token, required: null, default: null}))},
    usage: {input_requirements: [], steps: [], notes: [], source_detail: null},
    examples: [],
    case_ids: [],
    media: [],
    image_links: {cover_url: null, reference_urls: [], result_urls: [], gallery_urls: []},
    related_ids: [],
    duplicate_group_ids: [],
    source_refs: [{source_id: src.id, item_number: number, line_start: line, line_end: line + excerpt.split('\n').length - 1, raw_excerpt: excerpt}],
    quality: {status: 'imported', tested: false, review_flags: [], notes: []},
    created_at: '2026-10-09',
    updated_at: '2026-10-09',
    extensions: {}
  };
  Object.assign(record, extra);
  records.push(record);
  sources.find(s => s.id === src.id).actual_record_count++;
  return record;
}

// 圖像代碼：保留原英文作為完整來源指示，中文翻譯不冒充已校對版本。
const image = read('400-plus', 'src-visual642', 642);
let imageCat = '';
let imageOffset = 0;
for (const line of image.text.split('\n')) {
  if (line.startsWith('### ')) imageCat = line.slice(4);
  const m = line.match(/^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*$/);
  if (m) {
    const [_, number, command, en, zh] = m;
    const r = add(image, Number(number), 'image', zh, command, zh, imageCat, en.trim(), 'instruction', line, imageOffset);
    r.extensions.original_description_en = en.trim();
    r.extensions.original_translation_zh = zh.trim();
    r.usage.input_requirements = [{kind: 'reference_image', description: '來源使用說明要求先上傳圖片。', origin: 'source_document'}];
    r.usage.notes = ['代碼是來源作者自訂提示標籤；使用時可複製英文說明。', '來源建議依需要補充保留臉孔、姿勢、主體及長寬比。'];
    r.quality.review_flags.push('translation_unreviewed', 'visual_result_unverified');
    const corrections = {
      '/popupstore': '將主體轉換成品牌快閃店。',
      '/packagingdieline': '將包裝圖稿呈現在清晰的平面刀模展開圖上。',
      '/splitdiopter': '讓近處主體與遠處主體同時清晰對焦。'
    };
    if (corrections[command]) {
      r.title = r.summary = corrections[command];
      r.quality.review_flags = r.quality.review_flags.filter(f => f !== 'translation_unreviewed');
      r.quality.notes.push('中文依原英文修正；原翻譯保留於 extensions.original_translation_zh。');
    }
  }
  imageOffset += line.length + 1;
}

// 99 組：每列有完整提示詞，保留占位欄位並清除剪藏跳脫符號。
const templates = read('ChatGPT 指令大全', 'src-template99', 99);
let textCat = '';
let textOffset = 0;
for (const line of templates.text.split('\n')) {
  if (/^### [一二三四五六七八九]、/.test(line)) textCat = line.slice(4).replace(/^[一二三四五六七八九]、/, '').replace(/（.*$/, '');
  const normalized = clean(line);
  const m = normalized.match(/^(\d+)\. (.+?) ｜快速標籤：\s*`([^`]+)`\s*｜可直接輸入：(.*)$/);
  if (m) add(templates, Number(m[1]), 'text', m[2], m[3], m[2], textCat, m[4].trim(), 'template', line, textOffset);
  textOffset += line.length + 1;
}

// 50 組：清單供穩定編號，前文供情境與實際範例。
const shortcuts = read('GPT 50', 'src-shortcut50', 50);
const shortIndex = shortcuts.text.indexOf('## 50 個 GPT 短指令快速收藏');
const shortBody = shortcuts.text.slice(0, shortIndex);
const shortList = shortcuts.text.slice(shortIndex);
const listRegex = /(\d+)\. \*\*\s*```\s*(\/[^\s`]+)\s*```\s*\*\*—\s*([^\n]+)/g;
for (const m of shortList.matchAll(listRegex)) {
  const cmd = m[2];
  const heading = [...shortBody.matchAll(/^### (\/[^\s\u3400-\u9fff]+).*$/gm)].find(h => h[1] === cmd);
  let detail = '', cat = '其他文字任務';
  if (heading) {
    const start = heading.index;
    const next = shortBody.indexOf('\n### ', start + 1);
    const nextSection = shortBody.indexOf('\n## ', start + 1);
    const ends = [next, nextSection, shortBody.length].filter(n => n > start);
    detail = shortBody.slice(start, Math.min(...ends)).trim();
    const sections = [...shortBody.slice(0, start).matchAll(/^## (.+)$/gm)];
    cat = sections.at(-1)[1].replace(/^[一二三四五六七八九]、/, '');
  }
  const r = add(shortcuts, Number(m[1]), 'text', m[3], cmd, m[3], cat, m[3].trim(), 'task_description', m[0], shortIndex + m.index);
  r.usage.source_detail = detail || null;
  r.quality.review_flags.push('full_template_missing');
  for (const ex of detail.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) r.examples.push({kind: 'input_prompt', text: ex[1].trim(), origin: 'source', result: null});
}

// 33 組：來源宣稱 35 組，實際索引為 33，依實際內容建立。
const modes = read('ChatGPT 神秘指令', 'src-mode33', 33);
const modeIndexStart = modes.text.indexOf('### 影片必學 5 個');
const modeIndexEnd = modes.text.indexOf('## 這份清單可以幫你做到什麼');
const modeIndex = modes.text.slice(modeIndexStart, modeIndexEnd);
const advancedStart = modes.text.indexOf('## 另外 30 個進階指令分類整理');
let modeCat = '主力思考方法';
for (const line of modeIndex.split('\n')) {
  if (line.startsWith('### ') && !line.includes('影片必學')) modeCat = line.slice(4).replace(/^✍️\s*/, '').replace(/（.*$/, '');
  const m = line.match(/^(\d+)\. \*\*([^*]+)\*\*\s*｜\s*(.+)$/);
  if (!m) continue;
  const n = Number(m[1]);
  const cmd = m[2];
  let detail, prompt, name;
  if (n <= 5) {
    const heading = [...modes.text.matchAll(/^## 第.+?：([^｜\n]+)｜([^\n]+)$/gm)].find(h => h[1] === cmd);
    assert.ok(heading, `主力模式缺少段落：${cmd}`);
    const next = modes.text.indexOf('\n## ', heading.index + 1);
    detail = modes.text.slice(heading.index, next === -1 ? modes.text.length : next).trim();
    const code = [...detail.matchAll(/```[^\n]*\n([\s\S]*?)```/g)];
    assert.ok(code.length);
    prompt = code[0][1].trim();
    name = heading[2];
  } else {
    const marker = `**${cmd}｜`;
    const start = modes.text.indexOf(marker, advancedStart);
    assert.ok(start >= 0, `進階模式缺少段落：${cmd}`);
    const end = modes.text.indexOf('\n\n', start);
    const h = modes.text.slice(start, end);
    name = h.slice(marker.length).replace(/\*\*$/, '');
    const quote = modes.text.slice(end).match(/^\n\n> ([^\n]+)/);
    assert.ok(quote, `進階模式缺少提示：${cmd}`);
    prompt = quote[1];
    detail = h + '\n\n> ' + prompt;
  }
  const start = modes.text.indexOf(detail);
  const r = add(modes, n, 'text', name, cmd, m[3], modeCat, prompt, 'template', detail, start);
  r.usage.source_detail = detail;
  if (n <= 5) {
    const examples = [...detail.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].slice(1);
    r.examples = examples.map(ex => ({kind: 'input_prompt', text: ex[1].trim(), origin: 'source', result: null}));
  }
  r.quality.notes.push('文章示意回應及成效說法未視為實測成果。');
}

// 20 組：主力六個完整模板，補充十四個短提示／說明。
const thinking = read('ChatGPT 隱藏指令 完整版', 'src-thinking20', 20);
const mainHeadings = [...thinking.text.matchAll(/^([1-6])([^\n]+)穩$/gm)];
const mainDefs = [
  ['First Principles', '第一性原理'], ["Devil's Advocate", '反方挑戰'],
  ['Second Order Thinking', '二階思維'], ['Feynman', '費曼教學法'],
  ['Socratic', '蘇格拉底問答'], ['Red Team', '紅隊壓測']
];
for (const h of mainHeadings) {
  const n = Number(h[1]);
  const code = thinking.text.slice(h.index).match(/```[^\n]*\n([\s\S]*?)```/);
  assert.ok(code);
  const end = h.index + code.index + code[0].length;
  const detail = thinking.text.slice(h.index, end);
  const usage = detail.match(/\*\*用在：\*\* ([^\n]+)/);
  const r = add(thinking, n, 'text', mainDefs[n - 1][1], mainDefs[n - 1][0], usage ? usage[1] : mainDefs[n - 1][1], '主力思考方法', code[1].trim(), 'template', detail, h.index);
  r.usage.source_detail = detail;
}
const tailDefs = [
  ['ELI5 / ELI10', '講到小孩都懂', '打：用 ELI5 解釋【你的問題】', 'TL;DR', '補充思考方法'],
  ['TL;DR', '三句話總結', '打：TL;DR：【貼上長文】', 'Pareto', '補充思考方法'],
  ['Pareto', '80/20 抓重點', '打：用 Pareto 幫我抓出最關鍵的 20%', 'Critique', '補充思考方法'],
  ['Critique', '自我批判', '打：Critique 你剛剛的回答，再給更好的版本', 'Steelman', '補充思考方法'],
  ['Steelman', '強化對方論點', '打：先 Steelman【某觀點】，再說你為何不同意', 'Inversion', '補充思考方法'],
  ['Inversion', '逆向思考', '打：用 Inversion 想——怎樣一定會失敗', 'Pre-mortem', '補充思考方法'],
  ['Pre-mortem', '事前驗屍', '打：做一次 Pre-mortem，這計畫半年後失敗的原因', 'Eisenhower', '補充思考方法'],
  ['Eisenhower', '重要緊急矩陣', '打：用 Eisenhower Matrix 幫我把這些待辦分類', '進階 · Mode', '補充思考方法'],
  ['CEO Mode', '商業視角', null, 'Content Director Mode', '自創角色模式'],
  ['Content Director Mode', '流量轉換視角', null, 'Human Mode', '自創角色模式'],
  ['Human Mode', '少 AI 味', null, 'Viral', '自創角色模式'],
  ['Viral', '強化分享性', null, 'Lindy Mode', '自創角色模式'],
  ['Lindy Mode', '只給長期有效的', null, '任務型（', '自創角色模式'],
  ['Copy', '導購文案', '打：用 Copy 模式幫我寫【產品】的銷售文案', null, '文字任務']
];
const tailStart = thinking.text.indexOf('其餘 14 組');
tailDefs.forEach(([cmd, name, givenPrompt, next, cat], i) => {
  const start = thinking.text.indexOf(cmd + name, tailStart);
  assert.ok(start >= 0, `補充方法缺少：${cmd}`);
  const end = next ? thinking.text.indexOf(next, start + cmd.length + name.length) : thinking.text.length;
  assert.ok(end > start);
  const detail = thinking.text.slice(start, end).trim();
  const desc = detail.split('\n').map(s => s.trim()).find((s, j) => j > 0 && s && !s.startsWith('打：'));
  const r = add(thinking, i + 7, 'text', name, cmd, desc || name, cat, givenPrompt ? givenPrompt.slice(2) : desc, givenPrompt ? 'template' : 'task_description', detail, start);
  r.usage.source_detail = detail;
  if (!givenPrompt) r.quality.review_flags.push('full_template_missing');
  if (cat === '自創角色模式') r.quality.review_flags.push('custom_mode');
});

// 僅建立同名檢查群組，不跨成果類型合併，也不推論等義。
const normalizedCommand = s => s.toLowerCase().replace(/[’‘]/g, "'").replace(/^\//, '').replace(/[^a-z0-9]/g, '');
const groups = new Map();
for (const r of records) {
  const key = `${r.output_type}:${normalizedCommand(r.command)}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r.id);
}
const duplicateGroups = [...groups].filter(([_, ids]) => ids.length > 1).map(([key, ids], i) => ({id: `dup-${String(i + 1).padStart(3, '0')}`, normalized_key: key, record_ids: ids, status: 'needs_semantic_review', action: 'retain_all', notes: '僅名稱正規化相同；可能不同用途或不同來源版本，未自動合併。'}));
for (const group of duplicateGroups) for (const id of group.record_ids) records.find(r => r.id === id).duplicate_group_ids.push(group.id);
for (const r of records) {
  r.aliases = [...new Set([r.command.replace(/^\//, ''), r.command.toLowerCase()].filter(a => a !== r.command))];
  if (r.command === 'ELI5 / ELI10') r.aliases.push('ELI5', 'ELI10');
}

const textRecords = records.filter(r => r.output_type === 'text');
const imageRecords = records.filter(r => r.output_type === 'image');
for (const s of sources) assert.equal(s.actual_record_count, s.expected_record_count, `來源數量錯誤：${s.id}`);
assert.equal(records.length, 844);
assert.equal(textRecords.length, 202);
assert.equal(imageRecords.length, 642);
assert.equal(new Set(records.map(r => r.id)).size, records.length);
for (const r of records) {
  assert.ok(r.title && r.command && r.summary && r.prompt.text, `必要欄位空白：${r.id}`);
  assert.ok(r.category_ids.every(id => categories.get(id).output_type === r.output_type));
  assert.ok(r.source_refs.every(ref => sources.some(s => s.id === ref.source_id)));
  const src = sources.find(s => s.id === r.source_refs[0].source_id);
  const lines = fs.readFileSync(path.join(root, src.path), 'utf8').replace(/\r\n/g, '\n').split('\n');
  const ref = r.source_refs[0];
  assert.ok(lines.slice(ref.line_start - 1, ref.line_end).join('\n').includes(ref.raw_excerpt), `來源定位失敗：${r.id}`);
}
const write = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2) + '\n', 'utf8');
write('text-prompts.json', textRecords);
write('image-prompts.json', imageRecords);
write('sources.json', sources);
write('categories.json', [...categories.values()]);
write('duplicate-groups.json', duplicateGroups);
for (const name of ['scenarios', 'goals', 'cases']) if (!fs.existsSync(path.join(out, `${name}.json`))) write(`${name}.json`, []);
write('manifest.json', {schema_version: '1.1.0', updated_at: '2026-10-09', language: 'zh-TW', record_counts: {total: records.length, text: textRecords.length, image: imageRecords.length}, files: {text: 'text-prompts.json', image: 'image-prompts.json', sources: 'sources.json', categories: 'categories.json', scenarios: 'scenarios.json', goals: 'goals.json', cases: 'cases.json', duplicate_groups: 'duplicate-groups.json', schema: 'record.schema.json'}, classification_policy: '依預期成果分類；文字與圖片嚴格分檔，同名不代表相同用途。', extensions: {}});

// 人可讀版本：列出每一筆，原始剪藏不變。
for (const [kind, list] of [['text', textRecords], ['image', imageRecords]]) {
  let md = `# ${kind === 'text' ? '文字成果' : '圖片成果'}指令目錄\n\n共 ${list.length} 筆來源紀錄；未去重。JSON 是結構化主資料，這份目錄供閱讀。\n`;
  let currentCat = '';
  for (const r of list) {
    const cat = categories.get(r.category_ids[0]).name;
    if (cat !== currentCat) { md += `\n## ${cat}\n`; currentCat = cat; }
    md += `\n### ${r.title}\n\n- ID：${r.id}\n- 指令：\`${r.command}\`\n- 提示類型：${r.prompt.type}\n- 來源：${sources.find(s => s.id === r.source_refs[0].source_id).title}，第 ${r.source_refs[0].item_number} 筆\n\n${r.summary}\n\n\`\`\`text\n${r.prompt.text}\n\`\`\`\n`;
    if (r.examples.length) md += '\n來源輸入範例：\n' + r.examples.map(ex => `\n\`\`\`text\n${ex.text}\n\`\`\`\n`).join('');
    if (r.quality.review_flags.length) md += `\n待確認：${r.quality.review_flags.join('、')}\n`;
  }
  fs.writeFileSync(path.join(out, `${kind}-catalog.md`), md, 'utf8');
}
const report = {
  checked_at: '2026-10-09', result: 'passed', total: records.length, text: textRecords.length, image: imageRecords.length,
  sources: sources.map(s => ({id: s.id, expected: s.expected_record_count, actual: s.actual_record_count})),
  duplicate_groups: duplicateGroups.length,
  task_descriptions_without_full_template: records.filter(r => r.quality.review_flags.includes('full_template_missing')).length,
  unreviewed_image_translations: records.filter(r => r.quality.review_flags.includes('translation_unreviewed')).length,
  checks: ['來源逐檔筆數', '總筆數與成果分檔', 'ID 唯一', '必要欄位非空', '分類與成果一致', '來源參照存在', '每筆原文行號定位'],
  notes: ['35 組來源實際只有 33 組。', '未將宣傳文字、作者介紹、平台價目或嵌入影片匯入指令項目。', '未虛構實測成果、案例、場景、目標或平台相容性。', '相同名稱保留各版本，待語義審查。']
};
write('validation-report.json', report);
console.log(JSON.stringify(report, null, 2));
