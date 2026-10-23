const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const dimensions = ['subject', 'scene', 'effect', 'relations', 'details'];
function imageHash(root, relative) {
  assert.ok(typeof relative === 'string' && !path.isAbsolute(relative), '驗收圖片必須是相對路徑');
  const file = fs.realpathSync(path.resolve(root, relative));
  const inside = path.relative(fs.realpathSync(root), file);
  assert.ok(inside && !inside.startsWith('..') && !path.isAbsolute(inside), '驗收圖片必須在專案內');
  return digest(fs.readFileSync(file));
}
function assertBatchReady(root, batch) {
  const records = JSON.parse(fs.readFileSync(path.join(root, 'database/image-prompts.json'), 'utf8'));
  for (const c of batch.cases) {
    const record = records.find(r => r.id === c.prompt_id);
    assert.ok(record && record.command === c.command, `${c.id}: 指令對應錯誤`);
    const source = c.source;
    assert.ok(source && ['assistant', 'user'].includes(source.provided_by), `${c.id}: 必須記錄素材提供者`);
    assert.ok(['ai_generated', 'external_licensed', 'user_provided'].includes(source.kind), `${c.id}: 素材類型不合規`);
    if (source.provided_by === 'user' || source.kind === 'user_provided') {
      assert.ok(source.provided_by === 'user' && source.kind === 'user_provided', `${c.id}: 使用者來源類型不一致`);
      assert.ok(source.authorization?.instruction?.trim() && source.authorization.date?.trim(), `${c.id}: 缺少使用者素材授權紀錄`);
      assert.equal(source.authorization.directory, 'ex product', `${c.id}: 使用者授權目錄不一致`);
      const allowed = fs.realpathSync(path.join(root, 'ex product'));
      const inside = path.relative(allowed, fs.realpathSync(path.resolve(root, c.reference)));
      assert.ok(inside && !inside.startsWith('..') && !path.isAbsolute(inside), `${c.id}: 來源不在使用者授權目錄內`);
    } else {
      assert.equal(source.provided_by, 'assistant', `${c.id}: 必須由助理取得素材並記錄來源`);
      const inside = path.relative(fs.realpathSync(root), fs.realpathSync(path.resolve(root, c.reference)));
      assert.ok(!/(^|[\\/])ex product([\\/]|$)/i.test(inside), `${c.id}: 使用者素材必須如實標記來源與授權`);
    }
    assert.equal(source.path, c.reference, `${c.id}: 來源與參考圖路徑不一致`);
    const referenceHash = imageHash(root, c.reference);
    const resultHash = imageHash(root, c.result);
    assert.equal(source.sha256, referenceHash, `${c.id}: 素材已變更`);
    if (source.kind === 'ai_generated') {
      assert.ok(source.generator?.trim() && source.prompt?.trim(), `${c.id}: 缺少原圖生成工具或提示詞`);
    } else if (source.kind === 'external_licensed') {
      for (const name of ['url', 'license_url']) assert.ok(/^https:\/\//.test(source[name] || ''), `${c.id}: 缺少來源或授權網址`);
      assert.ok(source.license?.trim() && source.attribution?.trim() && source.checked_at?.trim(), `${c.id}: 缺少授權紀錄`);
      assert.ok(source.allows_modification === true && source.allows_public_display === true, `${c.id}: 未確認改作與公開展示權限`);
    }
    const review = c.review;
    assert.ok(review?.status === 'passed' && review.reviewer?.trim() && review.checked_at?.trim(), `${c.id}: 未完成案例本意驗收`);
    assert.equal(review.source_instruction, record.prompt.text, `${c.id}: 驗收指令與原文不一致`);
    assert.equal(review.reference_sha256, referenceHash, `${c.id}: 參考圖驗收已過期`);
    assert.equal(review.result_sha256, resultHash, `${c.id}: 成果圖驗收已過期`);
    assert.equal(review.applied_prompt_sha256, digest(c.applied_prompt), `${c.id}: 生成提示詞驗收已過期`);
    for (const dimension of dimensions) {
      const item = review.criteria?.find(item => item.dimension === dimension);
      assert.ok(item?.expected?.trim() && item.observed?.trim() && item.status === 'passed', `${c.id}: ${dimension} 尚未通過`);
    }
    assert.equal(typeof review.requires_factual_check, 'boolean', `${c.id}: 必須記錄是否需要事實核對`);
    if (review.requires_factual_check) {
      assert.ok(review.factual_check?.status === 'passed' && review.factual_check.notes?.trim(), `${c.id}: 技術內容未完成核對`);
      assert.ok(review.factual_check.source_urls?.length && review.factual_check.source_urls.every(url => /^https:\/\//.test(url)), `${c.id}: 技術核對缺少來源`);
    }
  }
  return true;
}
module.exports = {assertBatchReady, digest, dimensions};
