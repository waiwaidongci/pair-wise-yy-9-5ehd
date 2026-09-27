// 上岗资格台页面：师傅登记/修改、在岗时段与证书维护、待复核底片一览。
export function qualificationPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>上岗资格台 · 古法蓝晒底片整理室</title>
  <style>
    :root { --bg:#f1f3ef; --panel:#fff; --ink:#20241f; --muted:#687066; --line:#d4ddd0; --accent:#526f43; --warn:#9b4937; }
    * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--ink); font-family:Arial,"PingFang SC",sans-serif; }
    header { padding:22px 28px; background:#fff; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:16px; align-items:center; }
    h1 { margin:0; font-size:26px; } h2 { margin:0 0 12px; font-size:18px; } main { display:grid; grid-template-columns:380px 1fr; gap:22px; padding:22px 28px; }
    form,.panel,.card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:16px; }
    label { display:block; margin:10px 0 5px; color:var(--muted); font-size:13px; } input,select { width:100%; border:1px solid var(--line); border-radius:6px; padding:9px; font:inherit; background:#fff; }
    button { border:0; border-radius:6px; background:var(--accent); color:#fff; padding:10px 13px; font-weight:700; cursor:pointer; } button.secondary { background:#69736a; }
    .checks { display:flex; gap:14px; } .checks label { display:flex; align-items:center; gap:6px; margin:0; color:var(--ink); font-size:14px; } .checks input { width:auto; }
    .prow { display:flex; gap:8px; align-items:center; margin-bottom:6px; } .prow input { flex:1; width:auto; } .prow button { padding:8px 10px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; } .card { display:grid; gap:8px; align-content:start; }
    .meta { color:var(--muted); font-size:13px; } .pill { display:inline-block; border:1px solid var(--line); border-radius:999px; padding:3px 8px; font-size:12px; }
    .warn { color:var(--warn); font-weight:700; } .ok { color:var(--accent); font-weight:700; } #formMsg { margin-top:10px; }
    header a { color:var(--accent); font-weight:700; text-decoration:none; margin-right:12px; }
    @media (max-width:900px){ header{display:block;padding:18px 16px;} main{grid-template-columns:1fr;padding:16px;} }
  </style>
</head>
<body>
  <header><div><h1>上岗资格台</h1><div class="meta">登记师傅的班组、在岗时段、可做工序与证书有效期；资料变更会把相关未交付底片退回待复核</div></div><div><a href="/">返回整理室</a><button id="reload">刷新</button></div></header>
  <main>
    <section>
      <form id="workerForm">
        <h2 id="formTitle">登记师傅</h2>
        <label>姓名</label><input name="name" required>
        <label>班组</label><input name="team" placeholder="如：甲班" required>
        <label>在岗时段（同一人的时段不能重叠，支持跨零点）</label>
        <div id="periods"></div>
        <button type="button" class="secondary" id="addPeriod">添加时段</button>
        <label>可做工序</label>
        <div class="checks" id="skills"></div>
        <label>证书有效期至</label><input name="certValidUntil" type="date" required>
        <div style="margin-top:12px"><button>保存</button> <button type="button" class="secondary" id="cancelEdit" hidden>取消编辑</button></div>
        <div id="formMsg"></div>
      </form>
      <div class="panel" style="margin-top:14px"><h2>待复核底片</h2><div id="reviewList" class="meta">加载中…</div></div>
    </section>
    <section>
      <div class="panel"><h2>在册师傅</h2><div class="grid" id="workers"></div></div>
    </section>
  </main>
  <script>
    const STEPS = ["涂布","曝光","冲洗"];
    const form = document.querySelector('#workerForm');
    const el = form.elements;
    const formTitle = document.querySelector('#formTitle');
    const formMsg = document.querySelector('#formMsg');
    const periodsEl = document.querySelector('#periods');
    const cancelEdit = document.querySelector('#cancelEdit');
    let workers = [];
    let editingId = null;
    async function api(path, options) {
      const res = await fetch(path, options && options.body ? { ...options, headers:{ 'Content-Type':'application/json' } } : options);
      const data = await res.json();
      if (!res.ok) { const err = new Error(data.error || '请求失败'); err.data = data; throw err; }
      return data;
    }
    function addPeriodRow(start, end) {
      const row = document.createElement('div');
      row.className = 'prow';
      row.innerHTML = '<input class="ps" type="time" value="'+(start || '')+'" required><span>至</span><input class="pe" type="time" value="'+(end || '')+'" required><button type="button" class="secondary">删除</button>';
      row.querySelector('button').onclick = () => row.remove();
      periodsEl.appendChild(row);
    }
    function renderSkillBoxes() {
      document.querySelector('#skills').innerHTML = STEPS.map(s => '<label><input type="checkbox" value="'+s+'"> '+s+'</label>').join('');
    }
    function resetForm() {
      form.reset(); editingId = null; formTitle.textContent = '登记师傅'; cancelEdit.hidden = true;
      periodsEl.innerHTML = ''; addPeriodRow();
    }
    function today() { const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
    function renderWorkers() {
      const t = today();
      document.querySelector('#workers').innerHTML = workers.map(w => {
        const expired = w.certValidUntil < t;
        return '<article class="card"><h3>'+w.name+'</h3><span class="pill">'+w.team+'</span>'
          + '<div><b>在岗时段</b> '+((w.periods || []).map(p => p.start+'-'+p.end).join('，') || '—')+'</div>'
          + '<div><b>可做工序</b> '+((w.skills || []).join('、') || '—')+'</div>'
          + '<div><b>证书有效期至</b> <span class="'+(expired ? 'warn' : '')+'">'+w.certValidUntil+(expired ? '（已过期）' : '')+'</span></div>'
          + '<button class="secondary" data-edit="'+w.id+'">编辑</button></article>';
      }).join('') || '<div class="meta">暂无登记</div>';
      document.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => {
        const w = workers.find(x => x.id === btn.dataset.edit);
        if (!w) return;
        editingId = w.id;
        el.name.value = w.name; el.team.value = w.team; el.certValidUntil.value = w.certValidUntil;
        periodsEl.innerHTML = '';
        (w.periods || []).forEach(p => addPeriodRow(p.start, p.end));
        if (!w.periods || !w.periods.length) addPeriodRow();
        document.querySelectorAll('#skills input').forEach(cb => cb.checked = (w.skills || []).includes(cb.value));
        formTitle.textContent = '修改 ' + w.name + ' 的资料'; cancelEdit.hidden = false; formMsg.textContent = '';
        window.scrollTo(0, 0);
      });
    }
    async function renderReview() {
      const items = await api('/api/items');
      const list = items.filter(i => i.status === '待复核');
      document.querySelector('#reviewList').innerHTML = list.length
        ? list.map(i => '<div>'+(i.code || i.id)+' · '+(i.plateSize || '')+'</div>').join('')
        : '暂无待复核底片';
    }
    async function load() { workers = await api('/api/workers'); renderWorkers(); await renderReview(); }
    document.querySelector('#addPeriod').onclick = () => addPeriodRow();
    cancelEdit.onclick = resetForm;
    form.onsubmit = async event => {
      event.preventDefault();
      formMsg.className = ''; formMsg.innerHTML = '';
      const payload = {
        name: el.name.value,
        team: el.team.value,
        periods: [...periodsEl.querySelectorAll('.prow')].map(row => ({ start: row.querySelector('.ps').value, end: row.querySelector('.pe').value })),
        skills: [...document.querySelectorAll('#skills input:checked')].map(cb => cb.value),
        certValidUntil: el.certValidUntil.value
      };
      try {
        const data = editingId
          ? await api('/api/workers/' + editingId, { method:'PATCH', body: JSON.stringify(payload) })
          : await api('/api/workers', { method:'POST', body: JSON.stringify(payload) });
        let msg = editingId ? '已保存修改。' : '已登记。';
        if (data.bounced && data.bounced.length) msg += ' 已退回待复核：' + data.bounced.join('、');
        formMsg.className = 'ok'; formMsg.textContent = msg;
        resetForm(); await load();
      } catch (err) {
        const reasons = err.data && err.data.reasons ? err.data.reasons : [err.message];
        formMsg.className = 'warn'; formMsg.innerHTML = reasons.map(r => '<div>'+r+'</div>').join('');
      }
    };
    document.querySelector('#reload').onclick = load;
    renderSkillBoxes(); addPeriodRow(); load();
  </script>
</body>
</html>`;
}
