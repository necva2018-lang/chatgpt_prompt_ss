const fs = require('fs');
const path = require('path');
const db = path.resolve(__dirname, '../database');
const read = file => JSON.parse(fs.readFileSync(path.join(db, file), 'utf8'));
const scenes = [
  { id: 'work', name: '工作與溝通', description: '報告、會議、信件與日常協作', mark: 'WORK' },
  { id: 'content', name: '內容創作', description: '文章、貼文、腳本與視覺設計', mark: 'CREATE' },
  { id: 'business', name: '商業與行銷', description: '產品展示、廣告、策略與經營', mark: 'BUSINESS' },
  { id: 'learning', name: '學習與教學', description: '理解概念、練習與知識解說', mark: 'LEARN' },
  { id: 'decision', name: '分析與決策', description: '比較選項、拆解問題與檢查風險', mark: 'THINK' },
  { id: 'development', name: '程式與技術', description: '程式碼、工程、機構與技術說明', mark: 'BUILD' },
  { id: 'visual', name: '影像與風格', description: '攝影、材質、場景與藝術表現', mark: 'VISUAL' }
];
const goals = [
  { id: 'clarity', name: '講得更清楚', description: '把複雜內容轉成容易理解的說明', mark: 'CLARITY' },
  { id: 'structure', name: '整理成形', description: '讓資訊有順序、有架構、可執行', mark: 'STRUCTURE' },
  { id: 'challenge', name: '找出盲點', description: '檢查假設、弱點、風險與例外', mark: 'CHALLENGE' },
  { id: 'options', name: '比較與選擇', description: '探索替代方案，釐清決策條件', mark: 'DECIDE' },
  { id: 'ideas', name: '獲取新靈感', description: '換個角度，延伸內容與創意方向', mark: 'IDEAS' },
  { id: 'polish', name: '提升完成度', description: '改寫、校對、修正與品質檢查', mark: 'POLISH' },
  { id: 'show', name: '呈現視覺效果', description: '改變畫面、構圖、材質與情境', mark: 'SHOW' },
  { id: 'value', name: '凸顯產品價值', description: '呈現產品特色、利益與使用情境', mark: 'VALUE' }
];
for (const [file, collection] of [['scenarios.json', scenes], ['goals.json', goals]]) {
  for (const item of read(file)) {
    const index = collection.findIndex(entry => entry.id === item.id);
    const value = {mark: '', description: '', ...item};
    if (index >= 0) collection[index] = {...collection[index], ...item}; else collection.push(value);
  }
}
const categories = read('categories.json');
const byCategory = new Map(categories.map(c => [c.id, c.name]));
function editorialFacets(r) {
  const cat = byCategory.get(r.category_ids[0]);
  const cmd = r.command.toLowerCase();
  let scene;
  if (r.output_type === 'image') {
    scene = /廣告|行銷|零售|產品/.test(cat) ? 'business' : /學習|解說|標註|操作說明/.test(cat) ? 'learning' : /工程|技術|機制|維修|控制|電力|連接|相容/.test(cat) ? 'development' : 'visual';
  } else {
    scene = /程式/.test(cat) ? 'development' : /商業/.test(cat) ? 'business' : /學習/.test(cat) ? 'learning' : /創意|創作|寫作|重寫|語氣/.test(cat) ? 'content' : /思考|決策|挑戰|研究|查證|資料分析/.test(cat) ? 'decision' : 'work';
    if (/eli[0-9]|feynman|socrat|teach|quiz|mentor|benchmark/.test(cmd)) scene = 'learning';
    if (/human|editor|hook|copy|clarity|viral|content director/.test(cmd)) scene = 'content';
    if (/ceo|moat|customer|business|strategy/.test(cmd)) scene = 'business';
  }
  let goal;
  if (r.output_type === 'image') goal = scene === 'business' ? 'value' : /解說|學習|標註|技術製圖/.test(cat) ? 'clarity' : 'show';
  else if (/red.?team|devil|truth|honesty|premortem|pre-mortem|inversion|critique|risk|blind|assumptions|worst|edge|counter|claimcheck|studycheck|causality|verify|security|contradictions/.test(cmd)) goal = 'challenge';
  else if (/compare|matrix|alternative|alt3|decision|10-10-10|steelman|second|first|lindy|anti-hype|pareto|priority|prioritize/.test(cmd)) goal = 'options';
  else if (/eli|feynman|socrat|teach|quiz|explain|plain|analogy|clarity|levels|simplify/.test(cmd)) goal = 'clarity';
  else if (/brainstorm|wild|remix|hook|headline|story|contrarian|futureyou/.test(cmd)) goal = 'ideas';
  else if (/human|tone|shorten|no-fluff|expand|proofread|refactor|debug|edit|voice|qa|error/.test(cmd)) goal = 'polish';
  else if (scene === 'business') goal = 'value';
  else goal = 'structure';
  return {scene_ids: r.scenario_ids.length ? r.scenario_ids : [scene], goal_ids: r.goal_ids.length ? r.goal_ids : [goal], facet_origin: r.scenario_ids.length || r.goal_ids.length ? 'database_or_editorial' : 'editorial_category_mapping'};
}
const records = [...read('text-prompts.json'), ...read('image-prompts.json')].map(r => ({
  id: r.id, output_type: r.output_type, title: r.title, command: r.command, aliases: r.aliases,
  summary: r.summary, category_ids: r.category_ids, prompt: r.prompt,
  usage: {input_requirements: r.usage.input_requirements, notes: r.usage.notes}, examples: r.examples,
  image_links: r.image_links, quality: r.quality, related_ids: r.related_ids,
  case_ids: r.case_ids, duplicate_group_ids: r.duplicate_group_ids,
  source_refs: r.source_refs.map(({source_id, item_number, line_start}) => ({source_id, item_number, line_start})),
  ...editorialFacets(r)
}));
const payload = {version: read('manifest.json').schema_version, records, categories, sources: read('sources.json').map(({id, title}) => ({id, title})), scenes, goals, cases: read('cases.json')};
fs.mkdirSync(path.join(__dirname, 'dist/data'), {recursive: true});
fs.writeFileSync(path.join(__dirname, 'dist/data/library.json'), JSON.stringify(payload));
console.log(`已同步 ${records.length} 筆，${Buffer.byteLength(JSON.stringify(payload))} bytes。原始資料未改動。`);
