const SNAPSHOT='./dashboard-snapshot.json';
const WEIGHTS={featureCoverage:25,backendImplementation:20,dataAccess:15,automatedTests:15,ciCd:10,governanceEvidence:15};
const LABELS={featureCoverage:'功能覆蓋',backendImplementation:'後端實作',dataAccess:'資料存取',automatedTests:'自動化測試',ciCd:'CI／CD',governanceEvidence:'治理與證據'};

function dayCount(){const end=new Date('2026-10-15T23:59:59+08:00');document.querySelector('#days').textContent=Math.max(0,Math.ceil((end-new Date())/86400000))+' 天'}
function fmt(v){return typeof v==='number'?Math.round(v)+'%':'—'}
function evidenceClass(state){return state==='FRESH'?'ok':state==='NEEDS CALIBRATION'?'warn':'bad'}
function weightedScore(line){if(!line?.evidence?.calibrated)return null;return Math.round(Object.entries(WEIGHTS).reduce((s,[k,w])=>s+(line.metrics?.[k]||0)*w/100,0))}
function featureMap(line){const m=new Map();(line?.features||[]).forEach(f=>m.set(f.id||f.name,f));return m}

function renderKpis(lines){
  const c=lines.find(x=>x.key==='codex'),a=lines.find(x=>x.key==='antigravity');
  const cs=weightedScore(c),as=weightedScore(a);
  document.querySelector('#codexScore').textContent=cs??'—';
  document.querySelector('#antScore').textContent=as??'—';
  document.querySelector('#codexEvidence').textContent=c?.evidence?.state||'—';
  document.querySelector('#antEvidence').textContent=a?.evidence?.state||'—';
  const fc=[c,a].filter(x=>x?.evidence?.calibrated).map(x=>x.metrics.featureCoverage);
  document.querySelector('#common').textContent=fc.length===2?Math.round((fc[0]+fc[1])/2)+'%':'—';
  document.querySelector('#riskCount').textContent=lines.flatMap(l=>l.risks||[]).filter(r=>String(r.severity).toLowerCase()==='high').length;
}

function renderLines(lines){
  document.querySelector('#lineStatus').innerHTML=lines.map(l=>{
    const score=weightedScore(l),state=l.evidence?.state||'UNKNOWN';
    return `<div class="status"><span><b>${l.label}</b><br><small class="muted">HEAD ${String(l.head||'').slice(0,7)} · Open PR ${l.openPrCount??'—'} · CI ${l.ci||'—'} · Evidence ${l.evidence?.freshnessReason||'—'}</small></span><span class="badge ${evidenceClass(state)}">${state}${score===null?'':' · '+score}</span></div>`
  }).join('')
}

function renderMetrics(lines){
  const c=lines.find(x=>x.key==='codex'),a=lines.find(x=>x.key==='antigravity');
  document.querySelector('#metricBody').innerHTML=Object.entries(WEIGHTS).map(([k,w])=>`<tr><td>${LABELS[k]}</td><td>${w}%</td><td>${c?.evidence?.calibrated?fmt(c.metrics?.[k]):'—'}</td><td>${a?.evidence?.calibrated?fmt(a.metrics?.[k]):'—'}</td></tr>`).join('')
}

function renderFeatures(lines){
  const c=featureMap(lines.find(x=>x.key==='codex')),a=featureMap(lines.find(x=>x.key==='antigravity'));
  const ids=[...new Set([...c.keys(),...a.keys()])];
  document.querySelector('#featureBody').innerHTML=ids.length?ids.map(id=>{
    const cf=c.get(id),af=a.get(id),name=cf?.name||af?.name||id;
    return `<tr><td><b>${name}</b></td><td>${fmt(cf?.progress)}<br><span class="muted">${cf?.status||'—'}</span></td><td>${fmt(af?.progress)}<br><span class="muted">${af?.status||'—'}</span></td><td>${(cf?.evidenceCount||0)+(af?.evidenceCount||0)} evidence refs</td></tr>`
  }).join(''):'<tr><td colspan="4" class="muted">尚無可公開的功能校準資料。</td></tr>'
}

function renderRisks(lines){
  const risks=lines.flatMap(l=>(l.risks||[]).map(r=>({...r,line:l.key})));
  document.querySelector('#risks').innerHTML=risks.length?risks.map(r=>`<div class="status"><span><b>${r.line==='codex'?'Codex':'Antigravity'} · ${r.title||r.id}</b></span><span class="badge ${String(r.severity).toLowerCase()==='high'?'bad':'warn'}">${r.severity||'risk'}</span></div>`).join(''):'<div class="muted">目前沒有公開風險摘要。</div>'
}

function renderGates(lines){document.querySelector('#nextGates').innerHTML=lines.map(l=>`<div class="status"><span>${l.key==='codex'?'Codex':'Antigravity'}</span><b>${l.nextGate||'尚未提供下一個 Gate'}</b></div>`).join('')}
function renderSnapshotMeta(snapshot,lines){const newest=lines.map(l=>l.ciUpdatedAt).filter(Boolean).sort().pop();document.querySelector('#activity').innerHTML=`<div class="row"><span>公開 Snapshot 產生時間</span><small class="muted">${new Date(snapshot.generatedAt).toLocaleString('zh-TW')}</small></div><div class="row"><span>最近 CI 更新</span><small class="muted">${newest?new Date(newest).toLocaleString('zh-TW'):'—'}</small></div><div class="row"><span>資料來源</span><small class="muted">GitHub Actions sanitized snapshot</small></div>`}

async function load(){
  const status=document.querySelector('#snapshotStatus');
  try{
    status.textContent='載入中…';
    const response=await fetch(`${SNAPSHOT}?v=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`${response.status} ${response.statusText}`);
    const snapshot=await response.json();
    const lines=Array.isArray(snapshot.lines)?snapshot.lines:[];
    if(lines.length!==2)throw new Error('snapshot lines incomplete');
    renderKpis(lines);renderLines(lines);renderMetrics(lines);renderFeatures(lines);renderRisks(lines);renderGates(lines);renderSnapshotMeta(snapshot,lines);
    status.textContent='已載入 '+new Date(snapshot.generatedAt).toLocaleString('zh-TW');
    status.className='ok';
  }catch(e){
    status.textContent='Snapshot 載入失敗：'+e.message;
    status.className='bad';
  }
}

document.querySelector('#refresh').onclick=load;
dayCount();load();
