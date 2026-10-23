const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
function validate(progress, records, websiteCases) {
  assert.equal(progress.version, 1);
  assert.ok(['assistant', 'assistant_or_authorized_user'].includes(progress.policy.source_provider));
  assert.equal(progress.policy.intent_review_required, true);
  assert.equal(progress.policy.default_batch_size, 20);
  assert.equal(new Set(progress.stages.map(s => s.id)).size, progress.stages.length);
  assert.equal(new Set(progress.cases.map(c => c.id)).size, progress.cases.length);
  const stages = new Set(progress.stages.map(s => s.id));
  const ids = new Set(records.map(r => r.id));
  for (const c of progress.cases) {
    assert.ok(stages.has(c.stage_id) && ids.has(c.prompt_id), `${c.id}: 階段或指令 ID 不存在`);
    assert.ok(['planned', 'in_progress', 'needs_revision', 'replacement_required', 'archived_replaced', 'verified'].includes(c.status));
    if (c.status === 'archived_replaced') assert.ok(c.archive_evidence, '已替換案例缺少歷史紀錄');
    if (c.status === 'replacement_required') assert.ok(websiteCases.some(item => item.id === c.id), '待替換案例不存在');
    if (c.status === 'verified') {
      for (const name of ['source', 'intent', 'cloudinary', 'database', 'web']) assert.equal(c.checks[name].status, 'passed', `${c.id}: ${name} 未通過`);
      assert.ok(c.checks.intent.evidence && c.checks.web.evidence, '完成案例缺少驗證證據');
    }
  }
  assert.ok(stages.has(progress.next.stage_id));
  assert.ok(progress.next.case_ids.every(id => progress.cases.some(c => c.id === id)));
  return true;
}
function render(progress, records, cases) {
  const verified = progress.cases.filter(c => c.status === 'verified').length;
  const replacements = progress.cases.filter(c => c.status === 'replacement_required').length;
  const rows = progress.stages.map(s => `| ${s.id} | ${s.name} | ${s.status} | ${s.batch_size} | ${s.next_action} |`).join('\n');
  const entries = progress.cases.map(c => `| ${c.id} | ${c.command} | ${c.status} | ${c.checks.source.status} | ${c.checks.intent.status} | ${c.checks.web.status} | ${c.next_action} |`).join('\n');
  return `# 圖片案例階段進度\n\n由 database/image-case-progress.json 產生；請修改 JSON 後執行 npm run image:progress。\n\n來源指令 ${records.length} 筆；本機網站已有 ${cases.filter(c=>c.output_type==='image').length} 個圖片案例；新規則合規驗證完成 ${verified} 個；待替換 ${replacements} 個。指令總數不等於必須生圖的張數。\n\n| 階段 | 工作 | 狀態 | 每批案例數 | 下一步 |\n|---|---|---|---|---|\n${rows}\n\n| 案例 | 指令 | 狀態 | 素材 | 本意验收 | 網頁 | 下一步 |\n|---|---|---|---|---|---|---|\n${entries}\n\n## 下次接續\n\n${progress.next.action}\n\n下一批：${progress.next.batch_id}；案例：${progress.next.case_ids.join('、')}。只有通過案例本意驗收的图片才能上傳；持續模式啟動後每批完成自動接續；額度不足則存檔等待。公開部署狀態：${progress.deployment.status}。\n\n## 活動記錄\n\n${progress.history.map(h=>`- ${h.date} · ${h.action}：${h.result}`).join('\n')}\n\n詳細規則：[階段規劃與驗收](IMAGE-CASE-WORKFLOW.md)。\n`;
}
if (require.main === module) {
  try {
    const progress = read('database/image-case-progress.json');
    const records = read('database/image-prompts.json');
    const cases = read('database/cases.json');
    validate(progress, records, cases);
    const report = render(progress, records, cases);
    const target = path.join(root, 'docs/IMAGE-CASE-PROGRESS.md');
    if (process.argv.includes('--check')) assert.equal(fs.readFileSync(target, 'utf8'), report, '進度 Markdown 尚未同步');
    else fs.writeFileSync(target, report);
    console.log(`PASS: 圖片進度 ${progress.cases.length} 個案例；${progress.cases.filter(c=>c.status==='verified').length} 個符合目前來源與驗收規則。`);
  } catch (error) {console.error(error.message);process.exitCode=1;}
}
module.exports = {validate, render};
