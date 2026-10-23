const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const media = require('./cloudinary.cjs');
const root = path.resolve(__dirname, '../..');
// 需要本機原始參考圖（ex product/，不納入 GitHub 匯出）的測試在缺少素材時略過。
const localMedia = {skip: !fs.existsSync(path.join(root, 'ex product')) && '缺少本機 ex product 素材'};
const cfg = media.config({CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: 'test-key', CLOUDINARY_API_SECRET: 'test-secret'}, true);
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudinary-media-test-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.writeFileSync(path.join(dir, 'reference.png'), 'reference fixture');
  fs.writeFileSync(path.join(dir, 'one.png'), 'first result fixture');
  fs.writeFileSync(path.join(dir, 'two.png'), 'second result fixture');
  const records = JSON.parse(fs.readFileSync(path.join(root, 'database/image-prompts.json'), 'utf8')).slice(0, 3);
  // Keep the simulated batch independent from real cases already published in the database.
  for (const record of records) {
    record.case_ids = [];
    record.image_links = {cover_url:null, reference_urls:[], result_urls:[], gallery_urls:[]};
  }
  const batch = {id: 'test-batch', cases: [
    {id:'case-one', prompt_id:records[0].id, reference:'reference.png', result:'one.png', applied_prompt:'test prompt'},
    {id:'case-two', prompt_id:records[2].id, reference:'reference.png', result:'two.png', applied_prompt:'test prompt'}
  ]};
  const plan = media.planBatch(dir, batch, cfg);
  return {dir, records, plan, ledgerFile: path.join(dir, 'ledger.json')};
}
function mockUpload(counter) {
  return async (url, request) => {
    counter.count++;
    assert.equal(url, 'https://api.cloudinary.com/v1_1/demo/image/upload');
    const form = request.body;
    assert.equal(form.get('overwrite'), 'false');
    assert.equal(form.get('asset_folder'), 'prompt-atelier/cases');
    assert.ok(form.get('file') instanceof Blob);
    assert.equal(form.get('api_secret'), null);
    const params = Object.fromEntries([...form.entries()].filter(([key]) => !['file', 'signature', 'api_key'].includes(key)));
    assert.equal(form.get('signature'), media.signature(params, 'test-secret'));
    const id = form.get('public_id');
    return {ok:true, json:async () => ({public_id:id, version:123, secure_url:`https://res.cloudinary.com/demo/image/upload/v123/${id}.png`})};
  };
}
test('離線清單共用參考圖，維持案例與指令正確對應', localMedia, () => {
  const batch = media.loadBatch(root, 'database/media-batches/preview-01.json');
  const plan = media.planBatch(root, batch, cfg);
  assert.equal(plan.cases.length, 2);
  assert.equal(plan.assets.length, 3);
  assert.equal(plan.cases[0].assets.reference, plan.cases[1].assets.reference);
  assert.notEqual(plan.cases[0].assets.result, plan.cases[1].assets.result);
});

test('可接入20個案例，拒絕第21個且不寫入資料庫', localMedia, t => {
  const batch = media.readJSON(path.join(root, 'database/media-batches/preview-01.json'));
  batch.cases = Array.from({length:20}, (_,i)=>({...batch.cases[0],id:`boundary-case-${i}`}));
  const file = path.join(root, 'output/media/boundary-test-batch.json');
  t.after(()=>fs.unlinkSync(file));
  media.writeJSON(file,batch);
  assert.equal(media.loadBatch(root,'output/media/boundary-test-batch.json').cases.length,20);
  batch.cases.push({...batch.cases[0],id:'boundary-case-20'});
  media.writeJSON(file,batch);
  assert.throws(()=>media.loadBatch(root,'output/media/boundary-test-batch.json'),/1～20/);
});
test('預設指令不連線、不更動資料庫或網站，也不輸出憑證', localMedia, () => {
  const files = ['database/cases.json', 'database/image-prompts.json', 'website/dist/data/library.json'];
  const before = files.map(file => fs.readFileSync(path.join(root, file)));
  const run = spawnSync(process.execPath, ['scripts/cloudinary-media.cjs'], {cwd:root, encoding:'utf8', env:{...process.env, CLOUDINARY_API_KEY:'fixture-private-key', CLOUDINARY_API_SECRET:'fixture-private-secret'}});
  assert.equal(run.status, 0, run.stderr);
  assert.ok(run.stdout.includes('離線預覽'));
  assert.ok(!run.stdout.includes('fixture-private'));
  files.forEach((file, index) => assert.deepEqual(fs.readFileSync(path.join(root, file)), before[index]));
  assert.ok(!fs.readFileSync(path.join(root, 'output/media/preview-01/plan.json'), 'utf8').includes('fixture-private'));
});
test('缺憑證、錯誤批次 ID 及專案外圖片在上傳前拒絕', t => {
  assert.throws(() => media.config({}, true), /CLOUDINARY_CLOUD_NAME/);
  const {dir} = fixture(t);
  assert.throws(() => media.planBatch(dir, {id:'test',cases:[{reference:'../outside.png'}]}, cfg));
  const batch = media.readJSON(path.join(root, 'database/media-batches/preview-01.json'));
  batch.cases[0].command = '/wrong-command';
  const file = path.join(root, 'output/media/invalid-test-batch.json');
  media.writeJSON(file, batch);
  t.after(() => fs.unlinkSync(file));
  assert.throws(() => media.loadBatch(root, 'output/media/invalid-test-batch.json'), /不一致/);
});
test('部分失敗保存紀錄，重跑只補缺圖；完整重跑不重傳也不重複案例', async t => {
  const {dir, records, plan, ledgerFile} = fixture(t);
  const count = {count:0};
  const good = mockUpload(count);
  let attempt = 0;
  await assert.rejects(media.uploadPlan(dir, plan, cfg, ledgerFile, async (...args) => {
    if (++attempt === 2) return {ok:false,status:401};
    return good(...args);
  }), /HTTP 401/);
  assert.equal(Object.keys(media.readJSON(ledgerFile).assets).length, 1);
  const ledger = await media.uploadPlan(dir, plan, cfg, ledgerFile, good);
  assert.equal(count.count, 3);
  await media.uploadPlan(dir, plan, cfg, ledgerFile, good);
  assert.equal(count.count, 3);
  const first = media.mergeData(records, [], plan, ledger, cfg);
  const second = media.mergeData(first.records, first.cases, plan, ledger, cfg);
  assert.deepEqual(second, first);
  assert.equal(second.cases.length, 2);
  assert.equal(second.records[0].case_ids.length, 1);
  assert.equal(second.records[0].image_links.result_urls.length, 1);
  assert.ok(second.records[0].image_links.cover_url.includes('w_640/f_auto/q_auto'));
  assert.ok(second.cases[0].image_links.result_urls[0].includes('w_1280/f_auto/q_auto'));
  assert.equal(second.records[0].quality.tested, false);
  assert.deepEqual(records[0].case_ids, []);
});
test('不完整紀錄及不可信回傳網址不能寫進網頁', t => {
  const {records, plan} = fixture(t);
  assert.throws(() => media.mergeData(records, [], plan, {assets:{}}, cfg), /尚未完成上傳/);
  assert.throws(() => media.deliveryURL({secure_url:'https://attacker.example/demo/image/upload/test.png'},640), /主機錯誤/);
});
test('legacy fixed folder 上傳不重複加資料夾，逾時不暴露憑證', async t => {
  const {dir, plan} = fixture(t);
  await media.uploadAsset(dir, plan.assets[0], {...cfg,folderMode:'fixed'}, async (url, request) => {
    assert.equal(request.body.get('folder'), cfg.folder);
    assert.equal(request.body.get('asset_folder'), null);
    const id = `${cfg.folder}/${request.body.get('public_id')}`;
    return {ok:true,json:async()=>({public_id:id,version:123,secure_url:`https://res.cloudinary.com/demo/image/upload/v123/${id}.png`})};
  });
  await assert.rejects(media.uploadAsset(dir, plan.assets[0], cfg, async () => {throw new Error(cfg.secret);}), error => !error.message.includes(cfg.secret) && error.message.includes('逾時'));
});
