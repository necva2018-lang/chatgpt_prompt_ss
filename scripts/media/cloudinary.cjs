const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(temp, file);
}
function localFile(root, relative) {
  assert.equal(typeof relative, 'string', '圖片路徑必須是字串');
  assert.ok(!path.isAbsolute(relative), '圖片必須使用專案相對路徑');
  const target = fs.realpathSync(path.resolve(root, relative));
  const realRoot = fs.realpathSync(root);
  const inside = path.relative(realRoot, target);
  assert.ok(inside && !inside.startsWith('..') && !path.isAbsolute(inside), '圖片必須位於專案內');
  assert.ok(fs.statSync(target).isFile(), '圖片不是檔案');
  assert.ok(/\.(png|jpe?g|webp)$/i.test(target), '只支援 PNG、JPEG、WebP');
  return target;
}
function config(env = process.env, requireCredentials = false) {
  const cloud = env.CLOUDINARY_CLOUD_NAME || '';
  const folder = env.CLOUDINARY_FOLDER || 'prompt-atelier/cases';
  const folderMode = env.CLOUDINARY_FOLDER_MODE || 'dynamic';
  assert.ok(!cloud || /^[a-zA-Z0-9_-]+$/.test(cloud), 'Cloud name 格式錯誤');
  assert.ok(/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(folder), '資料夾請使用英文、數字、斜線、底線或連字號');
  assert.ok(['dynamic', 'fixed'].includes(folderMode), 'Folder mode 必須是 dynamic 或 fixed');
  if (requireCredentials) {
    for (const name of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
      assert.ok(env[name]?.trim(), `缺少 ${name}；請填入本機 .env`);
    }
  }
  return {cloud, folder, folderMode, key: env.CLOUDINARY_API_KEY, secret: env.CLOUDINARY_API_SECRET};
}
function loadBatch(root, batchPath) {
  const batch = readJSON(localFileJSON(root, batchPath));
  assert.equal(batch.version, 1, '不支援的批次版本');
  assert.ok(/^[a-z0-9-]+$/.test(batch.id), '批次 ID 格式錯誤');
  assert.ok(Array.isArray(batch.cases) && batch.cases.length > 0 && batch.cases.length <= 20, '每批限 1～20 個案例');
  const records = readJSON(path.join(root, 'database/image-prompts.json'));
  const seen = new Set();
  for (const c of batch.cases) {
    assert.ok(/^[a-z0-9-]+$/.test(c.id) && !seen.has(c.id), '案例 ID 格式錯誤或重複');
    seen.add(c.id);
    const record = records.find(r => r.id === c.prompt_id);
    assert.ok(record && record.command === c.command, '指令 ID 與代碼不一致');
    for (const field of ['title', 'description', 'applied_prompt', 'result_text']) assert.ok(c[field]?.trim(), `缺少 ${field}`);
    for (const role of ['reference', 'result']) localFile(root, c[role]);
  }
  return batch;
}
function localFileJSON(root, relative) {
  assert.ok(typeof relative === 'string' && !path.isAbsolute(relative), '清單必須使用專案相對路徑');
  const file = fs.realpathSync(path.resolve(root, relative));
  const inside = path.relative(fs.realpathSync(root), file);
  assert.ok(inside && !inside.startsWith('..') && !path.isAbsolute(inside) && file.endsWith('.json'), '清單必須是專案內 JSON');
  return file;
}
function planBatch(root, batch, cfg) {
  const assets = new Map();
  const cases = batch.cases.map(c => {
    const mapped = {};
    for (const role of ['reference', 'result']) {
      const bytes = fs.readFileSync(localFile(root, c[role]));
      const sha256 = hash(bytes);
      const publicId = `${cfg.folder}/${role}-${sha256}`;
      const key = `${cfg.cloud || 'UNCONFIGURED'}:${publicId}`;
      if (!assets.has(key)) assets.set(key, {key, role, file: c[role], sha256, bytes: bytes.length, public_id: publicId});
      mapped[role] = key;
    }
    return {...c, assets: mapped};
  });
  return {batch_id: batch.id, cloud_name: cfg.cloud || null, folder: cfg.folder, folder_mode: cfg.folderMode, assets: [...assets.values()], cases};
}
function signature(params, secret) {
  const text = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  return crypto.createHash('sha256').update(text + secret).digest('hex');
}
function deliveryURL(receipt, width) {
  const url = new URL(receipt.secure_url);
  assert.equal(url.protocol, 'https:', 'Cloudinary 回傳網址必須是 HTTPS');
  assert.equal(url.hostname, 'res.cloudinary.com', 'Cloudinary 回傳網址主機錯誤');
  assert.ok(url.pathname.includes('/image/upload/'), '圖片 delivery URL 格式錯誤');
  return url.href.replace('/image/upload/', `/image/upload/c_limit,w_${width}/f_auto/q_auto/`);
}
function validateReceipt(receipt, asset, cfg) {
  assert.equal(receipt.sha256, asset.sha256, '上傳紀錄雜湊不一致');
  assert.equal(receipt.public_id, asset.public_id, '上傳紀錄 ID 不一致');
  assert.ok(Number.isInteger(receipt.version) && receipt.version > 0, '缺少圖片版本');
  deliveryURL(receipt, 640);
  const prefix = `/${cfg.cloud}/image/upload/v${receipt.version}/`;
  const url = new URL(receipt.secure_url);
  assert.ok(url.pathname.startsWith(prefix), '上傳紀錄 cloud 或版本不一致');
  const resource = decodeURIComponent(url.pathname.slice(prefix.length));
  assert.ok(resource.startsWith(`${asset.public_id}.`), '上傳紀錄圖片路徑不一致');
}
async function uploadAsset(root, asset, cfg, fetchImpl = fetch) {
  const bytes = fs.readFileSync(localFile(root, asset.file));
  assert.equal(hash(bytes), asset.sha256, '圖片在預覽後已變更，請重跑預覽');
  const params = {timestamp: String(Math.floor(Date.now() / 1000)), overwrite: 'false'};
  if (cfg.folderMode === 'dynamic') {
    params.asset_folder = cfg.folder;
    params.public_id = asset.public_id;
  } else {
    params.folder = cfg.folder;
    params.public_id = asset.public_id.slice(cfg.folder.length + 1);
  }
  const form = new FormData();
  for (const [key, value] of Object.entries(params)) form.set(key, value);
  form.set('signature', signature(params, cfg.secret));
  form.set('api_key', cfg.key);
  const mime = /\.png$/i.test(asset.file) ? 'image/png' : /\.webp$/i.test(asset.file) ? 'image/webp' : 'image/jpeg';
  form.set('file', new Blob([bytes], {type: mime}), path.basename(asset.file));
  let response;
  try {
    response = await fetchImpl(`https://api.cloudinary.com/v1_1/${cfg.cloud}/image/upload`, {method: 'POST', body: form, signal: AbortSignal.timeout(60000)});
  } catch { throw new Error('Cloudinary 連線失敗或逾時；重跑會沿用同一圖片 ID，不覆寫既有圖片。'); }
  if (!response.ok) throw new Error(`Cloudinary 上傳失敗（HTTP ${response.status}）；請檢查本機憑證與資料夾模式。`);
  let result;
  try { result = await response.json(); } catch { throw new Error('Cloudinary 回應不是有效 JSON'); }
  const receipt = {sha256: asset.sha256, public_id: result.public_id, secure_url: result.secure_url, version: result.version, asset_id: result.asset_id || null, uploaded_at: new Date().toISOString()};
  validateReceipt(receipt, asset, cfg);
  return receipt;
}
async function uploadPlan(root, plan, cfg, ledgerFile, fetchImpl = fetch) {
  const ledger = fs.existsSync(ledgerFile) ? readJSON(ledgerFile) : {version: 1, assets: {}};
  assert.equal(ledger.version, 1, '不支援的上傳紀錄版本');
  for (const asset of plan.assets) {
    if (ledger.assets[asset.key]) {
      validateReceipt(ledger.assets[asset.key], asset, cfg);
      continue;
    }
    ledger.assets[asset.key] = await uploadAsset(root, asset, cfg, fetchImpl);
    writeJSON(ledgerFile, ledger); // Save after each success so interrupted batches can resume.
  }
  return ledger;
}
function mergeData(records, existingCases, plan, ledger, cfg) {
  const nextRecords = structuredClone(records);
  const nextCases = structuredClone(existingCases);
  for (const c of plan.cases) {
    const reference = ledger.assets[c.assets.reference];
    const result = ledger.assets[c.assets.result];
    for (const role of ['reference', 'result']) {
      const asset = plan.assets.find(a => a.key === c.assets[role]);
      assert.ok(ledger.assets[asset.key], '有圖片尚未完成上傳，停止同步');
      validateReceipt(ledger.assets[asset.key], asset, cfg);
    }
    const links = {cover_url: deliveryURL(result, 640), reference_urls: [deliveryURL(reference, 1280)], result_urls: [deliveryURL(result, 1280)], gallery_urls: []};
    const generated = {
      id: c.id, title: c.title, output_type: 'image',
      input: {text: `參考素材：${c.reference}`, media: [{role: 'reference', path: c.reference}]},
      result: {text: c.result_text}, card: {headline: c.description}, image_links: links,
      steps: [{order: 1, prompt_id: c.prompt_id, purpose: c.description, applied_prompt: c.applied_prompt}],
      verification: {status: 'generated', notes: 'AI 生成示範；不代表真實品牌合作或指令的通用效果保證。', intent_review: c.review || null},
      extensions: {media_batch_id: plan.batch_id, generator: 'built-in imagegen', result_public_id: result.public_id, source: c.source || null}
    };
    const index = nextCases.findIndex(item => item.id === c.id);
    if (index >= 0) {
      assert.equal(nextCases[index].extensions?.media_batch_id, plan.batch_id, '案例 ID 已被其他資料使用');
      nextCases[index] = {...nextCases[index], ...generated, verification: nextCases[index].verification};
    } else nextCases.push(generated);
    const record = nextRecords.find(r => r.id === c.prompt_id);
    assert.ok(record, '找不到指令紀錄');
    if (!record.case_ids.includes(c.id)) record.case_ids.push(c.id);
    record.image_links.cover_url ||= links.cover_url;
    for (const role of ['reference_urls', 'result_urls']) for (const url of links[role]) {
      if (!record.image_links[role].includes(url)) record.image_links[role].push(url);
    }
  }
  return {records: nextRecords, cases: nextCases};
}
module.exports = {config, loadBatch, planBatch, signature, deliveryURL, uploadAsset, uploadPlan, mergeData, readJSON, writeJSON};
