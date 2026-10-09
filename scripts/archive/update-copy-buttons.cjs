const fs=require('fs');
const assert=require('assert/strict');
const file='website/dist/app.js';
let app=fs.readFileSync(file,'utf8');
const icon='<svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></svg>';
const oldLabel="${r.prompt.type==='task_description'?'說明':'提示词'.replace('词','詞')}";
assert.ok(app.includes(oldLabel));
app=app.replace('>複製'+oldLabel+'</button>', '>'+icon+"${r.prompt.type==='task_description'?'複製用途說明':'複製指令'}</button>");
app=app.replace('id="copy-detail">複製內容</button>', 'id="copy-detail">'+icon+"${r.prompt.type==='task_description'?'複製用途說明':'複製指令'}</button>");
app=app.replace('updateDetailBookmark();if(', `$('#detail-content').insertAdjacentHTML('beforeend', '<div class="detail-copy-bar"><button class="primary-button" data-copy-active>${icon}'+(r.prompt.type==='task_description'?'複製用途說明':'複製指令')+'</button><span>複製完整內容，包含已填入的欄位</span></div>');\n  updateDetailBookmark();if(`);
const start=app.indexOf('async function copy(text) {');
const end=app.indexOf('function go(view)',start);
assert.ok(start>=0&&end>start);
app=app.slice(0,start)+`async function copy(text, button) {
  const legacyCopy = () => {
    const field=document.createElement('textarea');field.value=text;field.style.position='fixed';field.style.opacity='0';
    ($('#detail-dialog').open?$('#detail-content'):document.body).append(field);field.focus();field.select();
    const ok=document.execCommand('copy');field.remove();if(!ok)throw new Error('copy');
  };
  try {
    try { if(!navigator.clipboard?.writeText)throw new Error('clipboard');await navigator.clipboard.writeText(text); }
    catch { legacyCopy(); }
    toast('已複製完整指令');
    if(button){const original=button.innerHTML;button.innerHTML='✓ 已複製';button.classList.add('copied');setTimeout(()=>{button.innerHTML=original;button.classList.remove('copied');},2000);}
  } catch { toast('無法自動複製，請選取提示內容後手動複製。'); }
}
`+app.slice(end);
app=app.replace('if(r)copy(r.prompt.text);','if(r)copy(r.prompt.text,b);');
app=app.replace("else if(b.id==='copy-detail'&&selected)copy(applyVariables(selected.prompt,variableValues()));", "else if((b.id==='copy-detail'||'copyActive'in b.dataset)&&selected)copy(applyVariables(selected.prompt,variableValues()),b);");
fs.writeFileSync(file,app);
fs.appendFileSync('website/dist/styles.css',`\n/* 複製指令是卡片與詳情的主要操作。 */
.copy-icon{width:18px;height:18px;flex-shrink:0}
.card-actions .copy-button,.primary-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#c84b0a;color:white;border:0;border-radius:10px;padding:11px 15px;min-height:44px;font-size:14px;font-weight:700;box-shadow:0 4px 12px #c84b0a18}
.card-actions .copy-button:hover,.primary-button:hover{background:#aa3e07}
.card-actions{flex-wrap:wrap}
.detail-copy-bar{position:sticky;bottom:0;background:#ffffffef;border-top:1px solid var(--line);padding:16px 30px;display:flex;align-items:center;gap:16px;backdrop-filter:blur(8px)}
.detail-copy-bar .primary-button{min-width:180px;font-size:16px}
.detail-copy-bar span{font-size:12px;color:var(--muted)}
.card-actions .copy-button.copied,.primary-button.copied{background:#176b55}
@media(max-width:460px){.detail-copy-bar{padding:14px 20px;display:grid;gap:6px}.detail-copy-bar .primary-button{width:100%}.detail-copy-bar span{text-align:center}}
`);
console.log('已更新卡片與詳情的複製指令主按鈕。');
