// 上岗资格台页面：登记师傅、查看名单与资格变更历史。
export function staffPage() {
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
    form,.panel { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:16px; }
    label { display:block; margin:10px 0 5px; color:var(--muted); font-size:13px; } input,select { width:100%; border:1px solid var(--line); border-radius:6px; padding:9px; font:inherit; background:#fff; }
    button { border:0; border-radius:6px; background:var(--accent); color:#fff; padding:10px 13px; font-weight:700; cursor:pointer; } button.secondary { background:#69736a; }
    a { color:var(--accent); } .meta { color:var(--muted); font-size:13px; } .warn { color:var(--warn); font-weight:700; } .ok { color:var(--accent); font-weight:700; }
    .checks { display:flex; gap:14px; } .check { display:flex; align-items:center; gap:6px; margin:4px 0; color:var(--ink); } .check input { width:auto; }
    table { width:100%; border-collapse:collapse; font-size:14px; } th,td { text-align:left; padding:8px; border-bottom:1px solid var(--line); vertical-align:top; } th { color:var(--muted); font-weight:600; }
    #msg { margin-top:10px; min-height:18px; } .history-item { border-top:1px solid var(--line); padding:8px 0; }
    @media (max-width:900px){ header{display:block;padding:18px 16px;} main{grid-template-columns:1fr;padding:16px;} }
  </style>
</head>
<body>
  <header>
    <div><h1>上岗资格台</h1><div class="meta">登记班组、在岗时段、可做工序与证书有效期；资格变更会退回相关未交付底片</div></div>
    <div><a href="/">返回整理室</a> <button id="reload">刷新</button></div>
  </header>
  <main>
    <section>
      <form id="staffForm">
        <h2 id="formTitle">登记师傅</h2>
        <input type="hidden" name="id">
        <label>姓名</label><input name="name" required placeholder="师傅姓名">
        <label>班组</label><input name="team" required placeholder="如：早班 / 甲班">
        <label>在岗开始</label><input name="shiftStart" type="time" required>
        <label>在岗结束</label><input name="shiftEnd" type="time" required>
        <label>可做工序</label>
        <div class="checks">${["涂布","曝光","冲洗"].map(p => '<label class="check"><input type="checkbox" name="processes" value="'+p+'">'+p+'</label>').join('')}</div>
        <label>证书有效期至</label><input name="certValidUntil" type="date" required>
        <button>保存登记</button>
        <button type="button" class="secondary" id="cancelEdit" hidden>取消修改</button>
        <div id="msg" class="warn"></div>
      </form>
    </section>
    <section>
      <div class="panel"><h2>师傅名单</h2><div id="staffList"></div></div>
      <div class="panel" style="margin-top:14px"><h2>资格变更历史（旧记录可查）</h2><div id="history"></div></div>
    </section>
  </main>
  <script>
    let staff = [], historyList = [];
    const form = document.querySelector('#staffForm');
    const msg = document.querySelector('#msg');
    const cancelBtn = document.querySelector('#cancelEdit');
    const el = n => form.querySelector('[name="' + n + '"]');
    async function api(path, options) {
      const res = await fetch(path, options && options.body ? { ...options, headers:{ 'Content-Type':'application/json' } } : options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '请求失败');
      return data;
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }
    function showMsg(text, ok) { msg.textContent = text; msg.className = ok ? 'ok' : 'warn'; }
    async function load() {
      staff = await api('/api/staff');
      historyList = await api('/api/staff/history');
      render();
    }
    function fmt(s) { return s ? esc(s.team) + ' ' + s.shiftStart + '-' + s.shiftEnd + ' · 证书至' + s.certValidUntil + ' · 工序：' + (s.processes || []).join('、') : ''; }
    function render() {
      const list = document.querySelector('#staffList');
      if (!staff.length) {
        list.innerHTML = '<div class="meta">暂无登记，先在左侧登记师傅。</div>';
      } else {
        list.innerHTML = '<table><thead><tr><th>姓名</th><th>班组</th><th>在岗时段</th><th>可做工序</th><th>证书有效期至</th><th>当前状态</th><th></th></tr></thead><tbody>' +
          staff.map(s => {
            const bad = (s.flags || []).some(f => f !== '在岗中');
            return '<tr><td>' + esc(s.name) + '</td><td>' + esc(s.team) + '</td><td>' + s.shiftStart + '-' + s.shiftEnd + '</td><td>' + (s.processes || []).join('、') + '</td><td>' + s.certValidUntil + '</td><td class="' + (bad ? 'warn' : '') + '">' + (s.flags || []).join('、') + '</td><td><button type="button" class="secondary" data-edit="' + s.id + '">修改</button></td></tr>';
          }).join('') + '</tbody></table>';
      }
      document.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => startEdit(btn.dataset.edit));
      const h = document.querySelector('#history');
      if (!historyList.length) {
        h.innerHTML = '<div class="meta">暂无变更。</div>';
      } else {
        h.innerHTML = historyList.map(e =>
          '<div class="history-item"><div><b>' + esc(e.name) + '</b> 变更：' + (e.changedFields || []).join('、') + ' <span class="meta">' + esc(e.at) + '</span></div>' +
          '<div class="meta">原：' + fmt(e.before) + '<br>新：' + fmt(e.after) + '</div>' +
          ((e.returned && e.returned.length) ? '<div class="warn">退回待复核：' + e.returned.join('、') + '</div>' : '<div class="meta">无波及底片</div>') +
          '</div>').join('');
      }
    }
    function startEdit(id) {
      const s = staff.find(x => x.id === id);
      if (!s) return;
      el('id').value = s.id;
      el('name').value = s.name;
      el('team').value = s.team;
      el('shiftStart').value = s.shiftStart;
      el('shiftEnd').value = s.shiftEnd;
      el('certValidUntil').value = s.certValidUntil;
      form.querySelectorAll('[name="processes"]').forEach(c => c.checked = (s.processes || []).includes(c.value));
      document.querySelector('#formTitle').textContent = '修改登记（' + s.name + '）';
      cancelBtn.hidden = false;
      showMsg('', true);
    }
    function resetForm() {
      form.reset();
      el('id').value = '';
      document.querySelector('#formTitle').textContent = '登记师傅';
      cancelBtn.hidden = true;
    }
    form.onsubmit = async event => {
      event.preventDefault();
      const data = {
        name: el('name').value.trim(),
        team: el('team').value.trim(),
        shiftStart: el('shiftStart').value,
        shiftEnd: el('shiftEnd').value,
        certValidUntil: el('certValidUntil').value,
        processes: Array.from(form.querySelectorAll('[name="processes"]:checked')).map(c => c.value),
      };
      const id = el('id').value;
      try {
        if (id) {
          const res = await api('/api/staff/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(data) });
          showMsg(res.changedFields && res.changedFields.length
            ? '已保存；变更 ' + res.changedFields.join('、') + '，退回待复核：' + (res.returned.length ? res.returned.join('、') : '无')
            : '已保存，未涉及资格字段', true);
        } else {
          await api('/api/staff', { method: 'POST', body: JSON.stringify(data) });
          showMsg('登记成功', true);
        }
        resetForm();
        await load();
      } catch (e) { showMsg(e.message, false); }
    };
    cancelBtn.onclick = resetForm;
    document.querySelector('#reload').onclick = load;
    load();
  </script>
</body>
</html>`;
}
