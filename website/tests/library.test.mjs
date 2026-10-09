import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {searchRecords, applyVariables, safeImageURL} from '../dist/library.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/data/library.json',import.meta.url),'utf8'));
test('文字與圖片在所有搜尋中保持分開',()=>{
  assert.equal(searchRecords(data.records,{type:'text'}).length,202);
  assert.equal(searchRecords(data.records,{type:'image'}).length,642);
  for(const type of ['text','image'])assert.ok(searchRecords(data.records,{type,query:'產品'}).every(r=>r.output_type===type));
});
test('英文代碼容忍斜線、空格與連字號，同名版本保留',()=>{
  const result=searchRecords(data.records,{query:'/first-principles'});
  assert.equal(result.length,3);
  assert.equal(new Set(result.map(r=>r.id)).size,3);
  assert.equal(searchRecords(data.records,{query:'第一性原理'}).length,3);
});
test('分類、場景、目標與收藏可以同時篩選',()=>{
  const r=data.records.find(r=>r.command==='Red Team');
  const filtered=searchRecords(data.records,{category:r.category_ids[0],scene:r.scene_ids[0],goal:r.goal_ids[0],saved:new Set([r.id])});
  assert.deepEqual(filtered.map(r=>r.id),[r.id]);
  assert.equal(searchRecords(data.records,{type:'image',saved:new Set([r.id])}).length,0);
});
test('輸入欄位替換保留原模板與未填欄位',()=>{
  const r=data.records.find(r=>r.id==='src-template99-001');
  const first=r.prompt.variables[0];const before=r.prompt.text;
  const output=applyVariables(r.prompt,{[first.key]:'250'});
  assert.ok(output.includes('250'));
  assert.ok(!output.includes(first.token));
  assert.equal(r.prompt.text,before);
  assert.ok(output.includes(r.prompt.variables[1].token));
});
test('中文括號占位欄位可替換',()=>{
  const r=data.records.find(r=>r.id==='src-thinking20-007');
  assert.equal(applyVariables(r.prompt,{field_1:'樞紐分析表'}),'用 ELI5 解釋樞紐分析表');
});
test('圖片網址拒絕可執行協定',()=>{
  assert.equal(safeImageURL('javascript:alert(1)'),null);
  assert.equal(safeImageURL('data:text/html,<script>'),null);
  assert.equal(safeImageURL('https://images.example.org/result.jpg'),'https://images.example.org/result.jpg');
});
test('所有入口對應存在的分類與成果類型',()=>{
  for(const r of data.records){assert.ok(r.scene_ids.every(id=>data.scenes.some(s=>s.id===id)));assert.ok(r.goal_ids.every(id=>data.goals.some(g=>g.id===id)));assert.ok(r.category_ids.every(id=>data.categories.some(c=>c.id===id&&c.output_type===r.output_type)));}
});
