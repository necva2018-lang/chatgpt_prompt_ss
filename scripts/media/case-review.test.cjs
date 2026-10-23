const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {assertBatchReady, digest, dimensions} = require('./case-review.cjs');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'intent-review-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'database'));
  fs.writeFileSync(path.join(root,'database/image-prompts.json'),JSON.stringify([{id:'one',command:'/subwayad',prompt:{text:'Place the subject in a realistic subway advertisement.'}}]));
  fs.writeFileSync(path.join(root,'reference.png'),'reference');
  fs.writeFileSync(path.join(root,'result.png'),'result');
  const c={id:'case-one',prompt_id:'one',command:'/subwayad',reference:'reference.png',result:'result.png',applied_prompt:'case prompt',source:{provided_by:'assistant',kind:'ai_generated',path:'reference.png',sha256:digest('reference'),generator:'built-in imagegen',prompt:'a neutral product'},review:{status:'passed',reviewer:'test reviewer',checked_at:'2026-10-09',source_instruction:'Place the subject in a realistic subway advertisement.',reference_sha256:digest('reference'),result_sha256:digest('result'),applied_prompt_sha256:digest('case prompt'),requires_factual_check:false,criteria:dimensions.map(d=>({dimension:d,expected:'required feature',observed:'visible feature',status:'passed'}))}};
  return {root,batch:{cases:[c]},c};
}
test('合規來源及五项本意檢查可以接入；修改圖片使驗收失效',t=>{
  const {root,batch}=fixture(t);assert.equal(assertBatchReady(root,batch),true);
  fs.writeFileSync(path.join(root,'result.png'),'changed');assert.throws(()=>assertBatchReady(root,batch),/已過期/);
});
test('未驗收、任一項失敗或提示詞變更都阻止上傳',t=>{
  const {root,batch,c}=fixture(t);c.review.status='pending';assert.throws(()=>assertBatchReady(root,batch),/未完成/);
  c.review.status='passed';c.review.criteria[1].status='failed';assert.throws(()=>assertBatchReady(root,batch),/scene/);
  c.review.criteria[1].status='passed';c.applied_prompt='new prompt';assert.throws(()=>assertBatchReady(root,batch),/提示詞驗收已過期/);
});
test('未授權使用者素材及未查證外部授權不能接入',t=>{
  const {root,batch,c}=fixture(t);c.source.provided_by='user';assert.throws(()=>assertBatchReady(root,batch),/類型不一致/);
  c.source.provided_by='assistant';c.source.kind='external_licensed';assert.throws(()=>assertBatchReady(root,batch),/授權網址/);
  c.source.kind='user_provided';c.source.provided_by='user';fs.mkdirSync(path.join(root,'ex product'));fs.writeFileSync(path.join(root,'ex product/ref.png'),'reference');c.reference=c.source.path='ex product/ref.png';assert.throws(()=>assertBatchReady(root,batch),/授權紀錄/);
  c.source.authorization={date:'2026-10-09',directory:'ex product',instruction:'使用這些產品案例進行生圖'};
  assert.equal(assertBatchReady(root,batch),true);
  c.source.provided_by='assistant';c.source.kind='ai_generated';assert.throws(()=>assertBatchReady(root,batch),/如實標記/);
  c.source.provided_by='user';c.source.kind='user_provided';
  c.reference=c.source.path='reference.png';assert.throws(()=>assertBatchReady(root,batch),/授權目錄/);
});
test('技術案例需要額外的事實來源及核對結論',t=>{
  const {root,batch,c}=fixture(t);c.review.requires_factual_check=true;assert.throws(()=>assertBatchReady(root,batch),/未完成核對/);
  c.review.factual_check={status:'passed',notes:'verified against documentation',source_urls:['https://example.org/specification']};assert.equal(assertBatchReady(root,batch),true);
});
