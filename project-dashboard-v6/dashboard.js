const SNAPSHOT='./dashboard-snapshot.json',CATALOG='./project-catalog.json',ROADMAP='./project-roadmap.json',HISTORY='./dashboard-history.json';
function fmt(v){return typeof v==='number'?Math.round(v)+'%':'—'}
function featureMap(l){const m=new Map();(l?.features||[]).forEach(f=>m.set(f.id,f));return m}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function evidenceText(state){return state==='FRESH'?'資料最新':state==='STALE'?'資料待更新':'資料待確認'}
function checkText(v){return v==='success'?'通過':v==='failure'?'未通過':v==='cancelled'?'已取消':'確認中'}
function dayCount(deadline){const end=new Date(deadline||'2026-10-15T23:59:59+08:00');const d=Math.max(0,Math.ceil((end-new Date())/86400000));document.querySelector('#days').textContent=d+' 天';return d}
function renderKpis(lines,days){
  const c=lines.find(x=>x.key==='codex'),a=lines.find(x=>x.key==='antigravity');
  const total=Math.max(c?.progressEngine?.catalogFeatureCount||0,a?.progressEngine?.catalogFeatureCount||0),verified=Math.min(c?.progressEngine?.verifiedFeatureCount||0,a?.progressEngine?.verifiedFeatureCount||0);
  document.querySelector('#common').textContent=total?`${verified}/${total}`:'—';
  document.querySelector('#codexScore').textContent=fmt(c?.engineeringProgress);document.querySelector('#antScore').textContent=fmt(a?.engineeringProgress);
  document.querySelector('#codexEvidence').textContent=evidenceText(c?.evidence?.state);document.querySelector('#antEvidence').textContent=evidenceText(a?.evidence?.state);
  const high=lines.flatMap(l=>l.risks||[]).filter(r=>r.severity==='高').length;document.querySelector('#riskCount').textContent=high;
  const state=lines.some(l=>l.evidence?.state!=='FRESH')?'資料待更新':high?'有重大阻塞':days<30?'需加速':'持續推進';
  const e=document.querySelector('#deliveryRisk');e.textContent=state;e.className='value '+(state==='持續推進'?'ok':state==='需加速'?'warn':'bad');
}
function renderLines(snapshot){
  const lines=snapshot.lines;
  document.querySelector('#lineStatus').innerHTML=lines.map(l=>`<div class="status"><span><b>${esc(l.label)}</b><br><small class="muted">自動檢查：${checkText(l.ci)} · 待合併工作：${l.openPrCount??'—'} 項 · 盤點：${l.progressEngine?.verifiedFeatureCount??'—'}/${l.progressEngine?.catalogFeatureCount??'—'} 項</small></span><span class="badge ${l.evidence?.state==='FRESH'?'ok':'warn'}">${evidenceText(l.evidence?.state)} · ${fmt(l.engineeringProgress)}</span></div>`).join('')+`<div class="status"><span><b>Prototype 原型基準</b><br><small class="muted">作為客戶畫面與需求對照基準</small></span><span class="badge ok">受控維護</span></div>`;
}
function renderMetrics(lines){
  const c=lines.find(x=>x.key==='codex'),a=lines.find(x=>x.key==='antigravity'),cm=new Map((c?.categories||[]).map(x=>[x.id,x])),am=new Map((a?.categories||[]).map(x=>[x.id,x]));
  const ids=[...(c?.categories||[])].map(x=>x.id);
  document.querySelector('#metricBody').innerHTML=ids.map(id=>`<tr><td><b>${esc(cm.get(id)?.name||am.get(id)?.name||id)}</b></td><td>${fmt(cm.get(id)?.progress)}</td><td>${fmt(am.get(id)?.progress)}</td></tr>`).join('');
}
function cell(f){
  if(!f||typeof f.progress!=='number')return '<span class="badge warn">資料待確認</span>';
  return `<b>${fmt(f.progress)} · ${esc(f.stageLabel)}</b><br><span class="muted">${esc(f.status)}</span>`;
}
function featureRowsHtml(lines,catalog,filter='all'){
  const c=featureMap(lines.find(x=>x.key==='codex')),a=featureMap(lines.find(x=>x.key==='antigravity'));const list=(catalog?.functions||[]).filter(x=>filter==='all'||x.phase===filter);let phase='';
  return list.map(item=>{const cf=c.get(item.id),af=a.get(item.id),divider=item.phase!==phase?(phase=item.phase,`<tr class="phase"><td colspan="4"><b>${esc(item.phase)}</b></td></tr>`):'';const confirmed=cf?.evidenceState==='已確認'&&af?.evidenceState==='已確認';return `${divider}<tr><td><b>${esc(item.name)}</b></td><td>${cell(cf)}</td><td>${cell(af)}</td><td class="muted">${confirmed?'兩條線均有可追溯紀錄':'部分資料待確認'}</td></tr>`}).join('');
}
function renderFeatures(lines,catalog,filter='all'){document.querySelector('#featureBody').innerHTML=featureRowsHtml(lines,catalog,filter)}
function renderRisks(lines){
  const rs=lines.flatMap(l=>(l.risks||[]).map(r=>({...r,line:l.key})));
  document.querySelector('#risks').innerHTML=rs.length?rs.map(r=>`<div class="status"><span><b>${r.line==='codex'?'Codex':'Antigravity'} · ${esc(r.title)}</b></span><span class="badge ${r.severity==='高'?'bad':r.severity==='中'?'warn':'ok'}">${esc(r.severity)}風險</span></div>`).join(''):'<div class="muted">目前沒有已確認的重大風險項目；下一步工作請參考「今日進度摘要」。</div>';
}
function gatesHtml(lines){return lines.map((l,i)=>`<div class="status"><span>${i+1}. ${l.key==='codex'?'Codex':'Antigravity'}</span><b>${esc(l.nextStep||'下一步待確認')}</b></div>`).join('')}
function renderGates(lines){const html=gatesHtml(lines);['#nextGates','#nextGatesRisk'].forEach(s=>{const el=document.querySelector(s);if(el)el.innerHTML=html})}
function renderActivity(snapshot){
  const events=snapshot.lines.flatMap(l=>(l.recent||[]).map(e=>({...e,line:l.key}))).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||''))).slice(0,8);
  document.querySelector('#activity').innerHTML=`<div class="row"><span>本次公開進度資料</span><small class="muted">${new Date(snapshot.generatedAt).toLocaleString('zh-TW')}</small></div>`+events.map(e=>`<div class="row"><span>${e.line==='codex'?'Codex':'Antigravity'} · ${e.kind==='check'?'自動檢查 '+checkText(e.status):'程式更新'}</span><small class="muted">${e.at?new Date(e.at).toLocaleString('zh-TW'):'—'}</small></div>`).join('');
}
function renderPm(lines,days){
  const c=lines.find(x=>x.key==='codex'),a=lines.find(x=>x.key==='antigravity');
  const c90=c?.integrationCompleteCount??0,a90=a?.integrationCompleteCount??0;
  document.querySelector('#pmBrief').innerHTML=`<p><b>目前進度：</b>Codex ${fmt(c?.engineeringProgress)}；Antigravity ${fmt(a?.engineeringProgress)}。兩條線工作重點不同，數字不可相加。</p><p><b>已完成整合驗證：</b>Codex ${c90} 項；Antigravity ${a90} 項。其餘功能會依「規格確認、建置中、主要功能完成、測試完成、整合驗證、客戶驗收」逐級呈現。</p><p><b>資料可信度：</b>33 項功能已逐項對照已合併工作與測試紀錄；找不到證據時不再直接當成 0 分。</p><p><b>時程：</b>距 10/15 尚 ${days} 天。</p>`;
}
function phaseProgress(line,ids){const m=featureMap(line),vals=ids.map(id=>m.get(id)?.progress).filter(v=>typeof v==='number');return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null}
function renderGantt(lines,roadmap){
  const c=lines.find(x=>x.key==='codex'),a=lines.find(x=>x.key==='antigravity');
  document.querySelector('#gantt').innerHTML=(roadmap?.phases||[]).map(p=>{const cp=phaseProgress(c,p.featureIds),ap=phaseProgress(a,p.featureIds);return `<div class="ganttblock"><b>${esc(p.name)}</b><div class="ganttrow"><span>Codex</span><div class="ganttbar"><div class="ganttfill" style="width:${cp??0}%"></div></div><b>${fmt(cp)}</b></div><div class="ganttrow"><span>Antigravity</span><div class="ganttbar"><div class="ganttfill alt" style="width:${ap??0}%"></div></div><b>${fmt(ap)}</b></div></div>`}).join('');
}
function renderForecast(history,lines,days){
  const pts=(history?.meaning==='engineering-progress'?history.points||[]:[]).filter(p=>p.codex!=null||p.antigravity!=null).slice(-30);
  let text='新版工程進度才剛開始累積歷史資料，目前先以各功能實際狀態與時程表為主。';
  if(pts.length>=3){const first=pts[0],last=pts.at(-1),span=Math.max(1,(new Date(last.at)-new Date(first.at))/86400000),dc=(last.codex-first.codex)/span,da=(last.antigravity-first.antigravity)/span;const eta=(s,d)=>d>0?Math.ceil((100-s)/d):null;const ce=eta(last.codex??0,dc),ae=eta(last.antigravity??0,da);text=`依近期工程進度趨勢估算：Codex ${ce!=null?ce+' 天':'資料不足'}；Antigravity ${ae!=null?ae+' 天':'資料不足'}。此為趨勢參考，正式時程仍以客戶驗收與上線條件為準。`;}
  document.querySelector('#forecastText').textContent=text;document.querySelector('#forecastRisk').textContent=days<30?'距截止日期已進入加速期':'持續依功能進度與驗證結果追蹤';
  const w=720,h=220,p=35,max=100,xs=i=>p+(pts.length<=1?0:i*(w-2*p)/(pts.length-1)),ys=v=>h-p-(v/max)*(h-2*p),poly=k=>pts.map((x,i)=>`${xs(i)},${ys(x[k]||0)}`).join(' ');
  document.querySelector('#forecastChart').innerHTML=`<line x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}" stroke="#48647f"/><line x1="${p}" y1="${p}" x2="${p}" y2="${h-p}" stroke="#48647f"/>${pts.length?`<polyline points="${poly('codex')}" fill="none" stroke="#5ba7ff" stroke-width="4"/><polyline points="${poly('antigravity')}" fill="none" stroke="#46d7df" stroke-width="4"/>`:''}<text x="${w-150}" y="25" fill="#8bcaff" font-size="12">Codex</text><text x="${w-80}" y="25" fill="#6de8ed" font-size="12">Antigravity</text>`;
}
function reportStyles(){return `@page{size:A4 portrait;margin:12mm 10mm 14mm}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",Arial,sans-serif;color:#17202a;background:#fff;font-size:10pt;line-height:1.45}.report-cover{min-height:260mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;break-after:page}.report-cover h1{font-size:28pt;margin:0 0 12px}.report-cover h2{font-size:16pt;margin:0 0 28px;font-weight:500}.report-meta{font-size:10pt;color:#4b5563}.report-note{max-width:150mm;margin-top:28px;padding:12px 16px;border:1px solid #cbd5e1;border-radius:8px;text-align:left}.report-section{break-before:page}.report-section h1{font-size:20pt;margin:0 0 12px}.section-source{font-size:9pt;color:#64748b;margin-bottom:12px}.grid{display:grid;gap:8px}.two{grid-template-columns:1fr 1fr}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.card{border:1px solid #cbd5e1;border-radius:8px;padding:10px;background:#fff;margin:0 0 10px}.card h2{font-size:13pt;margin:0 0 8px}.label{font-size:8.5pt;color:#64748b}.value{font-size:17pt;font-weight:700;margin:3px 0}.muted{color:#64748b}.ok{color:#047857}.warn{color:#9a6700}.bad{color:#b42318}.status,.row{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid #e2e8f0}.badge{display:inline-block;padding:2px 6px;border:1px solid #cbd5e1;border-radius:999px;font-size:8pt;font-weight:700;white-space:nowrap}.note{padding:8px 10px;border-left:3px solid #64748b;background:#f8fafc;margin-bottom:10px}.legend{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0}.legend span{font-size:7.5pt;padding:3px 5px;border:1px solid #cbd5e1;border-radius:999px;color:#475569}.table{overflow:visible;border:1px solid #cbd5e1;border-radius:6px}table{border-collapse:collapse;width:100%;min-width:0;table-layout:fixed}thead{display:table-header-group}th,td{padding:5px;border:1px solid #dbe3ec;text-align:left;vertical-align:top;font-size:7.8pt;word-break:break-word}th{background:#eef3f8}.phase td{background:#e7edf4;font-size:8.5pt}tr{break-inside:avoid}.functions .card{break-inside:auto}.functions table th:nth-child(1){width:18%}.functions table th:nth-child(2),.functions table th:nth-child(3){width:32%}.functions table th:nth-child(4){width:18%}.ganttblock{padding:6px 0 9px;border-bottom:1px solid #e2e8f0}.ganttrow{display:grid;grid-template-columns:75px 1fr 50px;gap:7px;align-items:center;padding:4px 0}.ganttbar{height:9px;background:#eef2f7;border-radius:999px;overflow:hidden;border:1px solid #cbd5e1}.ganttfill{height:100%;background:#64748b}.ganttfill.alt{opacity:.65}svg{width:100%;height:145px;background:#fff;border:1px solid #cbd5e1;border-radius:5px}.filterbar,button,.footer{display:none!important}.report-footer{margin-top:12px;padding-top:8px;border-top:1px solid #e2e8f0;color:#64748b;font-size:8pt}@media print{a{color:inherit;text-decoration:none}}`;}
function reportSection(title,body,extra=''){return `<section class="report-section ${extra}"><h1>${esc(title)}</h1><div class="section-source">資料依目前公開 Dashboard 最新快照整理</div>${body}<div class="report-footer">高雄市政府地政局｜檔案應用平台｜Project Dashboard v6</div></section>`}
function exportPdfReport(){
  const d=window.__dashboard;if(!d?.snapshot){alert('進度資料尚未載入完成，請稍後再試。');return}
  const reportWindow=window.open('','_blank');if(!reportWindow){alert('瀏覽器封鎖了報表視窗，請允許彈出式視窗後再試。');return}
  const generated=new Date(d.snapshot.generatedAt),displayTime=generated.toLocaleString('zh-TW'),fileDate=generated.toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'});
  const summary=document.querySelector('.kpis')?.innerHTML||'';
  const overview=document.querySelector('#pm')?.innerHTML||'';
  const benchmark=document.querySelector('#benchmark')?.innerHTML||'';
  const forecast=document.querySelector('#forecast')?.innerHTML||'';
  const featureTable=`<article class="card"><h2>完整功能進度</h2><div class="note">33 項功能均逐項核對；資料不足時顯示「資料待確認」，不直接當成 0%。</div><div class="legend"><span>0% 尚未開始</span><span>20% 需求與規格已確認</span><span>40% 建置中</span><span>60% 主要功能已完成</span><span>75% 自動測試已完成</span><span>90% 整合驗證已完成</span><span>100% 客戶驗收已完成</span></div><div class="table"><table><thead><tr><th>功能</th><th>Codex</th><th>Antigravity</th><th>資料狀態</th></tr></thead><tbody>${featureRowsHtml(d.lines,d.catalog,'all')}</tbody></table></div></article>`;
  const risks=`<div class="grid two"><article class="card"><h2>已確認風險</h2>${document.querySelector('#risks')?.innerHTML||''}</article><article class="card"><h2>下一步工作</h2>${gatesHtml(d.lines)}</article></div>`;
  const html=`<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><title>檔案應用平台_專案進度報表_${fileDate}</title><style>${reportStyles()}</style></head><body><section class="report-cover"><div>高雄市政府地政局｜檔案應用平台</div><h1>專案進度整合報表</h1><h2>Project Dashboard v6</h2><div class="report-meta">報表資料時間：${esc(displayTime)}<br>正式截止日期：2026-10-15</div><div class="report-note">本報表將 Dashboard 各頁籤整合為單一文件，包括專案總覽、雙線進度比較、趨勢與時程、完整功能進度、風險與下一步。進度依已合併成果、測試、實際環境驗證與需求紀錄整理。</div></section>${reportSection('一、專案總覽',`<section class="kpis">${summary}</section>${overview}`)}${reportSection('二、雙線進度比較',benchmark)}${reportSection('三、趨勢與時程',forecast)}${reportSection('四、完整功能進度',featureTable,'functions')}${reportSection('五、風險與下一步',risks)}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));<\/script></body></html>`;
  reportWindow.document.open();reportWindow.document.write(html);reportWindow.document.close();reportWindow.opener=null;
}
async function load(){
  const s=document.querySelector('#snapshotStatus');try{s.textContent='載入中…';const [sr,cr,rr,hr]=await Promise.all([SNAPSHOT,CATALOG,ROADMAP,HISTORY].map(u=>fetch(`${u}?v=${Date.now()}`,{cache:'no-store'})));if(!sr.ok||!cr.ok||!rr.ok)throw new Error('核心資料載入失敗');const snapshot=await sr.json(),catalog=await cr.json(),roadmap=await rr.json(),history=hr.ok?await hr.json():{points:[]},lines=snapshot.lines||[],days=dayCount(roadmap.deadline);if(lines.length!==2)throw new Error('雙線資料不完整');renderKpis(lines,days);renderLines(snapshot);renderMetrics(lines);renderFeatures(lines,catalog);renderRisks(lines);renderGates(lines);renderActivity(snapshot);renderPm(lines,days);renderGantt(lines,roadmap);renderForecast(history,lines,days);s.textContent='資料更新：'+new Date(snapshot.generatedAt).toLocaleString('zh-TW');s.className='ok';window.__dashboard={snapshot,lines,catalog,roadmap,history,days};}catch(e){s.textContent='進度資料載入失敗：'+e.message;s.className='bad'}
}
document.querySelector('#refresh').onclick=load;document.querySelector('#exportPdf').onclick=exportPdfReport;document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-page]').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.querySelector('#'+b.dataset.page).classList.add('active')});document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(window.__dashboard)renderFeatures(window.__dashboard.lines,window.__dashboard.catalog,b.dataset.filter)});load();
