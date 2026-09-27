// 上岗资格规则：登记校验、提交涂布/曝光/冲洗前的资格检查、资格变更后的退回判定。
// 只做判断不碰存储，"什么时候停下、为什么停下"都写在这里。

export const GATED_STEPS = ["涂布", "曝光", "冲洗"];
export const REVIEW_STATUS = "待复核";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// 这三类字段改动会触发未交付底片退回待复核（可做工序改动不触发）
const FIELD_LABELS = { team: "班组", shiftStart: "在岗时段", shiftEnd: "在岗时段", certValidUntil: "证书有效期" };

export function localTimeHM(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return hh + ":" + mm;
}

export function localDate(date = new Date()) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + mm + "-" + dd;
}

// 跨午夜的时段（如 22:00-06:00）拆成两段，方便比较
function shiftSegments(start, end) {
  if (start < end) return [[start, end]];
  if (start > end) return [[start, "24:00"], ["00:00", end]];
  return [];
}

export function shiftsOverlap(a, b) {
  return shiftSegments(a.shiftStart, a.shiftEnd).some(sa =>
    shiftSegments(b.shiftStart, b.shiftEnd).some(sb => sa[0] < sb[1] && sb[0] < sa[1]));
}

export function isOnDuty(record, hm = localTimeHM()) {
  return shiftSegments(record.shiftStart, record.shiftEnd).some(([s, e]) => hm >= s && hm < e);
}

export function isCertExpired(record, today = localDate()) {
  return record.certValidUntil < today;
}

function describe(record) {
  return record.shiftStart + "-" + record.shiftEnd + "（" + record.team + "）";
}

export function normalizeProcesses(input) {
  const list = Array.isArray(input) ? input : String(input || "").split(/[,，、\s]+/);
  return [...new Set(list.filter(p => GATED_STEPS.includes(p)))];
}

// 登记和修改共用的校验；excludeId 用于修改时排除自己
export function validateRegistration(input, existing, excludeId = null) {
  const errors = [];
  const record = {
    name: String(input.name || "").trim(),
    team: String(input.team || "").trim(),
    shiftStart: String(input.shiftStart || "").trim(),
    shiftEnd: String(input.shiftEnd || "").trim(),
    processes: normalizeProcesses(input.processes),
    certValidUntil: String(input.certValidUntil || "").trim(),
  };
  if (!record.name) errors.push("请填写师傅姓名");
  if (!record.team) errors.push("请填写班组");
  const timesOk = TIME_RE.test(record.shiftStart) && TIME_RE.test(record.shiftEnd);
  if (!timesOk) errors.push("在岗时段应为 HH:MM（如 08:00 到 16:00）");
  else if (record.shiftStart === record.shiftEnd) errors.push("在岗开始与结束时间不能相同");
  if (!record.processes.length) errors.push("可做工序至少选择一项（涂布、曝光、冲洗）");
  if (!DATE_RE.test(record.certValidUntil)) errors.push("证书有效期应为 YYYY-MM-DD");
  if (record.name && timesOk && record.shiftStart !== record.shiftEnd) {
    const clash = existing.find(r => r.id !== excludeId && r.name === record.name && shiftsOverlap(r, record));
    if (clash) errors.push("同一人时段重叠：" + record.name + " 已登记 " + describe(clash) + "，与本次 " + describe(record) + " 重叠");
  }
  return { errors, record };
}

// 提交涂布/曝光/冲洗前的资格检查，返回全部不满足的原因
export function checkOperator(staff, { id, step, now = new Date() }) {
  const record = staff.find(r => r.id === id);
  if (!record) return { ok: false, reasons: ["未找到该师傅的登记，请先在资格台登记"], record: null };
  const hm = localTimeHM(now);
  const today = localDate(now);
  const reasons = [];
  const clash = staff.find(r => r.id !== record.id && r.name === record.name && shiftsOverlap(r, record));
  if (clash) reasons.push("同一人时段重叠：" + record.name + " 的 " + describe(record) + " 与 " + describe(clash) + " 重叠，说不清当时谁在岗");
  if (!isOnDuty(record, hm)) reasons.push("不在岗：现在 " + hm + "，" + record.name + " 在岗时段为 " + describe(record));
  if (isCertExpired(record, today)) reasons.push("证书过期：" + record.name + " 证书有效期至 " + record.certValidUntil);
  if (!record.processes.includes(step)) reasons.push("工序不符：" + record.name + " 可做工序为 " + record.processes.join("、") + "，不能提交" + step);
  return { ok: reasons.length === 0, reasons, record };
}

// 名单上展示的当前状态
export function staffFlags(record, staff, now = new Date()) {
  const flags = [];
  if (staff.some(r => r.id !== record.id && r.name === record.name && shiftsOverlap(r, record))) flags.push("时段重叠");
  flags.push(isOnDuty(record, localTimeHM(now)) ? "在岗中" : "不在岗");
  if (isCertExpired(record, localDate(now))) flags.push("证书过期");
  return flags;
}

// 班组、在岗时段或证书有效期是否被改动
export function changedQualificationFields(before, after) {
  const changed = [];
  for (const key of Object.keys(FIELD_LABELS)) {
    if (before[key] !== after[key] && !changed.includes(FIELD_LABELS[key])) changed.push(FIELD_LABELS[key]);
  }
  return changed;
}

// 资格变更波及到的未交付底片：此人经手过工序且尚未交付
export function relatedUndelivered(items, record) {
  return items.filter(item =>
    item.status !== "已交付" &&
    (item.steps || []).some(s => s.operatorId === record.id || (s.operator && s.operator === record.name)));
}
