const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const media = require('./media/cloudinary.cjs');
const {assertBatchReady} = require('./media/case-review.cjs');
const root = path.resolve(__dirname, '..');

async function main() {
  const args = process.argv.slice(2);
  const modes = args.filter(arg => ['--preview', '--upload'].includes(arg));
  if (modes.length > 1) throw new Error('請選擇 --preview 或 --upload');
  let batchPath = 'database/media-batches/preview-01.json';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('--batch 缺少相對路徑');
      batchPath = args[++i];
    } else if (!['--preview', '--upload'].includes(args[i])) throw new Error('未知參數；支援 --preview、--upload、--batch');
  }
  const upload = modes[0] === '--upload';
  if (fs.existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));
  const cfg = media.config(process.env, upload);
  const batch = media.loadBatch(root, batchPath);
  if (upload) assertBatchReady(root, batch); // Must pass before any network request or database mutation.
  const plan = media.planBatch(root, batch, cfg);
  const output = path.join(root, 'output/media', batch.id);
  const ledgerFile = path.join(root, 'database/media-upload-ledger.json');
  const ledger = fs.existsSync(ledgerFile) ? media.readJSON(ledgerFile) : {assets: {}};
  const publicPlan = {
    mode: upload ? 'upload' : 'preview', batch_id: plan.batch_id,
    cloud_name: plan.cloud_name, folder: plan.folder, folder_mode: plan.folder_mode,
    case_count: plan.cases.length, unique_image_count: plan.assets.length,
    assets: plan.assets.map(asset => ({...asset, action: ledger.assets[asset.key] ? 'reuse' : 'upload'})),
    placements: plan.cases.map(c => ({case_id: c.id, prompt_id: c.prompt_id, command: c.command, title: c.title,
      reference: c.reference, result: c.result,
      locations: ['指令卡片：成果封面（640px）', '指令詳情：參考圖與成果（1280px）', '成果案例：封面、成果、完整提示詞'],
      applied_prompt: c.applied_prompt})),
    publishes_website: false
  };
  media.writeJSON(path.join(output, 'plan.json'), publicPlan);
  console.log(`${upload ? '上傳' : '離線預覽'}：${plan.cases.length} 個案例，${plan.assets.length} 張不同圖片（共用參考圖只存一次）。`);
  for (const c of plan.cases) console.log(`${c.command} → ${c.title}\n  指令封面／詳情／成果案例：${c.result}`);
  console.log(`對應清單：output/media/${batch.id}/plan.json`);
  if (!upload) {
    console.log('未連線、未上傳、未修改資料庫或網站。下一階段設定 .env 後才使用 media:upload。');
    return;
  }
  // Preflight database ownership before any external uploads.
  const recordsFile = path.join(root, 'database/image-prompts.json');
  const casesFile = path.join(root, 'database/cases.json');
  const records = media.readJSON(recordsFile);
  const cases = media.readJSON(casesFile);
  for (const c of plan.cases) {
    const existing = cases.find(item => item.id === c.id);
    if (existing && existing.extensions?.media_batch_id !== plan.batch_id) throw new Error('案例 ID 已被其他資料使用');
  }
  const complete = await media.uploadPlan(root, plan, cfg, ledgerFile);
  const merged = media.mergeData(records, cases, plan, complete, cfg);
  fs.mkdirSync(path.join(output, 'backup'), {recursive: true});
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const file of [recordsFile, casesFile]) fs.copyFileSync(file, path.join(output, 'backup', `${stamp}-${path.basename(file)}`));
  media.writeJSON(casesFile, merged.cases);
  media.writeJSON(recordsFile, merged.records);
  for (const script of ['database/validate-database.cjs', 'website/sync-data.cjs']) {
    const check = spawnSync(process.execPath, [path.join(root, script)], {cwd: root, stdio: 'inherit'});
    if (check.status !== 0) throw new Error('資料已儲存，但驗證或建置未完成；修正後可重跑，不必重傳圖片。');
  }
  console.log('Cloudinary 圖片已同步到本機網頁展示位置。公開網址需另外執行網站部署。');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
