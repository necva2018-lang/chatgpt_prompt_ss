import {searchRecords, applyVariables, safeImageURL} from './library.js';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE_KEY = 'prompt-atelier:saved:v1';
const state = {type:'text',view:'library',query:'',category:'',scene:'',goal:'',sort:'recommended',limit:18};
let data, selected, storageAvailable = true, saved = new Set(), toastTimer;
try { const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (Array.isArray(raw)) saved = new Set(raw.filter(id => typeof id === 'string')); } catch { storageAvailable = false; }
const titles = {library:['THE PROMPT LIBRARY','你想完成什麼？','找到合適的方法，讓下一步更有方向。'],saved:['YOUR COLLECTION','留給下一個好想法','把常用的方法收藏起來，下次更快找到。'],cases:['INSPIRATION GALLERY','從成果，找到靈感','看見完成目標，也看懂指令如何發揮作用。'],scenes:['EXPLORE BY CONTEXT','從你的使用場景出發','找到與工作、創作和學習相關的方法。'],goals:['EXPLORE BY GOAL','你想讓什麼更好？','選一個目標，探索能幫上忙的指令。']};
const label = collection => ids => ids.map(id => collection.find(item => item.id === id)?.name).filter(Boolean);
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent=message; $('#toast').hidden=false; toastTimer=setTimeout(()=>$('#toast').hidden=true,3000); }
function persistSaved() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved])); } catch { storageAvailable=false; } $('#saved-count').textContent=saved.size; }
function toggleSaved(id) {
  const added = !saved.has(id); added ? saved.add(id) : saved.delete(id); persistSaved(); render();
  if (selected?.id === id) updateDetailBookmark();
  toast(storageAvailable ? (added?'已加入收藏':'已移除收藏') : '收藏暫存於本次瀏覽；瀏覽器未允許儲存。');
}
async function copy(text, button, kind='指令') {
  const legacyCopy = () => {
    const field=document.createElement('textarea');field.value=text;field.style.position='fixed';field.style.opacity='0';
    ($('#detail-dialog').open?$('#detail-content'):document.body).append(field);field.focus();field.select();
    const ok=document.execCommand('copy');field.remove();if(!ok)throw new Error('copy');
  };
  try {
    try { if(!navigator.clipboard?.writeText)throw new Error('clipboard');await navigator.clipboard.writeText(text); }
    catch { legacyCopy(); }
    toast('已複製'+kind+'：'+(kind==='指令'?text:'完整提示內容'));
    if(button){const original=button.innerHTML;button.innerHTML='✓ 已複製';button.classList.add('copied');setTimeout(()=>{button.innerHTML=original;button.classList.remove('copied');},2000);}
  } catch { toast('無法自動複製，請選取提示內容後手動複製。'); }
}
function go(view) { state.view=view;state.category='';state.scene='';state.goal='';state.query='';state.limit=18;$('#search').value='';render(); }
function changeType(type) { state.type=type;state.category='';state.scene='';state.goal='';state.limit=18;render(); }
function filtered() { return searchRecords(data.records,{...state,saved:state.view==='saved'?saved:null}); }
function promptCard(r) {
  const image = safeImageURL(r.image_links?.cover_url) || safeImageURL(r.image_links?.result_urls?.[0]);
  const scene = label(data.scenes)(r.scene_ids)[0]; const goal=label(data.goals)(r.goal_ids)[0];
  const preview = image ? `<img src="${esc(image)}" alt="${esc(r.title)}成果展示" loading="lazy">` : r.output_type==='text' ? `<span class="preview-label">${r.prompt.type==='task_description'?'用途說明':'提示詞預覽'}</span><p class="preview-text">${esc(r.prompt.text.replace(/\n+/g,' '))}</p>` : `<span class="preview-label">IMAGE PROMPT</span><div class="preview-code">${esc(r.command)}</div><span class="image-note">案例圖片待補</span>`;
  return `<article class="prompt-card"><div class="card-preview">${preview}</div><div class="card-body"><div class="card-meta"><span class="type-badge ${r.output_type}">${r.output_type==='text'?'文字成果':'圖片成果'}</span><button class="bookmark" data-save="${esc(r.id)}" aria-pressed="${saved.has(r.id)}" aria-label="${saved.has(r.id)?'取消收藏':'收藏'}：${esc(r.title)}">${saved.has(r.id)?'♥':'♡'}</button></div><h3>${esc(r.title)}</h3><p class="card-command">${esc(r.command)}</p><p class="card-summary">${esc(r.summary)}</p><div class="card-tags">${scene?`<span>${esc(scene)}</span>`:''}${goal?`<span>${esc(goal)}</span>`:''}</div><div class="card-actions"><button data-detail="${esc(r.id)}">查看用法</button><button class="copy-button" data-copy="${esc(r.id)}"><svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></svg>複製指令</button></div></div></article>`;
}
function empty(title, message, action='重設篩選') { return `<article class="state-card"><span class="state-symbol" aria-hidden="true">✧</span><h3>${esc(title)}</h3><p>${esc(message)}</p><button class="outline-button" data-reset>${esc(action)}</button></article>`; }
function renderCategories() {
  const counts = new Map();for(const r of data.records.filter(r=>r.output_type===state.type))for(const id of r.category_ids)counts.set(id,(counts.get(id)||0)+1);
  const merged = new Map();
  for(const c of data.categories.filter(c=>c.output_type===state.type)){const short=c.name.replace(/（.*$/,'');if(!merged.has(short))merged.set(short,[]);merged.get(short).push(c.id);}
  // 原分類保持獨立 ID，列表保留各來源版本的分類，避免錯誤合併。
  $('#categories').innerHTML = `<button class="category-item ${!state.category?'active':''}" data-category="">全部分類 <span>${data.records.filter(r=>r.output_type===state.type).length}</span></button>` + data.categories.filter(c=>c.output_type===state.type).map(c=>`<button class="category-item ${state.category===c.id?'active':''}" data-category="${esc(c.id)}">${esc(c.name.replace(/（.*$/,''))}<span>${counts.get(c.id)||0}</span></button>`).join('');
}
function render() {
  if(!data)return;
  const text=state.type==='text', n=data.records.filter(r=>r.output_type===state.type).length;
  const [eyebrow,title,description]=titles[state.view];$('#eyebrow').textContent=eyebrow;$('#page-title').textContent=title;$('#page-description').textContent=description;
  $('#total-number').textContent=n;$('#total-label').textContent=text?'文字指令':'圖片指令';$('#saved-count').textContent=saved.size;
  document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===state.view);b.setAttribute('aria-current',b.dataset.view===state.view?'page':'false');});
  document.querySelectorAll('[data-type]').forEach(b=>{b.classList.toggle('selected',b.dataset.type===state.type);b.setAttribute('aria-pressed',String(b.dataset.type===state.type));});
  const facets=['scenes','goals'].includes(state.view);const cases=state.view==='cases';
  $('#category-section').hidden=facets||cases;$('#search-form').hidden=facets||cases;$('#quick-tags').hidden=facets||cases;$('#sort-control').hidden=facets||cases;
  const quick=text?['第一性原理','找出盲點','改寫','教學','/socratic']:['產品','攝影','解說','材質','/cutaway'];
  $('#quick-tags').innerHTML='<span>試試搜尋</span>'+quick.map(q=>`<button data-query="${esc(q)}">${esc(q)}</button>`).join('');
  renderCategories();$('#grid').setAttribute('aria-busy','false');$('#load-section').hidden=true;$('#active-filters').innerHTML='';
  if(facets){
    const items=state.view==='scenes'?data.scenes:data.goals;const key=state.view==='scenes'?'scene_ids':'goal_ids';
    $('#section-title').textContent=state.view==='scenes'?'選擇使用場景':'選擇完成目標';$('#result-count').textContent=`${items.length} 個入口`;
    $('#grid').innerHTML=items.map(item=>{const count=data.records.filter(r=>r.output_type===state.type&&r[key].includes(item.id)).length;return `<button class="facet-card" data-facet="${esc(item.id)}" data-kind="${state.view}"><span class="facet-mark">${esc(item.mark)}</span><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><span class="facet-count">${count} 個${text?'文字':'圖片'}指令</span></button>`;}).join('');
    return;
  }
  if(cases){
    const results=data.cases.filter(c=>c.output_type===state.type);$('#section-title').textContent=text?'文字靈感案例':'圖片靈感案例';$('#result-count').textContent=`${results.length} 個案例`;
    $('#grid').innerHTML=results.length?results.map(caseCard).join(''):empty('案例正在準備中',text?'完整案例將呈現原始內容、完成版本，以及每個加強指令的作用。先探索可以使用的方法。':'圖片案例將在生成與上傳後加入。你可以先探索風格、用途與圖像指令。','先逛指令');return;
  }
  const results=filtered();const chips=[];
  if(state.query)chips.push(['query',state.query]);if(state.category)chips.push(['category',data.categories.find(c=>c.id===state.category)?.name.replace(/（.*$/,'')]);if(state.scene)chips.push(['scene',data.scenes.find(s=>s.id===state.scene)?.name]);if(state.goal)chips.push(['goal',data.goals.find(g=>g.id===state.goal)?.name]);
  $('#active-filters').innerHTML=chips.map(([field,name])=>`<button class="filter-chip" data-clear="${field}">${esc(name)} ×</button>`).join('');
  $('#section-title').textContent=state.view==='saved'?'我的收藏':chips.length?'符合你的指令':`探索${text?'文字':'圖片'}指令`;
  $('#result-count').textContent=`${results.length} 筆`;
  $('#grid').innerHTML=results.length?results.slice(0,state.limit).map(promptCard).join(''):state.view==='saved'?empty('留一個方法給未來的自己',`目前沒有符合條件的${text?'文字':'圖片'}收藏。點指令卡片上的愛心即可收藏。`,'探索指令'):empty('還沒找到相符的指令','試著換一個關鍵字，或移除部分篩選條件。');
  $('#load-section').hidden=!results.length;$('#shown-count').textContent=`已顯示 ${Math.min(state.limit,results.length)} / ${results.length} 筆`;$('#load-more').hidden=state.limit>=results.length;
}
function caseCard(c) { const url=safeImageURL(c.image_links?.cover_url)||safeImageURL(c.image_links?.result_urls?.[0]);return `<article class="prompt-card"><div class="card-preview">${url?`<img src="${esc(url)}" alt="${esc(c.title)}" loading="lazy">`:`<span class="preview-label">${c.verification?.status==='tested'?'實測案例':'示範案例'}</span><p class="preview-text">${esc(c.card?.excerpt||c.result?.text||'')}</p>`}</div><div class="card-body"><span class="type-badge">${c.output_type==='text'?'文字成果':'圖片成果'}</span><h3>${esc(c.title)}</h3><p class="card-summary">${esc(c.card?.headline||'')}</p><div class="card-actions"><button data-case="${esc(c.id)}">查看案例</button></div></div></article>`; }
function openDetail(id) {
  selected=data.records.find(r=>r.id===id);if(!selected)return;
  const r=selected;const scenes=label(data.scenes)(r.scene_ids),goals=label(data.goals)(r.goal_ids);
  const source=r.source_refs.map(ref=>`${data.sources.find(s=>s.id===ref.source_id)?.title||ref.source_id} · 第 ${ref.item_number} 筆`).join('\n');
  const fields=r.prompt.variables.map(v=>`<label>${esc(v.label)}<textarea data-variable="${esc(v.key)}" placeholder="填入${esc(v.label)}，或保留欄位稍後替換"></textarea></label>`).join('');
  const warn=[];if(r.prompt.type==='task_description')warn.push('這筆來源提供用途說明，尚未提供完整提示詞模板。');if(r.quality.review_flags.includes('translation_unreviewed'))warn.push('中文說明尚未逐筆校對，圖片指示保留原英文。');
  const images=[...(r.image_links?.reference_urls||[]),...(r.image_links?.result_urls||[]),...(r.image_links?.gallery_urls||[])].map(safeImageURL).filter(Boolean);
  const related=data.records.filter(item=>item.id!==r.id&&item.output_type===r.output_type&&(r.related_ids.includes(item.id)||item.duplicate_group_ids.some(id=>r.duplicate_group_ids.includes(id)))).slice(0,5);
  $('#detail-content').innerHTML=`<div class="detail-top"><button class="close-dialog" aria-label="關閉指令詳情" data-close>×</button><span class="type-badge ${r.output_type}">${r.output_type==='text'?'文字成果':'圖片成果'}</span><h2 id="detail-title">${esc(r.title)}</h2><p class="card-command">${esc(r.command)}</p><p>${esc(r.summary)}</p></div><div class="detail-body"><section class="detail-card"><div class="card-title-row"><h3>適用場景與目標</h3><button class="bookmark" id="detail-bookmark" data-save="${esc(r.id)}"></button></div><div class="detail-tags">${[...scenes,...goals].map(name=>`<span>${esc(name)}</span>`).join('')}</div>${r.usage.input_requirements.map(item=>`<p>所需素材：${esc(item.description)}</p>`).join('')}</section><section class="detail-card"><div class="card-title-row"><h3>${r.prompt.type==='task_description'?'來源用途說明':'可複製提示詞'}</h3><button class="primary-button" id="copy-detail"><svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></svg>複製提示詞</button></div>${fields?`<div class="detail-fields">${fields}</div>`:''}<pre id="prompt-preview">${esc(r.prompt.text)}</pre>${warn.map(w=>`<p class="detail-warning">${esc(w)}</p>`).join('')}</section>${r.examples.length?`<section class="detail-card"><h3>使用範例</h3>${r.examples.map(ex=>`<pre>${esc(ex.text)}</pre>`).join('<br>')}</section>`:''}${images.length?`<section class="detail-card"><h3>案例圖片</h3><div class="detail-gallery">${images.map((url,i)=>`<img src="${esc(url)}" alt="${esc(r.title)}案例圖片 ${i+1}" loading="lazy">`).join('')}</div></section>`:`<div class="detail-case-empty"><strong>成果案例待補</strong><span>案例將呈現完成成果，以及這個指令在過程中的作用。</span></div>`}${related.length?`<section class="detail-card"><h3>其他來源版本</h3>${related.map(item=>`<p><button class="quiet-button" data-detail="${esc(item.id)}">${esc(item.title)} · ${esc(item.command)}</button></p>`).join('')}</section>`:''}<section class="detail-card"><h3>資料來源</h3><p class="source-note">${esc(source).replace(/\n/g,'<br>')}</p><p class="source-note">${r.quality.tested?'已有實測紀錄':'尚未實測'} · 短名稱是提示標籤，使用時請搭配你的情境與素材。</p></section></div>`;
  $('#detail-content').insertAdjacentHTML('beforeend', '<div class="detail-copy-bar"><button class="primary-button" data-copy-active><svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"/></svg>'+'複製指令'+'</button><span>'+esc(r.command)+'</span></div>');
  updateDetailBookmark();if(!$('#detail-dialog').open)$('#detail-dialog').showModal();else $('#detail-dialog').scrollTop=0;
}
function updateDetailBookmark(){const b=$('#detail-bookmark');if(!b||!selected)return;b.textContent=saved.has(selected.id)?'♥':'♡';b.setAttribute('aria-pressed',String(saved.has(selected.id)));b.setAttribute('aria-label',saved.has(selected.id)?'取消收藏':'收藏此指令');}
function variableValues(){return Object.fromEntries([...document.querySelectorAll('[data-variable]')].map(el=>[el.dataset.variable,el.value]));}
function openCase(id){const c=data.cases.find(c=>c.id===id);if(!c)return;selected=null;const urls=(c.image_links?.result_urls||[]).map(safeImageURL).filter(Boolean);$('#detail-content').innerHTML=`<div class="detail-top"><button class="close-dialog" data-close aria-label="關閉案例">×</button><span class="type-badge">${c.verification?.status==='tested'?'實測案例':'示範案例'}</span><h2 id="detail-title">${esc(c.title)}</h2></div><div class="detail-body"><section class="detail-card"><h3>原始素材</h3><pre>${esc(c.input?.text||'')}</pre></section><section class="detail-card"><h3>完成成果</h3><pre>${esc(c.result?.text||'')}</pre>${urls.map(url=>`<img src="${esc(url)}" alt="${esc(c.title)}成果" style="max-width:100%">`).join('')}</section>${(c.steps||[]).map(step=>`<section class="detail-card"><h3>步驟 ${esc(step.order)} · ${esc(data.records.find(r=>r.id===step.prompt_id)?.command||'')}</h3><p>${esc(step.purpose||'')}</p><pre>${esc(step.applied_prompt||'')}</pre>${step.observed_effect?`<p>${esc(step.observed_effect)}</p>`:''}</section>`).join('')}</div>`;$('#detail-dialog').showModal();}
document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b||!data)return;
  if(b.dataset.view)go(b.dataset.view);
  else if(b.dataset.type)changeType(b.dataset.type);
  else if('category'in b.dataset){state.category=b.dataset.category;state.view='library';state.limit=18;render();}
  else if(b.dataset.query){state.query=b.dataset.query;$('#search').value=state.query;state.limit=18;render();}
  else if(b.dataset.facet){state[b.dataset.kind==='scenes'?'scene':'goal']=b.dataset.facet;state.view='library';state.limit=18;render();}
  else if(b.dataset.clear){state[b.dataset.clear]='';if(b.dataset.clear==='query')$('#search').value='';state.limit=18;render();}
  else if(b.dataset.save)toggleSaved(b.dataset.save);
  else if(b.dataset.detail)openDetail(b.dataset.detail);
  else if(b.dataset.case)openCase(b.dataset.case);
  else if(b.dataset.copy){const r=data.records.find(r=>r.id===b.dataset.copy);if(r)copy(r.command,b);}
  else if('close'in b.dataset)$('#detail-dialog').close();
  else if('reset'in b.dataset)go('library');
  else if(b.id==='load-more'){state.limit+=18;render();}
  else if(b.id==='clear-category'){state.category='';state.limit=18;render();}
  else if('copyActive'in b.dataset&&selected)copy(selected.command,b);
  else if(b.id==='copy-detail'&&selected)copy(applyVariables(selected.prompt,variableValues()),b,'提示內容');
});
$('#search-form').addEventListener('submit',event=>{event.preventDefault();state.query=$('#search').value;state.limit=18;render();});
let searchTimer;$('#search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.query=$('#search').value;state.limit=18;render();},120);});
$('#sort').addEventListener('change',()=>{state.sort=$('#sort').value;state.limit=18;render();});
$('#detail-content').addEventListener('input',event=>{if(event.target.matches('[data-variable]')&&selected)$('#prompt-preview').textContent=applyVariables(selected.prompt,variableValues());});
$('#detail-dialog').addEventListener('click',event=>{if(event.target===$('#detail-dialog')){const rect=event.target.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)event.target.close();}});
document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('#detail-dialog').open){event.preventDefault();if(['cases','scenes','goals'].includes(state.view))go('library');$('#search').focus();}});
$('#grid').addEventListener('error',event=>{if(event.target.tagName==='IMG'){event.target.replaceWith(Object.assign(document.createElement('span'),{className:'image-note',textContent:'圖片暫時無法載入'}));}},true);
async function init(){
  try {const response=await fetch('./data/library.json');if(!response.ok)throw new Error('data');data=await response.json();const ids=new Set(data.records.map(r=>r.id));saved=new Set([...saved].filter(id=>ids.has(id)));render();registerTools();}
  catch{ $('#grid').setAttribute('aria-busy','false');$('#result-count').textContent='載入失敗';$('#grid').innerHTML='<article class="state-card"><h3>資料暫時無法載入</h3><p>請重新整理頁面再試一次。</p><button class="outline-button" id="retry-load">重新載入</button></article>';$('#retry-load').addEventListener('click',init); }
}
function registerTools(){
  const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  try{Promise.resolve(context.registerTool({name:'search_prompt_library',title:'搜尋指令',description:'搜尋並顯示指定成果類型的指令卡片。',inputSchema:{type:'object',properties:{query:{type:'string'},output_type:{enum:['text','image']}},required:['query','output_type'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(!input||typeof input.query!=='string'||!['text','image'].includes(input.output_type))throw new Error('需要 query 字串與 text/image 成果類型。');go('library');state.type=input.output_type;state.query=input.query;$('#search').value=input.query;render();return {total:filtered().length,results:filtered().slice(0,12).map(r=>({id:r.id,title:r.title,command:r.command}))};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
}
init();
