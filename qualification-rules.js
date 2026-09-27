// 上岗资格台的校验规则：在岗时段、证书有效期、工序匹配与时段重叠。
// 纯函数，不碰存储，方便单测与复用。

export const QUALIFIED_STEPS = ["涂布", "曝光", "冲洗"];

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseTime(text) {
  const m = typeof text === "string" && TIME_RE.exec(text);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// 把 {start:"HH:MM", end:"HH:MM"} 归一成分钟区间；结束不晚于开始视为跨零点，加一天。
export function normalizePeriod(period) {
  const s = parseTime(period && period.start);
  const e = parseTime(period && period.end);
  if (s === null || e === null || s === e) return null;
  return { s, e: e > s ? e : e + 1440 };
}

export function periodsOverlap(a, b) {
  const pa = normalizePeriod(a);
  const pb = normalizePeriod(b);
  if (!pa || !pb) return false;
  return [0, 1440].some(shift => pa.s < pb.e + shift && pb.s + shift < pa.e);
}

// 返回第一对重叠时段的下标 [i, j]，无重叠返回 null。
export function findPeriodOverlap(periods) {
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      if (periodsOverlap(periods[i], periods[j])) return [i, j];
    }
  }
  return null;
}

// 把页面/接口传来的师傅资料整理成规则需要的形状。
export function normalizeWorkerDraft(input = {}) {
  const periods = (Array.isArray(input.periods) ? input.periods : [])
    .map(p => ({ start: String((p && p.start) ?? "").trim(), end: String((p && p.end) ?? "").trim() }))
    .filter(p => p.start || p.end);
  return {
    name: String(input.name ?? "").trim(),
    team: String(input.team ?? "").trim(),
    periods,
    skills: (Array.isArray(input.skills) ? input.skills : []).map(s => String(s).trim()).filter(Boolean),
    certValidUntil: String(input.certValidUntil ?? "").trim()
  };
}

// 登记/修改师傅资料时的整体校验，不通过则整笔不写入。
export function validateWorkerDraft(draft) {
  const errors = [];
  if (!draft.name) errors.push("请填写师傅姓名");
  if (!draft.team) errors.push("请填写班组");
  if (!draft.periods.length) errors.push("至少登记一个在岗时段");
  draft.periods.forEach((p, i) => {
    if (!normalizePeriod(p)) errors.push(`第${i + 1}个在岗时段格式不正确（需 HH:MM 且起止不同）`);
  });
  const overlap = draft.periods.length > 1 && findPeriodOverlap(draft.periods);
  if (overlap) {
    const [i, j] = overlap;
    errors.push(`同一人的在岗时段重叠：${draft.periods[i].start}-${draft.periods[i].end} 与 ${draft.periods[j].start}-${draft.periods[j].end}`);
  }
  if (!draft.skills.length) errors.push("至少勾选一项可做工序");
  const unknown = draft.skills.filter(s => !QUALIFIED_STEPS.includes(s));
  if (unknown.length) errors.push(`未知工序：${unknown.join("、")}`);
  if (!DATE_RE.test(draft.certValidUntil)) errors.push("请填写证书有效期（YYYY-MM-DD）");
  return { ok: errors.length === 0, errors };
}

export function isOnDutyAt(worker, at = new Date()) {
  const minutes = at.getHours() * 60 + at.getMinutes();
  return (worker.periods || []).some(p => {
    const n = normalizePeriod(p);
    if (!n) return false;
    return (minutes >= n.s && minutes < n.e) || (minutes + 1440 >= n.s && minutes + 1440 < n.e);
  });
}

export function isCertValidAt(worker, at = new Date()) {
  const today = [at.getFullYear(), String(at.getMonth() + 1).padStart(2, "0"), String(at.getDate()).padStart(2, "0")].join("-");
  return DATE_RE.test(worker.certValidUntil || "") && worker.certValidUntil >= today;
}

// 提交涂布/曝光/冲洗时的上岗校验；返回不通过的原因列表，全部通过 reasons 为空。
export function checkWorkerForStep(worker, step, at = new Date()) {
  if (!worker) return { ok: false, reasons: ["所选操作人不在资格台名册内"] };
  const reasons = [];
  if (!isOnDutyAt(worker, at)) reasons.push(`${worker.name}当前不在在岗时段内`);
  if (!isCertValidAt(worker, at)) reasons.push(`${worker.name}的证书有效期至 ${worker.certValidUntil}，已过期`);
  if (!(worker.skills || []).includes(step)) reasons.push(`${worker.name}的可做工序不含「${step}」`);
  return { ok: reasons.length === 0, reasons };
}

// 师傅资料变更后，找出沾过手且尚未交付的底片（应退回待复核的那些）。
export function relatedUndelivered(items, workerId) {
  return items.filter(item => item.status !== "已交付" && (item.steps || []).some(s => s.workerId === workerId));
}
